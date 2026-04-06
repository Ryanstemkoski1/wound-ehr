"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

// =====================================================
// TYPES
// =====================================================

export type PDFPreferences = {
  pdf_include_photos: boolean;
  pdf_photo_size: "small" | "medium" | "large";
  pdf_max_photos_per_assessment: number;
  pdf_page_size: "letter" | "a4";
};

export type UserPreferences = PDFPreferences & {
  id: string;
  user_id: string;
  preferences: Record<string, unknown>;
  created_at: string;
  updated_at: string;
};

const DEFAULT_PDF_PREFERENCES: PDFPreferences = {
  pdf_include_photos: true,
  pdf_photo_size: "medium",
  pdf_max_photos_per_assessment: 2,
  pdf_page_size: "letter",
};

// =====================================================
// GET PREFERENCES
// =====================================================

/**
 * Get current user's preferences. Returns defaults if no row exists.
 */
export async function getUserPreferences(): Promise<{
  preferences?: PDFPreferences;
  error?: string;
}> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return { error: "Unauthorized" };
    }

    const { data, error } = await supabase
      .from("user_preferences")
      .select(
        "pdf_include_photos, pdf_photo_size, pdf_max_photos_per_assessment, pdf_page_size"
      )
      .eq("user_id", user.id)
      .maybeSingle();

    if (error) {
      console.error("Get user preferences error:", error);
      return { error: "Failed to load preferences" };
    }

    // Return saved preferences or defaults
    return {
      preferences: data
        ? {
            pdf_include_photos: data.pdf_include_photos,
            pdf_photo_size:
              data.pdf_photo_size as PDFPreferences["pdf_photo_size"],
            pdf_max_photos_per_assessment: data.pdf_max_photos_per_assessment,
            pdf_page_size:
              data.pdf_page_size as PDFPreferences["pdf_page_size"],
          }
        : DEFAULT_PDF_PREFERENCES,
    };
  } catch (err) {
    console.error("Get user preferences error:", err);
    return { error: "Failed to load preferences" };
  }
}

// =====================================================
// SAVE PREFERENCES
// =====================================================

/**
 * Upsert current user's PDF preferences.
 */
export async function savePDFPreferences(
  prefs: PDFPreferences
): Promise<{ success?: boolean; error?: string }> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return { error: "Unauthorized" };
    }

    // Validate inputs
    if (!["small", "medium", "large"].includes(prefs.pdf_photo_size)) {
      return { error: "Invalid photo size" };
    }
    if (!["letter", "a4"].includes(prefs.pdf_page_size)) {
      return { error: "Invalid page size" };
    }
    if (
      prefs.pdf_max_photos_per_assessment < 0 ||
      prefs.pdf_max_photos_per_assessment > 6
    ) {
      return { error: "Max photos must be 0-6" };
    }

    const { error } = await supabase.from("user_preferences").upsert(
      {
        user_id: user.id,
        pdf_include_photos: prefs.pdf_include_photos,
        pdf_photo_size: prefs.pdf_photo_size,
        pdf_max_photos_per_assessment: prefs.pdf_max_photos_per_assessment,
        pdf_page_size: prefs.pdf_page_size,
      },
      { onConflict: "user_id" }
    );

    if (error) {
      console.error("Save preferences error:", error);
      return { error: `Failed to save: ${error.message}` };
    }

    revalidatePath("/dashboard/settings");
    return { success: true };
  } catch (err) {
    console.error("Save preferences error:", err);
    return { error: "Failed to save preferences" };
  }
}
