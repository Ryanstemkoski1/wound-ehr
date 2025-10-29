"use server";

import { createClient } from "@/lib/supabase/server";
import prisma from "@/lib/prisma";
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

    // Get public URL
    const { data: urlData } = supabase.storage
      .from("wound-photos")
      .getPublicUrl(fileName);

    if (!urlData) {
      return { error: "Failed to get photo URL" };
    }

    // Save photo metadata to database
    const photo = await prisma.photo.create({
      data: {
        woundId,
        visitId,
        assessmentId,
        uploadedBy: user.id,
        url: urlData.publicUrl,
        filename: file.name,
        fileSize: file.size,
        mimeType: file.type,
        caption,
      },
      include: {
        wound: {
          select: {
            id: true,
            woundNumber: true,
            location: true,
          },
        },
        uploader: {
          select: {
            name: true,
            email: true,
          },
        },
      },
    });

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

    const photos = await prisma.photo.findMany({
      where: { woundId },
      include: {
        wound: {
          select: {
            id: true,
            woundNumber: true,
            location: true,
          },
        },
        visit: {
          select: {
            id: true,
            visitDate: true,
            visitType: true,
          },
        },
        assessment: {
          select: {
            id: true,
            healingStatus: true,
          },
        },
        uploader: {
          select: {
            name: true,
            email: true,
          },
        },
      },
      orderBy: {
        uploadedAt: "desc",
      },
    });

    return { photos };
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

    const photo = await prisma.photo.findUnique({
      where: { id: photoId },
      include: {
        wound: {
          select: {
            id: true,
            woundNumber: true,
            location: true,
            patient: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
              },
            },
          },
        },
        visit: {
          select: {
            id: true,
            visitDate: true,
            visitType: true,
          },
        },
        assessment: {
          select: {
            id: true,
            healingStatus: true,
            length: true,
            width: true,
            depth: true,
          },
        },
        uploader: {
          select: {
            name: true,
            email: true,
          },
        },
      },
    });

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

    const photo = await prisma.photo.update({
      where: { id: photoId },
      data: { caption },
    });

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
    const photo = await prisma.photo.findUnique({
      where: { id: photoId },
    });

    if (!photo) {
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
    await prisma.photo.delete({
      where: { id: photoId },
    });

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

    const photos = await prisma.photo.findMany({
      where: { woundId },
      include: {
        visit: {
          select: {
            visitDate: true,
          },
        },
        assessment: {
          select: {
            healingStatus: true,
            length: true,
            width: true,
            depth: true,
            area: true,
          },
        },
      },
      orderBy: {
        uploadedAt: "asc", // Chronological order for comparison
      },
      take: limit,
    });

    return { photos };
  } catch (error) {
    console.error("Get photos for comparison error:", error);
    return { error: "Failed to fetch photos for comparison" };
  }
}
