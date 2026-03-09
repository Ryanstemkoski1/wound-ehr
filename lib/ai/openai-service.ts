// OpenAI Service Module
// Phase 11.1.5 - Encapsulated OpenAI API interactions with retry, timeout, and error handling

import { AI_CONFIG } from "@/lib/ai-config";

// =====================================================
// TYPES
// =====================================================

export type WhisperResult = {
  text: string;
  duration: number;
  language: string;
  segments: WhisperSegment[];
};

export type WhisperSegment = {
  id: number;
  start: number;
  end: number;
  text: string;
  avg_logprob: number;
  no_speech_prob: number;
};

export type GPTResult = {
  content: string;
  totalTokens: number;
  promptTokens: number;
  completionTokens: number;
  model: string;
};

export type OpenAIServiceError = {
  type:
    | "auth"
    | "rate_limit"
    | "timeout"
    | "server"
    | "invalid_request"
    | "network"
    | "unknown";
  message: string;
  status?: number;
  retryable: boolean;
};

// =====================================================
// CONFIGURATION
// =====================================================

const OPENAI_BASE_URL = "https://api.openai.com/v1";

/** Default timeout for Whisper (large files can take a while) */
const WHISPER_TIMEOUT_MS = 5 * 60 * 1000; // 5 minutes

/** Default timeout for GPT-4 */
const GPT_TIMEOUT_MS = 2 * 60 * 1000; // 2 minutes

/** Max retries for transient failures */
const MAX_RETRIES = 3;

/** Base delay for exponential backoff (ms) */
const BASE_RETRY_DELAY_MS = 1000;

// =====================================================
// HELPERS
// =====================================================

function getApiKey(): string {
  const key = process.env.OPENAI_API_KEY;
  if (!key) {
    throw createServiceError(
      "auth",
      "OPENAI_API_KEY environment variable is not set. Configure it in .env.local.",
      false
    );
  }
  return key;
}

function createServiceError(
  type: OpenAIServiceError["type"],
  message: string,
  retryable: boolean,
  status?: number
): OpenAIServiceError {
  return { type, message, retryable, status };
}

/**
 * Classify an HTTP error response into a typed error
 */
function classifyHttpError(status: number, body: string): OpenAIServiceError {
  if (status === 401 || status === 403) {
    return createServiceError(
      "auth",
      `OpenAI authentication failed (${status}): ${body}`,
      false,
      status
    );
  }
  if (status === 429) {
    return createServiceError(
      "rate_limit",
      `OpenAI rate limit exceeded. Please wait before retrying. Details: ${body}`,
      true,
      status
    );
  }
  if (status === 400 || status === 422) {
    return createServiceError(
      "invalid_request",
      `OpenAI rejected the request (${status}): ${body}`,
      false,
      status
    );
  }
  if (status >= 500) {
    return createServiceError(
      "server",
      `OpenAI server error (${status}): ${body}`,
      true,
      status
    );
  }
  return createServiceError(
    "unknown",
    `OpenAI HTTP error (${status}): ${body}`,
    status >= 500,
    status
  );
}

/**
 * Exponential backoff with jitter
 */
function getRetryDelay(attempt: number): number {
  const exponentialDelay = BASE_RETRY_DELAY_MS * Math.pow(2, attempt);
  const jitter = Math.random() * BASE_RETRY_DELAY_MS;
  return Math.min(exponentialDelay + jitter, 30_000); // Cap at 30s
}

/**
 * Sleep for a given duration
 */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Fetch with timeout using AbortController
 */
async function fetchWithTimeout(
  url: string,
  options: RequestInit,
  timeoutMs: number
): Promise<Response> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
    });
    return response;
  } catch (err) {
    if (err instanceof DOMException && err.name === "AbortError") {
      throw createServiceError(
        "timeout",
        `Request timed out after ${Math.round(timeoutMs / 1000)}s`,
        true
      );
    }
    throw createServiceError(
      "network",
      `Network error: ${err instanceof Error ? err.message : "Unknown"}`,
      true
    );
  } finally {
    clearTimeout(timeoutId);
  }
}

/**
 * Execute an API call with retry logic
 */
async function withRetry<T>(
  operation: () => Promise<T>,
  maxRetries: number = MAX_RETRIES,
  operationName: string = "OpenAI API call"
): Promise<T> {
  let lastError: OpenAIServiceError | null = null;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await operation();
    } catch (err) {
      const error =
        err && typeof err === "object" && "type" in err
          ? (err as OpenAIServiceError)
          : createServiceError(
              "unknown",
              err instanceof Error ? err.message : "Unknown error",
              false
            );

      lastError = error;

      // Don't retry non-retryable errors
      if (!error.retryable || attempt === maxRetries) {
        throw error;
      }

      const delay = getRetryDelay(attempt);
      console.warn(
        `[AI Service] ${operationName} failed (attempt ${attempt + 1}/${maxRetries + 1}), ` +
          `retrying in ${Math.round(delay / 1000)}s: ${error.message}`
      );
      await sleep(delay);
    }
  }

  throw lastError || createServiceError("unknown", "Retry exhausted", false);
}

// =====================================================
// WHISPER TRANSCRIPTION
// =====================================================

/**
 * Transcribe audio using OpenAI Whisper API
 *
 * @param audioBlob - The audio data as a Blob
 * @param filename - Original filename for the audio
 * @param timeoutMs - Request timeout (default: 5 minutes)
 * @returns Transcription result with text, duration, segments
 */
