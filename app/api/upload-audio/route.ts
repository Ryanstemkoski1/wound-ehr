// API Route for audio file upload
// Uses standard HTTP multipart/form-data — avoids Next.js server action
// serialization issues with binary File objects in FormData

import { createClient } from "@/lib/supabase/server";
import { AI_CONFIG } from "@/lib/ai-config";
import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  try {
    console.log("[upload-audio] Starting...");
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      console.error("[upload-audio] Auth failed:", authError?.message);
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    console.log("[upload-audio] Authenticated as:", user.email);

    const formData = await request.formData();
    const fileEntry = formData.get("file");
    const visitId = formData.get("visitId") as string;
    const patientId = formData.get("patientId") as string;

    if (!fileEntry || !(fileEntry instanceof File) || !visitId || !patientId) {
      console.error("[upload-audio] Missing required fields");
      return NextResponse.json(
        { error: "File, visitId, and patientId are required" },
        { status: 400 }
      );
    }

    const file = fileEntry;
    console.log("[upload-audio] File received:", {
      name: file.name,
      type: file.type,
      size: file.size,
    });

    // Validate consent
    const { data: consent } = await supabase
      .from("patient_recording_consents")
      .select("id")
      .eq("patient_id", patientId)
      .eq("consent_given", true)
      .is("revoked_at", null)
      .single();

    if (!consent) {
      return NextResponse.json(
        { error: "Patient has not consented to audio recording" },
        { status: 403 }
      );
    }
    console.log("[upload-audio] Consent verified");

    // Validate file type — strip codec suffix
    const baseMimeType = file.type.split(";")[0].trim();
    if (!AI_CONFIG.AUDIO.ALLOWED_MIME_TYPES.includes(baseMimeType)) {
      return NextResponse.json(
        {
          error: `Invalid file type "${file.type}". Allowed: ${AI_CONFIG.AUDIO.ALLOWED_MIME_TYPES.join(", ")}`,
        },
        { status: 400 }
      );
    }

    // Validate file size
    if (file.size > AI_CONFIG.AUDIO.MAX_FILE_SIZE_BYTES) {
      return NextResponse.json(
        {
          error: `File size exceeds ${AI_CONFIG.AUDIO.MAX_FILE_SIZE_BYTES / (1024 * 1024)}MB limit`,
        },
        { status: 400 }
      );
    }

    // Generate storage path
    const timestamp = Date.now();
    const safeFilename = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
    const storagePath = `${visitId}/${timestamp}_${safeFilename}`;

    // Convert to buffer for reliable upload
    console.log("[upload-audio] Converting to buffer...");
    const arrayBuffer = await file.arrayBuffer();
    const uint8Array = new Uint8Array(arrayBuffer);
    console.log("[upload-audio] Buffer ready:", uint8Array.length, "bytes");

    // Upload to Supabase Storage
    console.log("[upload-audio] Uploading to storage:", storagePath);
    const { error: uploadError } = await supabase.storage
      .from(AI_CONFIG.AUDIO.STORAGE_BUCKET)
      .upload(storagePath, uint8Array, {
        cacheControl: "3600",
        upsert: false,
        contentType: baseMimeType,
      });

    if (uploadError) {
      console.error("[upload-audio] Storage upload error:", uploadError);
      return NextResponse.json(
        { error: `Failed to upload audio: ${uploadError.message}` },
        { status: 500 }
      );
    }
    console.log("[upload-audio] Storage upload complete");

    // Create transcript record
    console.log("[upload-audio] Creating transcript record...");
    const { data: transcript, error: dbError } = await supabase
      .from("visit_transcripts")
      .insert({
        visit_id: visitId,
        audio_url: storagePath,
        audio_filename: file.name,
        audio_size_bytes: file.size,
        processing_status: "pending",
        ai_service: "openai",
      })
      .select()
      .single();

    if (dbError) {
      // Cleanup uploaded file on DB error
      await supabase.storage
        .from(AI_CONFIG.AUDIO.STORAGE_BUCKET)
        .remove([storagePath]);
      console.error("[upload-audio] Transcript record error:", dbError);
      return NextResponse.json(
        { error: `Failed to create transcript record: ${dbError.message}` },
        { status: 500 }
      );
    }
    console.log("[upload-audio] Transcript created:", transcript.id);

    // Link transcript to visit
    await supabase
      .from("visits")
      .update({
        has_ai_transcript: true,
        ai_transcript_id: transcript.id,
      })
      .eq("id", visitId);

    console.log("[upload-audio] Complete — transcript:", transcript.id);
    return NextResponse.json({ transcript });
  } catch (err) {
    console.error("[upload-audio] Unhandled error:", err);
    return NextResponse.json(
      { error: "Failed to upload audio recording" },
      { status: 500 }
    );
  }
}
