// Transcription Processing Pipeline
// Phase 11.1.5 - Orchestrates audio → transcript → clinical note with status tracking

import { createClient } from "@/lib/supabase/server";
import { AI_CONFIG, type ProcessingStatus } from "@/lib/ai-config";
import {
  transcribeAudio,
  generateClinicalNote,
  calculateWhisperCost,
  calculateGPTCost,
  type WhisperResult,
  type GPTResult,
  type OpenAIServiceError,
} from "@/lib/ai/openai-service";

// =====================================================
// TYPES
// =====================================================

export type PipelineStep =
  | "download"
  | "transcribe"
  | "generate_note"
  | "save_results";

export type PipelineProgress = {
  step: PipelineStep;
  percent: number;
  message: string;
};

export type PipelineResult = {
  success: boolean;
  transcriptId: string;
  rawTranscript?: string;
  clinicalNote?: string;
  duration?: number;
  costTranscription?: number;
  costLlm?: number;
  error?: string;
  errorType?: OpenAIServiceError["type"];
  failedStep?: PipelineStep;
};

/**
 * Callback for progress updates during pipeline execution.
 * Used to update the database status in real-time.
 */
type ProgressCallback = (progress: PipelineProgress) => Promise<void>;

// =====================================================
// PIPELINE
// =====================================================

/**
 * Execute the full transcription pipeline for a visit audio recording.
 *
 * Steps:
 * 1. Download audio from Supabase Storage
 * 2. Transcribe with OpenAI Whisper (speech-to-text)
 * 3. Generate clinical note with GPT-4
 * 4. Save all results to the database
 *
 * This function handles its own error recovery — if any step fails,
 * the transcript record is marked as "failed" with the error message.
 *
 * @param transcriptId - The visit_transcripts.id to process
 * @param onProgress - Optional progress callback
 */
