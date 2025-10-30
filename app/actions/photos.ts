"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

// Upload photo to Supabase Storage and save metadata to database
export async function uploadPhoto(formData: FormData) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return { error: "Unauthorized" };
    }

    const file = formData.get("file") as File;
    const woundId = formData.get("woundId") as string;
    const visitId = (formData.get("visitId") as string) || null;
    const assessmentId = (formData.get("assessmentId") as string) || null;
    const caption = (formData.get("caption") as string) || null;

    if (!file || !woundId) {
      return { error: "File and woundId are required" };
    }

    // Validate file type
    const validTypes = [
      "image/jpeg",
      "image/jpg",
      "image/png",
      "image/webp",
      "image/heic",
    ];
    if (!validTypes.includes(file.type)) {
      return {
        error:
          "Invalid file type. Only JPEG, PNG, WEBP, and HEIC images are allowed.",
      };
    }

    // Validate file size (max 10MB)
    const maxSize = 10 * 1024 * 1024; // 10MB
    if (file.size > maxSize) {
      return { error: "File size exceeds 10MB limit" };
    }

    // Generate unique filename
    const fileExt = file.name.split(".").pop();
    const fileName = `${woundId}/${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;

    // Upload to Supabase Storage
    const { error: uploadError } = await supabase.storage
      .from("wound-photos")
      .upload(fileName, file, {
        cacheControl: "3600",
        upsert: false,
      });

    if (uploadError) {
      console.error("Upload error:", uploadError);
      return { error: `Failed to upload photo: ${uploadError.message}` };
    }

    // Get public URL - ensure bucket is public in Supabase Storage settings
    const { data: urlData } = supabase.storage
      .from("wound-photos")
      .getPublicUrl(fileName);

    if (!urlData || !urlData.publicUrl) {
      return { error: "Failed to get photo URL" };
    }

    console.log("Photo uploaded:", fileName);
    console.log("Public URL:", urlData.publicUrl);

    // Save photo metadata to database
    const { data: photo, error: dbError } = await supabase
      .from("wound_photos")
      .insert({
        wound_id: woundId,
        visit_id: visitId,
        assessment_id: assessmentId,
        uploaded_by: user.id,
        url: urlData.publicUrl,
        filename: file.name,
        file_size: file.size,
        mime_type: file.type,
        caption,
      })
      .select(
        `
        *,
        wound:wounds(id, wound_number, location)
      `
      )
      .single();

    if (dbError) {
      throw dbError;
    }

    // Revalidate relevant paths
    revalidatePath(`/dashboard/patients`);
    if (visitId) {
      revalidatePath(`/dashboard/patients/[id]/visits/${visitId}`);
    }

    return { photo };
  } catch (error) {
    console.error("Upload photo error:", error);
    return { error: "Failed to upload photo" };
  }
}

// Get all photos for a wound
export async function getPhotos(woundId: string) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return { error: "Unauthorized" };
    }

    const { data: photos, error } = await supabase
      .from("wound_photos")
      .select(
        `
        *,
        wound:wounds(id, wound_number, location),
        visit:visits(id, visit_date, visit_type),
        assessment:wound_assessments(id, healing_status)
      `
      )
      .eq("wound_id", woundId)
      .order("uploaded_at", { ascending: false });

    if (error) {
      throw error;
    }

    return { photos: photos || [] };
  } catch (error) {
    console.error("Get photos error:", error);
    return { error: "Failed to fetch photos" };
  }
}

// Get a single photo
export async function getPhoto(photoId: string) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return { error: "Unauthorized" };
    }

    const { data: photo, error } = await supabase
      .from("wound_photos")
      .select(
        `
        *,
        wound:wounds(
          id,
          wound_number,
          location,
          patient:patients(id, first_name, last_name)
        ),
        visit:visits(id, visit_date, visit_type),
        assessment:wound_assessments(id, healing_status, length, width, depth)
      `
      )
      .eq("id", photoId)
      .maybeSingle();

    if (error) {
      throw error;
    }

    if (!photo) {
      return { error: "Photo not found" };
    }

    return { photo };
  } catch (error) {
    console.error("Get photo error:", error);
    return { error: "Failed to fetch photo" };
  }
}

// Update photo caption
export async function updatePhotoCaption(photoId: string, caption: string) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return { error: "Unauthorized" };
    }

    const { data: photo, error: updateError } = await supabase
      .from("wound_photos")
      .update({ caption })
      .eq("id", photoId)
      .select()
      .single();

    if (updateError) {
      throw updateError;
    }

    revalidatePath(`/dashboard/patients`);

    return { photo };
  } catch (error) {
    console.error("Update photo caption error:", error);
    return { error: "Failed to update photo caption" };
  }
}

// Delete photo
export async function deletePhoto(photoId: string) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return { error: "Unauthorized" };
    }

    // Get photo to find the file path
    const { data: photo, error: photoError } = await supabase
      .from("wound_photos")
      .select("url")
      .eq("id", photoId)
      .maybeSingle();

    if (photoError || !photo) {
      return { error: "Photo not found" };
    }

    // Extract file path from URL
    const url = new URL(photo.url);
    const filePath = url.pathname.split("/wound-photos/")[1];

    if (filePath) {
      // Delete from Supabase Storage
      const { error: storageError } = await supabase.storage
        .from("wound-photos")
        .remove([filePath]);

      if (storageError) {
        console.error("Storage deletion error:", storageError);
        // Continue with database deletion even if storage deletion fails
      }
    }

    // Delete from database
    const { error: deleteError } = await supabase
      .from("wound_photos")
      .delete()
      .eq("id", photoId);

    if (deleteError) {
      throw deleteError;
    }

    revalidatePath(`/dashboard/patients`);

    return { success: true };
  } catch (error) {
    console.error("Delete photo error:", error);
    return { error: "Failed to delete photo" };
  }
}

// Get photos for comparison (by wound, sorted by date)
export async function getPhotosForComparison(woundId: string, limit = 10) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return { error: "Unauthorized" };
    }

    const { data: photos, error } = await supabase
      .from("wound_photos")
      .select(
        `
        *,
        visit:visits(visit_date),
        assessment:wound_assessments(healing_status, length, width, depth, area)
      `
      )
      .eq("wound_id", woundId)
      .order("uploaded_at", { ascending: true })
      .limit(limit);

    if (error) {
      throw error;
    }

    return { photos: photos || [] };
  } catch (error) {
    console.error("Get photos for comparison error:", error);
    return { error: "Failed to fetch photos for comparison" };
  }
}
