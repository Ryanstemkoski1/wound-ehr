// Server Actions for AI Transcription
// Phase 11.1.5: Audio upload, transcription pipeline, clinical note generation
"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { assertUuid, tryUuid, ValidationError } from "@/lib/validations/common";
import {
  AI_CONFIG,
  RECORDING_CONSENT_TEXT,
  RECORDING_CONSENT_VERSION,
  AI_PROCESSING_CONSENT_TEXT,
  AI_PROCESSING_CONSENT_VENDOR,
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
  const uuidCheck = tryUuid(patientId);
  if (!uuidCheck) return { error: "Invalid patientId" };

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
 * Save a patient's recording consent with signature.
 *
 * @param aiProcessingConsentGiven  When TRUE, also captures explicit
 *   consent for transmission of PHI to a third-party AI vendor
 *   (separate HIPAA / BAA gate). When FALSE, recording is allowed but
 *   the audio MUST NOT be uploaded for AI processing.
 */
export async function saveRecordingConsent(
  patientId: string,
  signatureId: string | null,
  expiresInDays?: number,
  aiProcessingConsentGiven: boolean = false
): Promise<ConsentResult> {
  const uuidCheck = tryUuid(patientId);
  if (!uuidCheck) return { error: "Invalid patientId" };
  if (signatureId !== null && !tryUuid(signatureId))
    return { error: "Invalid signatureId" };

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

    const nowIso = new Date().toISOString();

    const { data: consent, error } = await supabase
      .from("patient_recording_consents")
      .upsert(
        {
          patient_id: patientId,
          consent_given: true,
          consent_text: RECORDING_CONSENT_TEXT,
          consent_version: RECORDING_CONSENT_VERSION,
          signature_id: signatureId,
          consented_at: nowIso,
          expires_at: expiresAt,
          revoked_at: null,
          revoked_reason: null,
          // Separate AI-processing gate — only set when explicitly granted.
          ai_processing_consent_given: aiProcessingConsentGiven,
          ai_processing_consent_text: aiProcessingConsentGiven
            ? AI_PROCESSING_CONSENT_TEXT
            : null,
          ai_processing_consented_at: aiProcessingConsentGiven ? nowIso : null,
          ai_processing_signature_id: aiProcessingConsentGiven
            ? signatureId
            : null,
          ai_vendor: aiProcessingConsentGiven
            ? AI_PROCESSING_CONSENT_VENDOR
            : null,
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

/**
 * Revoke ONLY the AI-processing consent while keeping the recording
 * consent intact. After this call uploadVisitAudio will refuse with 403
 * because the upload route requires both gates to be true.
 */
export async function revokeAiProcessingConsent(
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
      .update({
        ai_processing_consent_given: false,
        ai_processing_consented_at: null,
        ai_processing_signature_id: null,
      })
      .eq("patient_id", patientId)
      .is("revoked_at", null)
      .select()
      .single();

    if (error) {
      console.error("Revoke AI consent error:", error);
      return { error: `Failed to revoke AI consent: ${error.message}` };
    }

    revalidatePath("/dashboard/patients");
    return { consent, hasConsent: true };
  } catch (err) {
    console.error("Revoke AI consent error:", err);
    return { error: "Failed to revoke AI consent" };
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
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      console.error("[uploadVisitAudio] Auth failed:", authError?.message);
      return { error: "Unauthorized" };
    }
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

    if (!tryUuid(visitId)) return { error: "Invalid visitId" };
    if (!tryUuid(patientId)) return { error: "Invalid patientId" };

    const file = fileEntry;
    // Validate consent
    const consentCheck = await checkRecordingConsent(patientId);
    if (!consentCheck.hasConsent) {
      console.error("[uploadVisitAudio] No consent for patient:", patientId);
      return { error: "Patient has not consented to audio recording" };
    }
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
      console.error("[uploadVisitAudio] Storage upload error:", uploadError);
      return { error: `Failed to upload audio: ${uploadError.message}` };
    }
    // Create transcript record in pending state
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
    // Link transcript to visit
    await supabase
      .from("visits")
      .update({
        has_ai_transcript: true,
        ai_transcript_id: transcript.id,
      })
      .eq("id", visitId);

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

// =====================================================
// ADMIN: TRANSCRIPT MANAGEMENT
// =====================================================

export type AdminTranscript = {
  id: string;
  visit_id: string;
  audio_url: string | null;
  audio_filename: string | null;
  audio_size_bytes: number | null;
  audio_duration_seconds: number | null;
  processing_status: string;
  clinician_edited: boolean;
  clinician_approved_at: string | null;
  cost_transcription: number | null;
  cost_llm: number | null;
  created_at: string;
  error_message: string | null;
  visit: {
    id: string;
    visit_date: string;
    patient: {
      id: string;
      first_name: string;
      last_name: string;
      mrn: string | null;
    };
    clinician: {
      id: string;
      full_name: string | null;
    } | null;
  };
};

export type TranscriptStats = {
  total: number;
  byStatus: Record<string, number>;
  totalCostTranscription: number;
  totalCostLlm: number;
  audioStorageCount: number;
  expiredAudioCount: number;
};

/**
 * Fetch all transcripts for admin management page.
 * Requires tenant_admin or facility_admin role.
 */
export async function getAdminTranscripts(filters?: {
  status?: string;
  dateFrom?: string;
  dateTo?: string;
}): Promise<{
  transcripts?: AdminTranscript[];
  stats?: TranscriptStats;
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

    // Build query
    let query = supabase
      .from("visit_transcripts")
      .select(
        `
        id,
        visit_id,
        audio_url,
        audio_filename,
        audio_size_bytes,
        audio_duration_seconds,
        processing_status,
        clinician_edited,
        clinician_approved_at,
        cost_transcription,
        cost_llm,
        created_at,
        error_message,
        visit:visits!inner(
          id,
          visit_date,
          patient:patients!inner(id, first_name, last_name, mrn),
          clinician:users!visits_clinician_id_fkey(id, full_name)
        )
      `
      )
      .order("created_at", { ascending: false })
      .limit(200);

    // Apply filters
    if (filters?.status) {
      query = query.eq("processing_status", filters.status);
    }
    if (filters?.dateFrom) {
      query = query.gte("created_at", filters.dateFrom);
    }
    if (filters?.dateTo) {
      query = query.lte("created_at", filters.dateTo + "T23:59:59Z");
    }

    const { data, error } = await query;

    if (error) {
      console.error("Get admin transcripts error:", error);
      return { error: `Failed to fetch transcripts: ${error.message}` };
    }

    const transcripts = (data ?? []) as unknown as AdminTranscript[];

    // Compute stats
    const retentionCutoff = new Date();
    retentionCutoff.setDate(
      retentionCutoff.getDate() - AI_CONFIG.RETENTION.AUDIO_DAYS
    );

    const stats: TranscriptStats = {
      total: transcripts.length,
      byStatus: {},
      totalCostTranscription: 0,
      totalCostLlm: 0,
      audioStorageCount: 0,
      expiredAudioCount: 0,
    };

    for (const t of transcripts) {
      stats.byStatus[t.processing_status] =
        (stats.byStatus[t.processing_status] || 0) + 1;
      stats.totalCostTranscription += Number(t.cost_transcription ?? 0);
      stats.totalCostLlm += Number(t.cost_llm ?? 0);
      if (t.audio_url) {
        stats.audioStorageCount++;
        if (new Date(t.created_at) < retentionCutoff) {
          stats.expiredAudioCount++;
        }
      }
    }

    return { transcripts, stats };
  } catch (err) {
    console.error("Get admin transcripts error:", err);
    return { error: "Failed to fetch transcripts" };
  }
}

/**
 * Batch cleanup: delete audio files older than retention period.
 * Returns count of deleted files.
 */
export async function cleanupExpiredAudio(
  dryRun = false
): Promise<{ deleted?: number; candidates?: number; error?: string }> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return { error: "Unauthorized" };
    }

    const retentionCutoff = new Date();
    retentionCutoff.setDate(
      retentionCutoff.getDate() - AI_CONFIG.RETENTION.AUDIO_DAYS
    );

    // Find transcripts with audio older than retention period
    const { data: expired, error: fetchError } = await supabase
      .from("visit_transcripts")
      .select("id, audio_url")
      .not("audio_url", "is", null)
      .lt("created_at", retentionCutoff.toISOString())
      .neq("processing_status", "deleted");

    if (fetchError) {
      return { error: `Failed to find expired audio: ${fetchError.message}` };
    }

    const candidates = expired?.length ?? 0;

    if (dryRun) {
      return { candidates, deleted: 0 };
    }

    let deleted = 0;
    for (const record of expired ?? []) {
      if (!record.audio_url) continue;

      // Delete from storage
      const { error: delErr } = await supabase.storage
        .from(AI_CONFIG.AUDIO.STORAGE_BUCKET)
        .remove([record.audio_url]);

      if (delErr) {
        console.error(
          `Failed to delete audio for transcript ${record.id}:`,
          delErr
        );
        continue;
      }

      // Update record
      await supabase
        .from("visit_transcripts")
        .update({
          audio_url: null,
          processing_status: "deleted" as ProcessingStatus,
        })
        .eq("id", record.id);

      deleted++;
    }

    revalidatePath("/dashboard/admin/transcripts");
    return { deleted, candidates };
  } catch (err) {
    console.error("Cleanup expired audio error:", err);
    return { error: "Failed to cleanup expired audio" };
  }
}