export async function runTranscriptionPipeline(
  transcriptId: string,
  onProgress?: ProgressCallback
): Promise<PipelineResult> {
  const supabase = await createClient();

  // -----------------------------------------------
  // PREFLIGHT: Fetch and validate the transcript record
  // -----------------------------------------------
  const { data: transcript, error: fetchError } = await supabase
    .from("visit_transcripts")
    .select("*")
    .eq("id", transcriptId)
    .single();

  if (fetchError || !transcript) {
    return {
      success: false,
      transcriptId,
      error: "Transcript record not found",
      failedStep: "download",
    };
  }

  // Atomic status guard + update: Prevent concurrent processing.
  // Only process from pending or failed states (allow retry on failure).
  // The WHERE clause ensures only one caller can "claim" this transcript.
  const { data: claimed, error: claimError } = await supabase
    .from("visit_transcripts")
    .update({
      processing_status: "processing" as ProcessingStatus,
      processing_started_at: new Date().toISOString(),
      error_message: null, // Clear previous errors on retry
    })
    .eq("id", transcriptId)
    .in("processing_status", ["pending", "failed"])
    .select("id")
    .maybeSingle();

  if (claimError) {
    return {
      success: false,
      transcriptId,
      error: `Failed to claim transcript for processing: ${claimError.message}`,
    };
  }

  if (!claimed) {
    return {
      success: false,
      transcriptId,
      error:
        "Cannot process transcript — it is already being processed or completed",
    };
  }

  await onProgress?.({
    step: "download",
    percent: 10,
    message: "Downloading audio from storage...",
  });

  try {
    // -----------------------------------------------
    // STEP 1: Download audio from Supabase Storage
    // -----------------------------------------------
    const { data: audioData, error: downloadError } = await supabase.storage
      .from(AI_CONFIG.AUDIO.STORAGE_BUCKET)
      .download(transcript.audio_url);

    if (downloadError || !audioData) {
      throw makePipelineError(
        "download",
        `Failed to download audio: ${downloadError?.message || "No data returned"}`
      );
    }

    await onProgress?.({
      step: "transcribe",
      percent: 25,
      message: "Transcribing audio with OpenAI Whisper...",
    });

    // -----------------------------------------------
    // STEP 2: Transcribe with OpenAI Whisper
    // -----------------------------------------------
    let whisperResult: WhisperResult;
    try {
      whisperResult = await transcribeAudio(
        audioData,
        transcript.audio_filename || "audio.webm"
      );
    } catch (err) {
      const aiError = err as OpenAIServiceError;
      throw makePipelineError(
        "transcribe",
        `Whisper transcription failed: ${aiError.message}`,
        aiError.type
      );
    }

    if (!whisperResult.text.trim()) {
      throw makePipelineError(
        "transcribe",
        "Whisper returned an empty transcript. The audio may be silent or corrupted."
      );
    }

    const costTranscription = calculateWhisperCost(whisperResult.duration);

    // Save intermediate result (raw transcript) so we don't lose it
    await supabase
      .from("visit_transcripts")
      .update({
        transcript_raw: whisperResult.text,
        audio_duration_seconds: Math.round(whisperResult.duration),
        cost_transcription: costTranscription,
        transcript_metadata: {
          whisper: {
            duration: whisperResult.duration,
            language: whisperResult.language,
            segments: whisperResult.segments.length,
          },
        },
      })
      .eq("id", transcriptId);

    await onProgress?.({
      step: "generate_note",
      percent: 60,
      message: "Generating clinical note with GPT-4...",
    });

    // -----------------------------------------------
    // STEP 3: Generate clinical note with GPT-4
    // -----------------------------------------------
    let gptResult: GPTResult;
    try {
      gptResult = await generateClinicalNote(whisperResult.text);
    } catch (err) {
      const aiError = err as OpenAIServiceError;
      throw makePipelineError(
        "generate_note",
        `Clinical note generation failed: ${aiError.message}`,
        aiError.type
      );
    }

    const costLlm = calculateGPTCost(gptResult.totalTokens);

    await onProgress?.({
      step: "save_results",
      percent: 90,
      message: "Saving results...",
    });

    // -----------------------------------------------
    // STEP 4: Save all results to database
    // -----------------------------------------------
    const { error: updateError } = await supabase
      .from("visit_transcripts")
      .update({
        transcript_clinical: gptResult.content,
        transcript_metadata: {
          whisper: {
            duration: whisperResult.duration,
            language: whisperResult.language,
            segments: whisperResult.segments.length,
          },
          gpt: {
            model: gptResult.model,
            total_tokens: gptResult.totalTokens,
            prompt_tokens: gptResult.promptTokens,
            completion_tokens: gptResult.completionTokens,
          },
        },
        processing_status: "completed" as ProcessingStatus,
        processing_completed_at: new Date().toISOString(),
        cost_llm: costLlm,
      })
      .eq("id", transcriptId);

    if (updateError) {
      throw makePipelineError(
        "save_results",
        `Failed to save results: ${updateError.message}`
      );
    }

    return {
      success: true,
      transcriptId,
      rawTranscript: whisperResult.text,
      clinicalNote: gptResult.content,
      duration: whisperResult.duration,
      costTranscription,
      costLlm,
    };
  } catch (err) {
    // -----------------------------------------------
    // ERROR HANDLING: Mark record as failed
    // -----------------------------------------------
    const pipelineErr = err as PipelineError;
    const errorMessage = pipelineErr.message || "Unknown processing error";
    const failedStep = pipelineErr.step || undefined;

    await supabase
      .from("visit_transcripts")
      .update({
        processing_status: "failed" as ProcessingStatus,
        error_message: errorMessage,
      })
      .eq("id", transcriptId);

    console.error(
      `[Pipeline] Transcription ${transcriptId} failed at step "${failedStep}":`,
      errorMessage
    );

    return {
      success: false,
      transcriptId,
      error: errorMessage,
      errorType: pipelineErr.errorType,
      failedStep,
    };
  }
}

// =====================================================
// RETRY PROCESSING
// =====================================================

/**
 * Retry a failed transcription.
 * Resets the record to "pending" then runs the pipeline.
 */
