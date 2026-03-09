// Server Actions for AI Transcription
// Phase 11.1.5: Audio upload, transcription pipeline, clinical note generation
"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import {
  AI_CONFIG,
  RECORDING_CONSENT_TEXT,
  RECORDING_CONSENT_VERSION,
} from "@/lib/ai-config";
import type {
  TranscriptRecord,
  RecordingConsent,
  ProcessingStatus,
} from "@/lib/ai-config";
import {
  runTranscriptionPipeline,
  retryTranscription as pipelineRetry,
  regenerateClinicalNote as pipelineRegenerate,
} from "@/lib/ai/transcription-pipeline";
import { validateApiKey } from "@/lib/ai/openai-service";

// =====================================================
// TYPES
// =====================================================

export type UploadAudioResult = {
  transcript?: TranscriptRecord;
  error?: string;
};

export type TranscriptionResult = {
  transcript?: TranscriptRecord;
  error?: string;
};

export type ApproveNoteResult = {
  success?: boolean;
  error?: string;
};

export type ConsentResult = {
  consent?: RecordingConsent;
  hasConsent?: boolean;
  error?: string;
};

// =====================================================
// RECORDING CONSENT
// =====================================================

/**
 * Check if a patient has an active recording consent
 */
export async function checkRecordingConsent(
  patientId: string
): Promise<ConsentResult> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return { error: "Unauthorized" };
    }

    const { data: consent, error } = await supabase
      .from("patient_recording_consents")
      .select("*")
      .eq("patient_id", patientId)
      .eq("consent_given", true)
      .is("revoked_at", null)
      .single();

    if (error && error.code !== "PGRST116") {
      // PGRST116 = no rows found
      console.error("Check consent error:", error);
      return { error: "Failed to check recording consent" };
    }

    // Check if consent has expired
    if (consent?.expires_at && new Date(consent.expires_at) < new Date()) {
      return { hasConsent: false };
    }

    return {
      consent: consent || undefined,
      hasConsent: !!consent,
    };
  } catch (err) {
    console.error("Check recording consent error:", err);
    return { error: "Failed to check recording consent" };
  }
}

/**
 * Save a patient's recording consent with signature
 */
export async function saveRecordingConsent(
  patientId: string,
  signatureId: string | null,
  expiresInDays?: number
): Promise<ConsentResult> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return { error: "Unauthorized" };
    }

    const expiresAt = expiresInDays
      ? new Date(Date.now() + expiresInDays * 24 * 60 * 60 * 1000).toISOString()
      : null;

    const { data: consent, error } = await supabase
      .from("patient_recording_consents")
      .upsert(
        {
          patient_id: patientId,
          consent_given: true,
          consent_text: RECORDING_CONSENT_TEXT,
          consent_version: RECORDING_CONSENT_VERSION,
          signature_id: signatureId,
          consented_at: new Date().toISOString(),
          expires_at: expiresAt,
          revoked_at: null,
          revoked_reason: null,
        },
        {
          onConflict: "patient_id",
        }
      )
      .select()
      .single();

    if (error) {
      console.error("Save consent error:", error);
      return { error: `Failed to save recording consent: ${error.message}` };
    }

    revalidatePath("/dashboard/patients");
    return { consent, hasConsent: true };
  } catch (err) {
    console.error("Save recording consent error:", err);
    return { error: "Failed to save recording consent" };
  }
}

/**
 * Revoke a patient's recording consent
 */
export async function revokeRecordingConsent(
  patientId: string,
  reason: string
): Promise<ConsentResult> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return { error: "Unauthorized" };
    }

    const { data: consent, error } = await supabase
      .from("patient_recording_consents")
      .update({
        revoked_at: new Date().toISOString(),
        revoked_reason: reason,
      })
      .eq("patient_id", patientId)
      .eq("consent_given", true)
      .is("revoked_at", null)
      .select()
      .single();

    if (error) {
      console.error("Revoke consent error:", error);
      return { error: `Failed to revoke consent: ${error.message}` };
    }

    revalidatePath("/dashboard/patients");
    return { consent, hasConsent: false };
  } catch (err) {
    console.error("Revoke recording consent error:", err);
    return { error: "Failed to revoke recording consent" };
  }
}

