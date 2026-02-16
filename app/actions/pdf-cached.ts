/**
 * Cached PDF Generation Server Actions
 *
 * Hybrid caching approach:
 * 1. Check if PDF exists in cache → Return signed URL (80-95% faster)
 * 2. If not cached → Client generates PDF → Uploads to cache for future use
 * 3. Cache invalidated on visit/assessment updates or addendum creation
 *
 * Expected performance improvement:
 * - First load: Normal speed (data fetch + PDF generation)
 * - Cached load: 80-95% faster (direct storage URL, no generation)
 */

"use server";

import { getCachedPDF, cachePDF, invalidatePDFCache } from "@/lib/pdf-cache";
import { createClient } from "@/lib/supabase/server";

/**
 * Check if cached PDF exists and return signed URL
 * Call this before generating PDF client-side
 */
export async function checkCachedVisitPDF(visitId: string): Promise<{
  success: boolean;
  url?: string;
  isCached: boolean;
  error?: string;
}> {
  try {
    const result = await getCachedPDF({
      visitId,
      pdfType: "visit-summary",
      forceRegenerate: false,
    });

    return result;
  } catch (error) {
    console.error("Failed to check PDF cache:", error);
    return {
      success: false,
      isCached: false,
      error: error instanceof Error ? error.message : "Cache check failed",
    };
  }
}

/**
 * Cache a generated PDF blob
 * Call this after generating PDF client-side (only for signed/submitted visits)
 */
export async function cacheVisitPDF(
  visitId: string,
  pdfBlob: Blob
): Promise<{
  success: boolean;
  error?: string;
}> {
  try {
    // Check if visit is signed or submitted (only cache finalized visits)
    const supabase = await createClient();
    const { data: visit } = await supabase
      .from("visits")
      .select("status")
      .eq("id", visitId)
      .single();

    if (visit?.status !== "signed" && visit?.status !== "submitted") {
      return {
        success: false,
        error: "Only signed/submitted visits can be cached",
      };
    }

    // Convert blob to buffer
    const arrayBuffer = await pdfBlob.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Cache the PDF
    const result = await cachePDF(
      {
        visitId,
        pdfType: "visit-summary",
      },
      buffer
    );

    return result;
  } catch (error) {
    console.error("Failed to cache PDF:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to cache PDF",
    };
  }
}

/**
 * Check if cached wound progress PDF exists
 */
export async function checkCachedWoundPDF(visitId: string): Promise<{
  success: boolean;
  url?: string;
  isCached: boolean;
  error?: string;
}> {
  try {
    const result = await getCachedPDF({
      visitId,
      pdfType: "wound-progress",
      forceRegenerate: false,
    });

    return result;
  } catch (error) {
    console.error("Failed to check wound PDF cache:", error);
    return {
      success: false,
      isCached: false,
      error: error instanceof Error ? error.message : "Cache check failed",
    };
  }
}

/**
 * Cache a generated wound progress PDF
 */
export async function cacheWoundPDF(
  visitId: string,
  pdfBlob: Blob
): Promise<{
  success: boolean;
  error?: string;
}> {
  try {
    const arrayBuffer = await pdfBlob.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const result = await cachePDF(
      {
        visitId,
        pdfType: "wound-progress",
      },
      buffer
    );

    return result;
  } catch (error) {
    console.error("Failed to cache wound PDF:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to cache PDF",
    };
  }
}

/**
 * Check if cached patient summary PDF exists
 */
export async function checkCachedPatientPDF(visitId: string): Promise<{
  success: boolean;
  url?: string;
  isCached: boolean;
  error?: string;
}> {
  try {
    const result = await getCachedPDF({
      visitId,
      pdfType: "patient-summary",
      forceRegenerate: false,
    });

    return result;
  } catch (error) {
    console.error("Failed to check patient PDF cache:", error);
    return {
      success: false,
      isCached: false,
      error: error instanceof Error ? error.message : "Cache check failed",
    };
  }
}

/**
 * Cache a generated patient summary PDF
 */
export async function cachePatientPDF(
  visitId: string,
  pdfBlob: Blob
): Promise<{
  success: boolean;
  error?: string;
}> {
  try {
    const arrayBuffer = await pdfBlob.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const result = await cachePDF(
      {
        visitId,
        pdfType: "patient-summary",
      },
      buffer
    );

    return result;
  } catch (error) {
    console.error("Failed to cache patient PDF:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to cache PDF",
    };
  }
}

/**
 * Invalidate PDF cache when visit is updated
 * Call this from visit/assessment/addendum mutation actions
 */
export async function invalidateVisitPDFCache(visitId: string): Promise<{
  success: boolean;
  error?: string;
}> {
  try {
    const result = await invalidatePDFCache({ visitId });
    return result;
  } catch (error) {
    console.error("Failed to invalidate PDF cache:", error);
    return {
      success: false,
      error:
        error instanceof Error ? error.message : "Failed to invalidate cache",
    };
  }
}