export async function retryTranscription(
  transcriptId: string
): Promise<PipelineResult> {
  const supabase = await createClient();

  // Reset to pending for pipeline to pick up
  const { error } = await supabase
    .from("visit_transcripts")
    .update({
      processing_status: "pending" as ProcessingStatus,
      error_message: null,
      processing_started_at: null,
      processing_completed_at: null,
    })
    .eq("id", transcriptId)
    .eq("processing_status", "failed"); // Only retry failed

  if (error) {
    return {
      success: false,
      transcriptId,
      error: `Failed to reset transcript for retry: ${error.message}`,
    };
  }

  return runTranscriptionPipeline(transcriptId);
}

// =====================================================
// REGENERATE NOTE ONLY
// =====================================================

/**
 * Regenerate just the clinical note from an existing raw transcript.
 * Useful when the clinician wants a different note format or the
 * first generation was unsatisfactory.
 */
export async function regenerateClinicalNote(
  transcriptId: string
): Promise<PipelineResult> {
  const supabase = await createClient();

  const { data: transcript, error: fetchError } = await supabase
    .from("visit_transcripts")
    .select("*")
    .eq("id", transcriptId)
    .single();

  if (fetchError || !transcript) {
    return {
      success: false,
      transcriptId,
      error: "Transcript record not found",
    };
  }

  if (!transcript.transcript_raw) {
    return {
      success: false,
      transcriptId,
      error: "No raw transcript available to regenerate from",
    };
  }

  // Mark as processing and reset approval fields
  await supabase
    .from("visit_transcripts")
    .update({
      processing_status: "processing" as ProcessingStatus,
      clinician_approved_at: null,
      approved_by: null,
      final_note: null,
      clinician_edited: false,
    })
    .eq("id", transcriptId);

  // Also reset visit-level approval flag
  await supabase
    .from("visits")
    .update({ ai_note_approved: false })
    .eq("id", transcript.visit_id);

  try {
    const gptResult = await generateClinicalNote(transcript.transcript_raw);
    const costLlm = calculateGPTCost(gptResult.totalTokens);

    // Accumulate LLM cost (don't overwrite previous cost)
    const existingLlmCost = (transcript.cost_llm as number) || 0;

    const { error: updateError } = await supabase
      .from("visit_transcripts")
      .update({
        transcript_clinical: gptResult.content,
        transcript_metadata: {
          ...((transcript.transcript_metadata as Record<string, unknown>) ||
            {}),
          gpt: {
            model: gptResult.model,
            total_tokens: gptResult.totalTokens,
            prompt_tokens: gptResult.promptTokens,
            completion_tokens: gptResult.completionTokens,
          },
          regeneration_count:
            (((transcript.transcript_metadata as Record<string, unknown>)
              ?.regeneration_count as number) || 0) + 1,
        },
        processing_status: "completed" as ProcessingStatus,
        processing_completed_at: new Date().toISOString(),
        cost_llm: existingLlmCost + costLlm,
      })
      .eq("id", transcriptId);

    if (updateError) {
      throw new Error(
        `Failed to save regenerated note: ${updateError.message}`
      );
    }

    return {
      success: true,
      transcriptId,
      clinicalNote: gptResult.content,
      costLlm,
    };
  } catch (err) {
    const errorMessage =
      err instanceof Error ? err.message : "Unknown error during regeneration";

    await supabase
      .from("visit_transcripts")
      .update({
        processing_status: "failed" as ProcessingStatus,
        error_message: errorMessage,
      })
      .eq("id", transcriptId);

    return {
      success: false,
      transcriptId,
      error: errorMessage,
    };
  }
}

// =====================================================
// INTERNAL HELPERS
// =====================================================

type PipelineError = {
  message: string;
  step?: PipelineStep;
  errorType?: OpenAIServiceError["type"];
};

function makePipelineError(
  step: PipelineStep,
  message: string,
  errorType?: OpenAIServiceError["type"]
): PipelineError {
  return { message, step, errorType };
}