// =====================================================
// AUDIO UPLOAD
// =====================================================

/**
 * Upload a visit audio recording to Supabase Storage
 * and create a transcript record in pending state
 */
export async function uploadVisitAudio(
  formData: FormData
): Promise<UploadAudioResult> {
  try {
    console.log("[uploadVisitAudio] Starting...");
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      console.error("[uploadVisitAudio] Auth failed:", authError?.message);
      return { error: "Unauthorized" };
    }
    console.log("[uploadVisitAudio] Authenticated as:", user.email);

    const fileEntry = formData.get("file");
    const visitId = formData.get("visitId");
    const patientId = formData.get("patientId");

    if (
      !fileEntry ||
      !(fileEntry instanceof File) ||
      typeof visitId !== "string" ||
      typeof patientId !== "string"
    ) {
      console.error("[uploadVisitAudio] Missing required fields", {
        hasFile: !!fileEntry,
        isFile: fileEntry instanceof File,
        visitId,
        patientId,
      });
      return { error: "File, visitId, and patientId are required" };
    }

    const file = fileEntry;
    console.log("[uploadVisitAudio] File received:", {
      name: file.name,
      type: file.type,
      size: file.size,
    });

    // Validate consent
    const consentCheck = await checkRecordingConsent(patientId);
    if (!consentCheck.hasConsent) {
      console.error("[uploadVisitAudio] No consent for patient:", patientId);
      return { error: "Patient has not consented to audio recording" };
    }
    console.log("[uploadVisitAudio] Consent verified");

    // Validate file type — use startsWith to handle codec suffixes
    // e.g. "audio/webm;codecs=opus" should match "audio/webm"
    const baseMimeType = file.type.split(";")[0].trim();
    if (!AI_CONFIG.AUDIO.ALLOWED_MIME_TYPES.includes(baseMimeType)) {
      console.error(
        "[uploadVisitAudio] Invalid MIME type:",
        file.type,
        "base:",
        baseMimeType
      );
      return {
        error: `Invalid file type "${file.type}". Allowed: ${AI_CONFIG.AUDIO.ALLOWED_MIME_TYPES.join(", ")}`,
      };
    }

    // Validate file size
    if (file.size > AI_CONFIG.AUDIO.MAX_FILE_SIZE_BYTES) {
      return {
        error: `File size exceeds ${AI_CONFIG.AUDIO.MAX_FILE_SIZE_BYTES / (1024 * 1024)}MB limit`,
      };
    }

    // Generate storage path: {visitId}/{timestamp}_{filename}
    const timestamp = Date.now();
    const safeFilename = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
    const storagePath = `${visitId}/${timestamp}_${safeFilename}`;

    // Convert File to Uint8Array for reliable server-side upload
    // Node.js File polyfill may not stream correctly to Supabase's fetch-based upload
    console.log("[uploadVisitAudio] Converting file to buffer...");
    const arrayBuffer = await file.arrayBuffer();
    const uint8Array = new Uint8Array(arrayBuffer);
    console.log(
      "[uploadVisitAudio] Buffer ready, size:",
      uint8Array.length,
      "bytes"
    );

    // Upload to Supabase Storage
    console.log("[uploadVisitAudio] Uploading to storage:", storagePath);
    const { error: uploadError } = await supabase.storage
      .from(AI_CONFIG.AUDIO.STORAGE_BUCKET)
      .upload(storagePath, uint8Array, {
        cacheControl: "3600",
        upsert: false,
        contentType: baseMimeType,
      });

    if (uploadError) {
      console.error("[uploadVisitAudio] Storage upload error:", uploadError);
      return { error: `Failed to upload audio: ${uploadError.message}` };
    }
    console.log("[uploadVisitAudio] Storage upload complete");

    // Create transcript record in pending state
    console.log("[uploadVisitAudio] Creating transcript record...");
    const { data: transcript, error: dbError } = await supabase
      .from("visit_transcripts")
      .insert({
        visit_id: visitId,
        audio_url: storagePath,
        audio_filename: file.name,
        audio_size_bytes: file.size,
        processing_status: "pending" as ProcessingStatus,
        ai_service: "openai",
      })
      .select()
      .single();

    if (dbError) {
      // Cleanup uploaded file on DB error
      await supabase.storage
        .from(AI_CONFIG.AUDIO.STORAGE_BUCKET)
        .remove([storagePath]);
      console.error("[uploadVisitAudio] Transcript record error:", dbError);
      return {
        error: `Failed to create transcript record: ${dbError.message}`,
      };
    }
    console.log("[uploadVisitAudio] Transcript record created:", transcript.id);

    // Link transcript to visit
    await supabase
      .from("visits")
      .update({
        has_ai_transcript: true,
        ai_transcript_id: transcript.id,
      })
      .eq("id", visitId);

    console.log("[uploadVisitAudio] Complete — transcript:", transcript.id);
    revalidatePath("/dashboard/patients");
    return { transcript };
  } catch (err) {
    console.error("[uploadVisitAudio] Unhandled error:", err);
    return { error: "Failed to upload audio recording" };
  }
}