export async function transcribeAudio(
  audioBlob: Blob,
  filename: string,
  timeoutMs: number = WHISPER_TIMEOUT_MS
): Promise<WhisperResult> {
  const apiKey = getApiKey();

  return withRetry(
    async () => {
      const audioFile = new File([audioBlob], filename, {
        type: audioBlob.type || "audio/webm",
      });

      const formData = new FormData();
      formData.append("file", audioFile);
      formData.append("model", AI_CONFIG.OPENAI_MODEL_WHISPER);
      formData.append("language", AI_CONFIG.WHISPER_CONFIG.language);
      formData.append(
        "response_format",
        AI_CONFIG.WHISPER_CONFIG.response_format
      );
      formData.append(
        "temperature",
        String(AI_CONFIG.WHISPER_CONFIG.temperature)
      );

      const response = await fetchWithTimeout(
        `${OPENAI_BASE_URL}/audio/transcriptions`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${apiKey}`,
          },
          body: formData,
        },
        timeoutMs
      );

      if (!response.ok) {
        const errorBody = await response.text();
        throw classifyHttpError(response.status, errorBody);
      }

      const result = await response.json();

      return {
        text: result.text || "",
        duration: result.duration || 0,
        language: result.language || "en",
        segments: result.segments || [],
      };
    },
    MAX_RETRIES,
    "Whisper transcription"
  );
}

// =====================================================
// GPT-4 CLINICAL NOTE GENERATION
// =====================================================

/**
 * Generate a structured clinical note from a transcript using GPT-4
 *
 * @param rawTranscript - The verbatim transcript text
 * @param additionalContext - Optional extra context (wound history, etc.)
 * @param timeoutMs - Request timeout (default: 2 minutes)
 * @returns Clinical note and token usage
 */
export async function generateClinicalNote(
  rawTranscript: string,
  additionalContext?: string,
  timeoutMs: number = GPT_TIMEOUT_MS
): Promise<GPTResult> {
  const apiKey = getApiKey();

  if (!rawTranscript.trim()) {
    throw createServiceError(
      "invalid_request",
      "Cannot generate clinical note from empty transcript",
      false
    );
  }

  return withRetry(
    async () => {
      let userMessage = `Please convert this wound care visit transcript into a structured clinical note:\n\n${rawTranscript}`;

      if (additionalContext) {
        userMessage += `\n\nAdditional context:\n${additionalContext}`;
      }

      const response = await fetchWithTimeout(
        `${OPENAI_BASE_URL}/chat/completions`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${apiKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: AI_CONFIG.OPENAI_MODEL_GPT,
            messages: [
              {
                role: "system",
                content: AI_CONFIG.CLINICAL_NOTE_SYSTEM_PROMPT,
              },
              {
                role: "user",
                content: userMessage,
              },
            ],
            temperature: AI_CONFIG.GPT_CONFIG.temperature,
            max_tokens: AI_CONFIG.GPT_CONFIG.max_tokens,
            presence_penalty: AI_CONFIG.GPT_CONFIG.presence_penalty,
            frequency_penalty: AI_CONFIG.GPT_CONFIG.frequency_penalty,
          }),
        },
        timeoutMs
      );

      if (!response.ok) {
        const errorBody = await response.text();
        throw classifyHttpError(response.status, errorBody);
      }

      const result = await response.json();
      const content = result.choices?.[0]?.message?.content || "";

      if (!content) {
        throw createServiceError(
          "server",
          "GPT-4 returned empty response",
          true
        );
      }

      return {
        content,
        totalTokens: result.usage?.total_tokens || 0,
        promptTokens: result.usage?.prompt_tokens || 0,
        completionTokens: result.usage?.completion_tokens || 0,
        model: result.model || AI_CONFIG.OPENAI_MODEL_GPT,
      };
    },
    MAX_RETRIES,
    "GPT-4 clinical note generation"
  );
}

// =====================================================
// COST CALCULATION
// =====================================================

/**
 * Calculate Whisper transcription cost
 */
export function calculateWhisperCost(durationSeconds: number): number {
  return (durationSeconds / 60) * AI_CONFIG.PRICING.WHISPER_PER_MINUTE;
}

/**
 * Calculate GPT-4 cost
 */
export function calculateGPTCost(totalTokens: number): number {
  return (totalTokens / 1000) * AI_CONFIG.PRICING.GPT4_PER_1K_TOKENS;
}

/**
 * Calculate total processing cost
 */
export function calculateTotalCost(
  durationSeconds: number,
  totalTokens: number
): number {
  return calculateWhisperCost(durationSeconds) + calculateGPTCost(totalTokens);
}

// =====================================================
// VALIDATION
// =====================================================

/**
 * Validate that the OpenAI API key is configured and functional
 * Performs a lightweight models list request
 */
export async function validateApiKey(): Promise<{
  valid: boolean;
  error?: string;
}> {
  try {
    const apiKey = getApiKey();

    const response = await fetchWithTimeout(
      `${OPENAI_BASE_URL}/models/${AI_CONFIG.OPENAI_MODEL_WHISPER}`,
      {
        method: "GET",
        headers: {
          Authorization: `Bearer ${apiKey}`,
        },
      },
      10_000 // 10s timeout for validation
    );

    if (response.ok) {
      return { valid: true };
    }

    const body = await response.text();
    const error = classifyHttpError(response.status, body);
    return { valid: false, error: error.message };
  } catch (err) {
    const message =
      err && typeof err === "object" && "message" in err
        ? (err as { message: string }).message
        : "Unknown error";
    return { valid: false, error: message };
  }
}
