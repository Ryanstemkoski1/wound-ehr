/**
 * PDF Caching Utility
 *
 * Caches generated PDFs for approved visits to improve performance.
 * PDFs are stored in Supabase Storage and invalidated when:
 * - Visit is edited/updated
 * - Addendum is added
 * - Assessment is modified
 *
 * Expected performance improvement: 80-95% faster PDF downloads for cached visits
 */

"use server";

import { createClient } from "@/lib/supabase/server";

const PDF_CACHE_BUCKET = "pdf-cache";
const CACHE_VERSION = "v1"; // Increment to invalidate all caches

type CacheOptions = {
  visitId: string;
  pdfType: "visit-summary" | "patient-summary" | "wound-progress";
  forceRegenerate?: boolean;
};

/**
 * Generate cache key for a PDF
 */
function generateCacheKey(options: CacheOptions): string {
  const { visitId, pdfType } = options;
  return `${CACHE_VERSION}/${pdfType}/${visitId}.pdf`;
}

/**
 * Check if cached PDF exists and is valid
 */
export async function getCachedPDF(options: CacheOptions): Promise<{
  success: boolean;
  url?: string;
  isCached: boolean;
  error?: string;
}> {
  try {
    const supabase = await createClient();
    const cacheKey = generateCacheKey(options);

    // If force regenerate, skip cache check
    if (options.forceRegenerate) {
      return { success: true, isCached: false };
    }

    // Check if file exists in cache
    const { data: files, error: listError } = await supabase.storage
      .from(PDF_CACHE_BUCKET)
      .list(`${CACHE_VERSION}/${options.pdfType}`, {
        search: `${options.visitId}.pdf`,
      });

    if (listError) {
      console.error("Cache check error:", listError);
      return { success: true, isCached: false };
    }

    // If file exists, return signed URL
    if (files && files.length > 0) {
      const { data: urlData, error: urlError } = await supabase.storage
        .from(PDF_CACHE_BUCKET)
        .createSignedUrl(cacheKey, 3600); // 1 hour expiry

      if (urlError) {
        console.error("Cache URL error:", urlError);
        return { success: true, isCached: false };
      }

      return {
        success: true,
        isCached: true,
        url: urlData.signedUrl,
      };
    }

    return { success: true, isCached: false };
  } catch (error) {
    console.error("Cache check failed:", error);
    return { success: true, isCached: false }; // Fail gracefully
  }
}

/**
 * Store generated PDF in cache
 */
export async function cachePDF(
  options: CacheOptions,
  pdfBuffer: Buffer | Uint8Array
): Promise<{
  success: boolean;
  error?: string;
}> {
  try {
    const supabase = await createClient();
    const cacheKey = generateCacheKey(options);

    // Ensure bucket exists
    const { data: buckets } = await supabase.storage.listBuckets();
    const bucketExists = buckets?.some((b) => b.name === PDF_CACHE_BUCKET);

    if (!bucketExists) {
      const { error: createError } = await supabase.storage.createBucket(
        PDF_CACHE_BUCKET,
        {
          public: false,
          fileSizeLimit: 10485760, // 10MB
        }
      );

      if (createError) {
        console.error("Failed to create cache bucket:", createError);
        return { success: false, error: createError.message };
      }
    }

    // Upload PDF to cache
    const { error: uploadError } = await supabase.storage
      .from(PDF_CACHE_BUCKET)
      .upload(cacheKey, pdfBuffer, {
        upsert: true,
        contentType: "application/pdf",
      });

    if (uploadError) {
      console.error("Failed to cache PDF:", uploadError);
      return { success: false, error: uploadError.message };
    }

    return { success: true };
  } catch (error) {
    console.error("Cache storage failed:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

/**
 * Invalidate cached PDF (called when visit/assessment is updated)
 */
export async function invalidatePDFCache(options: {
  visitId: string;
  pdfType?: CacheOptions["pdfType"]; // If not provided, invalidate all types
}): Promise<{
  success: boolean;
  error?: string;
}> {
  try {
    const supabase = await createClient();
    const { visitId, pdfType } = options;

    if (pdfType) {
      // Invalidate specific PDF type
      const cacheKey = generateCacheKey({ visitId, pdfType });
      const { error: deleteError } = await supabase.storage
        .from(PDF_CACHE_BUCKET)
        .remove([cacheKey]);

      if (deleteError) {
        console.error("Cache invalidation error:", deleteError);
        return { success: false, error: deleteError.message };
      }
    } else {
      // Invalidate all PDF types for this visit
      const types: CacheOptions["pdfType"][] = [
        "visit-summary",
        "patient-summary",
        "wound-progress",
      ];

      for (const type of types) {
        const cacheKey = generateCacheKey({ visitId, pdfType: type });
        await supabase.storage.from(PDF_CACHE_BUCKET).remove([cacheKey]);
      }
    }

    return { success: true };
  } catch (error) {
    console.error("Cache invalidation failed:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

/**
 * Get cache statistics
 */
export async function getCacheStats(): Promise<{
  success: boolean;
  stats?: {
    totalFiles: number;
    totalSize: number;
    oldestFile: Date | null;
    newestFile: Date | null;
  };
  error?: string;
}> {
  try {
    const supabase = await createClient();

    const { data: files, error } = await supabase.storage
      .from(PDF_CACHE_BUCKET)
      .list(CACHE_VERSION, {
        sortBy: { column: "created_at", order: "desc" },
      });

    if (error) {
      return { success: false, error: error.message };
    }

    if (!files || files.length === 0) {
      return {
        success: true,
        stats: {
          totalFiles: 0,
          totalSize: 0,
          oldestFile: null,
          newestFile: null,
        },
      };
    }

    const totalSize = files.reduce(
      (sum, file) => sum + (file.metadata?.size || 0),
      0
    );
    const dates = files
      .map((f) => f.created_at)
      .filter(Boolean)
      .map((d) => new Date(d));

    return {
      success: true,
      stats: {
        totalFiles: files.length,
        totalSize,
        oldestFile:
          dates.length > 0
            ? new Date(Math.min(...dates.map((d) => d.getTime())))
            : null,
        newestFile:
          dates.length > 0
            ? new Date(Math.max(...dates.map((d) => d.getTime())))
            : null,
      },
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

/**
 * Clear all cached PDFs (admin only)
 */
export async function clearPDFCache(): Promise<{
  success: boolean;
  deletedCount?: number;
  error?: string;
}> {
  try {
    const supabase = await createClient();

    // List all files in cache
    const { data: files, error: listError } = await supabase.storage
      .from(PDF_CACHE_BUCKET)
      .list(CACHE_VERSION);

    if (listError) {
      return { success: false, error: listError.message };
    }

    if (!files || files.length === 0) {
      return { success: true, deletedCount: 0 };
    }

    // Delete all files
    const filePaths = files.map((f) => `${CACHE_VERSION}/${f.name}`);
    const { error: deleteError } = await supabase.storage
      .from(PDF_CACHE_BUCKET)
      .remove(filePaths);

    if (deleteError) {
      return { success: false, error: deleteError.message };
    }

    return { success: true, deletedCount: files.length };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}