// =====================================================
// TRANSCRIPTION PROCESSING
// =====================================================

/**
 * Process a pending transcript: Whisper → GPT-4 → clinical note
 * Delegates to the transcription pipeline which handles retry,
 * timeout, error recovery, and intermediate state saves.
 */
export async function processTranscription(
  transcriptId: string
): Promise<TranscriptionResult> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return { error: "Unauthorized" };
    }

    const result = await runTranscriptionPipeline(transcriptId);

    revalidatePath("/dashboard/patients");

    if (!result.success) {
      return { error: result.error || "Processing failed" };
    }

    // Fetch the updated transcript record to return
    const { data: transcript } = await supabase
      .from("visit_transcripts")
      .select("*")
      .eq("id", transcriptId)
      .single();

    return { transcript: transcript || undefined };
  } catch (err) {
    console.error("Process transcription error:", err);
    return { error: "Failed to process transcription" };
  }
}

/**
 * Retry a failed transcription
 */
export async function retryFailedTranscription(
  transcriptId: string
): Promise<TranscriptionResult> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return { error: "Unauthorized" };
    }

    const result = await pipelineRetry(transcriptId);

    revalidatePath("/dashboard/patients");

    if (!result.success) {
      return { error: result.error || "Retry failed" };
    }

    const { data: transcript } = await supabase
      .from("visit_transcripts")
      .select("*")
      .eq("id", transcriptId)
      .single();

    return { transcript: transcript || undefined };
  } catch (err) {
    console.error("Retry transcription error:", err);
    return { error: "Failed to retry transcription" };
  }
}

/**
 * Regenerate just the clinical note from an existing raw transcript.
 * The audio is not re-processed — only GPT-4 is called again.
 */
export async function regenerateAINote(
  transcriptId: string
): Promise<TranscriptionResult> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return { error: "Unauthorized" };
    }

    const result = await pipelineRegenerate(transcriptId);

    revalidatePath("/dashboard/patients");

    if (!result.success) {
      return { error: result.error || "Regeneration failed" };
    }

    const { data: transcript } = await supabase
      .from("visit_transcripts")
      .select("*")
      .eq("id", transcriptId)
      .single();

    return { transcript: transcript || undefined };
  } catch (err) {
    console.error("Regenerate AI note error:", err);
    return { error: "Failed to regenerate clinical note" };
  }
}

// =====================================================
// STATUS POLLING
// =====================================================

