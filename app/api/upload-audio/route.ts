// API Route for audio file upload
// Uses standard HTTP multipart/form-data — avoids Next.js server action
// serialization issues with binary File objects in FormData

import { createClient } from "@/lib/supabase/server";
import { AI_CONFIG } from "@/lib/ai-config";
import { auditPhiAccess } from "@/lib/audit-log";
import { rateLimit, clientKey } from "@/lib/rate-limit";
import { NextRequest, NextResponse } from "next/server";

// Same-origin CSRF guard for the audio upload endpoint. Server Actions
// get this for free; raw API routes do not.
function isSameOrigin(request: NextRequest): boolean {
  const origin = request.headers.get("origin");
  const host = request.headers.get("host");
  if (!origin) {
    // No Origin header — fetch() always sends one for CORS-mode POSTs.
    // Permit only if the request is non-CORS (Sec-Fetch-Site: same-origin).
    return request.headers.get("sec-fetch-site") === "same-origin";
  }
  try {
    return new URL(origin).host === host;
  } catch {
    return false;
  }
}

export async function POST(request: NextRequest) {
  try {
    if (!isSameOrigin(request)) {
      return NextResponse.json(
        { error: "Cross-origin request rejected" },
        { status: 403 }
      );
    }

    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Rate limit: 10 uploads per 5 minutes per user. Audio transcription
    // costs real money and Whisper's per-minute pricing makes abuse
    // expensive fast.
    const rl = rateLimit(
      clientKey(request.headers, "upload-audio", user.id),
      10,
      5 * 60_000
    );
    if (!rl.allowed) {
      return NextResponse.json(
        { error: "Rate limit exceeded. Try again shortly." },
        {
          status: 429,
          headers: {
            "Retry-After": Math.ceil(rl.retryAfterMs / 1000).toString(),
          },
        }
      );
    }

    const formData = await request.formData();
    const fileEntry = formData.get("file");
    const visitId = formData.get("visitId") as string;
    const patientId = formData.get("patientId") as string;

    if (!fileEntry || !(fileEntry instanceof File) || !visitId || !patientId) {
      return NextResponse.json(
        { error: "File, visitId, and patientId are required" },
        { status: 400 }
      );
    }

    const file = fileEntry;

    // Validate BOTH (a) recording consent and (b) AI-processing consent.
    // AI-processing consent is required because the audio + transcript
    // will be sent to a third-party AI vendor (OpenAI). This is a
    // distinct authorization from consenting to be recorded.
    const { data: consent } = await supabase
      .from("patient_recording_consents")
      .select("id, ai_processing_consent_given")
      .eq("patient_id", patientId)
      .eq("consent_given", true)
      .is("revoked_at", null)
      .maybeSingle();

    if (!consent) {
      return NextResponse.json(
        { error: "Patient has not consented to audio recording" },
        { status: 403 }
      );
    }
    if (!consent.ai_processing_consent_given) {
      return NextResponse.json(
        {
          error:
            "Patient has not consented to AI processing of recordings (third-party vendor). Capture AI consent before uploading.",
        },
        { status: 403 }
      );
    }

    // Validate file type — strip codec suffix
    const baseMimeType = file.type.split(";")[0].trim();
    if (!AI_CONFIG.AUDIO.ALLOWED_MIME_TYPES.includes(baseMimeType)) {
      return NextResponse.json(
        {
          error: `Invalid file type "${baseMimeType}". Allowed: ${AI_CONFIG.AUDIO.ALLOWED_MIME_TYPES.join(", ")}`,
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
    const arrayBuffer = await file.arrayBuffer();
    const uint8Array = new Uint8Array(arrayBuffer);

    // Upload to Supabase Storage
    const { error: uploadError } = await supabase.storage
      .from(AI_CONFIG.AUDIO.STORAGE_BUCKET)
      .upload(storagePath, uint8Array, {
        cacheControl: "3600",
        upsert: false,
        contentType: baseMimeType,
      });

    if (uploadError) {
      console.error(
        "[upload-audio] Storage upload error:",
        uploadError.message
      );
      return NextResponse.json(
        { error: `Failed to upload audio: ${uploadError.message}` },
        { status: 500 }
      );
    }

    // Create transcript record
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
      console.error("[upload-audio] Transcript record error:", dbError.message);
      return NextResponse.json(
        { error: `Failed to create transcript record: ${dbError.message}` },
        { status: 500 }
      );
    }

    // Link transcript to visit
    await supabase
      .from("visits")
      .update({
        has_ai_transcript: true,
        ai_transcript_id: transcript.id,
      })
      .eq("id", visitId);

    // PHI audit trail: record that audio for this visit was uploaded.
    // Fire-and-forget; never blocks the response.
    void auditPhiAccess({
      action: "create",
      table: "visit_transcripts",
      recordId: transcript.id,
      recordType: "visit_audio",
      reason: `Audio upload for visit ${visitId}`,
    });

    return NextResponse.json({ transcript });
  } catch (err) {
    console.error(
      "[upload-audio] Unhandled error:",
      err instanceof Error ? err.message : "unknown"
    );
    return NextResponse.json(
      { error: "Failed to upload audio recording" },
      { status: 500 }
    );
  }
}