/**
 * Get the current processing status of a transcript.
 * Used for client-side polling while transcription is in progress.
 */
export async function getTranscriptionStatus(transcriptId: string): Promise<{
  status?: ProcessingStatus;
  progress?: string;
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
      .from("visit_transcripts")
      .select("processing_status, error_message, processing_started_at")
      .eq("id", transcriptId)
      .single();

    if (error) {
      return { error: "Transcript not found" };
    }

    let progress: string | undefined;
    if (data.processing_status === "processing" && data.processing_started_at) {
      const elapsed = Math.round(
        (Date.now() - new Date(data.processing_started_at).getTime()) / 1000
      );
      progress = `Processing for ${elapsed}s...`;
    }

    return {
      status: data.processing_status as ProcessingStatus,
      progress,
      error: data.error_message || undefined,
    };
  } catch (err) {
    console.error("Get transcription status error:", err);
    return { error: "Failed to check status" };
  }
}

// =====================================================
// AI SERVICE HEALTH CHECK
// =====================================================

/**
 * Validate that the OpenAI API key is configured and working.
 * Admin-only utility action.
 */
export async function checkAIServiceHealth(): Promise<{
  healthy: boolean;
  error?: string;
}> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return { healthy: false, error: "Unauthorized" };
    }

    const result = await validateApiKey();
    return { healthy: result.valid, error: result.error };
  } catch (err) {
    console.error("AI health check error:", err);
    return { healthy: false, error: "Health check failed" };
  }
}

// =====================================================
// CLINICIAN REVIEW & APPROVAL
// =====================================================

/**
 * Approve AI-generated clinical note (optionally with edits)
 */
export async function approveAINote(
  transcriptId: string,
  finalNote: string,
  wasEdited: boolean
): Promise<ApproveNoteResult> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return { error: "Unauthorized" };
    }

    // Update the transcript record (only if currently completed)
    const { data: transcript, error: updateError } = await supabase
      .from("visit_transcripts")
      .update({
        final_note: finalNote,
        clinician_edited: wasEdited,
        clinician_approved_at: new Date().toISOString(),
        approved_by: user.id,
      })
      .eq("id", transcriptId)
      .eq("processing_status", "completed")
      .select("visit_id")
      .maybeSingle();

    if (updateError) {
      console.error("Approve note error:", updateError);
      return { error: `Failed to approve note: ${updateError.message}` };
    }

    if (!transcript) {
      return {
        error:
          "Cannot approve — transcript is not in completed state. It may still be processing.",
      };
    }

    // Update the visit to reflect approval
    if (transcript?.visit_id) {
      await supabase
        .from("visits")
        .update({
          ai_note_approved: true,
        })
        .eq("id", transcript.visit_id);
    }

    revalidatePath("/dashboard/patients");
    return { success: true };
  } catch (err) {
    console.error("Approve AI note error:", err);
    return { error: "Failed to approve clinical note" };
  }
}

/**
 * Reject / request re-processing of an AI note
 */
export async function rejectAINote(
  transcriptId: string,
  reason: string
): Promise<ApproveNoteResult> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return { error: "Unauthorized" };
    }

    const { error: updateError } = await supabase
      .from("visit_transcripts")
      .update({
        processing_status: "pending" as ProcessingStatus,
        error_message: `Rejected by clinician: ${reason}`,
        transcript_clinical: null,
        clinician_approved_at: null,
        approved_by: null,
        final_note: null,
      })
      .eq("id", transcriptId);

    if (updateError) {
      console.error("Reject note error:", updateError);
      return { error: `Failed to reject note: ${updateError.message}` };
    }

    revalidatePath("/dashboard/patients");
    return { success: true };
  } catch (err) {
    console.error("Reject AI note error:", err);
    return { error: "Failed to reject clinical note" };
  }
}

// =====================================================
// TRANSCRIPT RETRIEVAL
// =====================================================

/**
 * Get transcript for a specific visit
 */
export async function getVisitTranscript(
  visitId: string
): Promise<TranscriptionResult> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return { error: "Unauthorized" };
    }

    const { data: transcript, error } = await supabase
      .from("visit_transcripts")
      .select("*")
      .eq("visit_id", visitId)
      .order("created_at", { ascending: false })
      .limit(1)
      .single();

    if (error && error.code !== "PGRST116") {
      console.error("Get transcript error:", error);
      return { error: "Failed to fetch transcript" };
    }

    return { transcript: transcript || undefined };
  } catch (err) {
    console.error("Get visit transcript error:", err);
    return { error: "Failed to fetch transcript" };
  }
}

/**
 * Get all transcripts for a patient (across visits)
 */
export async function getPatientTranscripts(patientId: string) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return { error: "Unauthorized" };
    }

    const { data: transcripts, error } = await supabase
      .from("visit_transcripts")
      .select(
        `
        *,
        visit:visits!inner(
          id,
          visit_date,
          visit_type,
          patient_id
        )
      `
      )
      .eq("visit.patient_id", patientId)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Get patient transcripts error:", error);
      return { error: "Failed to fetch patient transcripts" };
    }

    return { transcripts };
  } catch (err) {
    console.error("Get patient transcripts error:", err);
    return { error: "Failed to fetch patient transcripts" };
  }
}

// =====================================================
// AUDIO FILE MANAGEMENT
// =====================================================

/**
 * Delete visit audio from storage (keeps transcript record)
 * Used for data retention compliance (90-day policy)
 */
export async function deleteVisitAudio(
  transcriptId: string
): Promise<ApproveNoteResult> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return { error: "Unauthorized" };
    }

    // Fetch audio path
    const { data: transcript, error: fetchError } = await supabase
      .from("visit_transcripts")
      .select("audio_url")
      .eq("id", transcriptId)
      .single();

    if (fetchError || !transcript?.audio_url) {
      return { error: "Transcript or audio not found" };
    }

    // Delete from storage
    const { error: deleteError } = await supabase.storage
      .from(AI_CONFIG.AUDIO.STORAGE_BUCKET)
      .remove([transcript.audio_url]);

    if (deleteError) {
      console.error("Delete audio error:", deleteError);
      return { error: `Failed to delete audio: ${deleteError.message}` };
    }

    // Update record: mark as deleted, clear audio URL
    const { error: updateError } = await supabase
      .from("visit_transcripts")
      .update({
        audio_url: null,
        processing_status: "deleted" as ProcessingStatus,
      })
      .eq("id", transcriptId);

    if (updateError) {
      console.error("Update transcript after delete error:", updateError);
      return { error: "Audio deleted but failed to update record" };
    }

    revalidatePath("/dashboard/patients");
    return { success: true };
  } catch (err) {
    console.error("Delete visit audio error:", err);
    return { error: "Failed to delete audio recording" };
  }
}

/**
 * Get a signed URL for audio playback (temporary access)
 */
export async function getAudioPlaybackUrl(transcriptId: string) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return { error: "Unauthorized" };
    }

    // Fetch audio path
    const { data: transcript, error: fetchError } = await supabase
      .from("visit_transcripts")
      .select("audio_url")
      .eq("id", transcriptId)
      .single();

    if (fetchError || !transcript?.audio_url) {
      return { error: "Audio not found" };
    }

    // Generate signed URL (expires in 1 hour)
    const { data: signedUrl, error: signError } = await supabase.storage
      .from(AI_CONFIG.AUDIO.STORAGE_BUCKET)
      .createSignedUrl(transcript.audio_url, 3600);

    if (signError || !signedUrl) {
      return { error: "Failed to generate audio URL" };
    }

    return { url: signedUrl.signedUrl };
  } catch (err) {
    console.error("Get audio playback URL error:", err);
    return { error: "Failed to get audio URL" };
  }
}
