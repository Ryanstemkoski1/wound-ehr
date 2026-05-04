// AI Transcription Configuration
// Phase 11.1.2 - OpenAI Whisper + GPT-4 for clinical note generation

// =====================================================
// OPENAI MODEL CONFIGURATION
// =====================================================

export const AI_CONFIG = {
  // Speech-to-text model
  OPENAI_MODEL_WHISPER: "whisper-1" as const,

  // Language model for clinical note generation
  OPENAI_MODEL_GPT: "gpt-4-turbo" as const,

  // Whisper transcription settings
  WHISPER_CONFIG: {
    language: "en",
    response_format: "verbose_json" as const, // Includes timestamps
    temperature: 0, // Most accurate (least creative)
  },

  // GPT-4 note generation settings
  GPT_CONFIG: {
    temperature: 0.3, // Low for medical consistency
    max_tokens: 2000,
    presence_penalty: 0,
    frequency_penalty: 0,
  },

  // Cost tracking (per OpenAI pricing as of March 2026)
  // NOTE: These prices may be outdated. Verify against https://openai.com/pricing
  // before using for billing calculations.
  PRICING: {
    WHISPER_PER_MINUTE: 0.006, // $0.006 per minute
    GPT4_PER_1K_TOKENS: 0.03, // Approximate (input + output)
  },

  // Audio recording constraints
  // NOTE: Whisper API has a 25 MB file size limit
  AUDIO: {
    MAX_FILE_SIZE_BYTES: 25 * 1024 * 1024, // 25 MB (Whisper API limit)
    MAX_DURATION_SECONDS: 3600, // 1 hour
    ALLOWED_MIME_TYPES: [
      "audio/webm",
      "audio/mp4",
      "audio/wav",
      "audio/mpeg",
      "audio/ogg",
    ] as readonly string[],
    STORAGE_BUCKET: "visit-audio" as const,
  },

  // Data retention
  RETENTION: {
    AUDIO_DAYS: 90, // Delete audio files after 90 days
    TRANSCRIPT_DAYS: null, // Permanent (medical record)
    CLINICAL_NOTE_DAYS: null, // Permanent (medical record)
  },

  // System prompt for clinical note generation
  CLINICAL_NOTE_SYSTEM_PROMPT: `You are a medical documentation assistant specializing in wound care.

Your task is to convert conversation transcripts from wound care visits into structured clinical notes.

OUTPUT FORMAT:

CHIEF COMPLAINT:
[Brief statement of why patient is being seen - wound care, specific wound concerns]

WOUND ASSESSMENT:
[For each wound discussed:
- Location (anatomical site)
- Type (pressure injury, diabetic ulcer, surgical wound, etc.)
- Measurements (length x width x depth in cm)
- Wound bed appearance (percentage of tissue types: granulation, slough, necrotic, epithelial)
- Drainage amount and type
- Periwound condition
- Signs of infection (if any)
- Pain level]

TREATMENT PROVIDED:
[Procedures performed during this visit:
- Debridement (type and extent)
- Dressing changes
- NPWT application/changes
- Other wound care interventions]

CLINICAL REASONING:
[Why specific treatments were chosen:
- Response to previous treatment
- Clinical indicators guiding decisions
- Concerns about healing, infection, complications
- Factors affecting wound healing]

PLAN OF CARE:
[Ongoing treatment orders:
- Dressing type and change frequency
- Medications (topical and systemic)
- NPWT settings (if applicable)
- Off-loading or positioning
- Next visit schedule]

PATIENT EDUCATION:
[Topics discussed with patient/caregiver:
- Wound care instructions
- Signs/symptoms to report
- Nutrition and hydration
- Pressure relief or activity modifications]

INSTRUCTIONS:
1. Use proper medical terminology for wound care
2. Be concise but complete
3. Include specific measurements and observations from the transcript
4. Do NOT fabricate information not in the transcript
5. If clinical details are unclear or missing, note as "Not documented"
6. Omit filler words and off-topic conversation
7. Use bullet points for clarity
8. Maintain professional medical documentation tone

Focus on wound care-specific terminology: debridement, granulation tissue, exudate, periwound erythema, epithelialization, undermining, tunneling, slough, eschar, NPWT, hydrocolloid, alginate, foam dressings, etc.`,
} as const;

// =====================================================
// TYPES
// =====================================================

export type ProcessingStatus =
  | "pending"
  | "processing"
  | "completed"
  | "failed"
  | "deleted";

export type TranscriptRecord = {
  id: string;
  visit_id: string;
  audio_url: string | null;
  audio_filename: string | null;
  audio_size_bytes: number | null;
  audio_duration_seconds: number | null;
  transcript_raw: string | null;
  transcript_clinical: string | null;
  transcript_metadata: Record<string, unknown> | null;
  ai_service: string;
  processing_status: ProcessingStatus;
  processing_started_at: string | null;
  processing_completed_at: string | null;
  error_message: string | null;
  clinician_edited: boolean;
  clinician_approved_at: string | null;
  approved_by: string | null;
  final_note: string | null;
  cost_transcription: number | null;
  cost_llm: number | null;
  created_at: string;
  updated_at: string;
};

export type RecordingConsent = {
  id: string;
  patient_id: string;
  consent_given: boolean;
  consent_text: string;
  consent_version: string;
  signature_id: string | null;
  consented_at: string | null;
  expires_at: string | null;
  revoked_at: string | null;
  revoked_reason: string | null;
  // Phase 11.8 — separate consent for third-party AI processing (OpenAI, etc.)
  ai_processing_consent_given: boolean;
  ai_processing_consent_text: string | null;
  ai_processing_consented_at: string | null;
  ai_processing_signature_id: string | null;
  ai_vendor: string | null;
  created_at: string;
  updated_at: string;
};

// =====================================================
// CONSENT FORM TEXT (Version 1.0)
// =====================================================

export const RECORDING_CONSENT_TEXT = `CONSENT FOR AUDIO RECORDING OF MEDICAL VISITS

I hereby consent to have my medical visits audio recorded for the purpose of accurate clinical documentation.

I understand that:

1. RECORDING PURPOSE: Audio recordings will be used solely to create accurate clinical documentation of my wound care visits. Recordings will be transcribed using secure, HIPAA-compliant artificial intelligence technology.

2. CONFIDENTIALITY: All recordings and transcripts are protected health information (PHI) and will be kept strictly confidential in accordance with HIPAA regulations. Only my healthcare team and authorized administrators will have access.

3. STORAGE & RETENTION: Audio recordings will be securely stored for 90 days, after which they will be permanently deleted. Written transcripts and clinical notes will be retained as part of my permanent medical record.

4. ACCESS: I may request to listen to recordings or review transcripts of my visits. I understand that recordings may be used for quality assurance and compliance purposes.

5. VOLUNTARY: This consent is voluntary. I may decline to be recorded without affecting the quality of care I receive. If I decline, my clinician will document my visit using traditional written or typed notes.

6. REVOCATION: I may revoke this consent at any time by notifying my healthcare provider in writing. Revocation will not affect recordings made prior to revocation.

7. NO GUARANTEE: I understand that while recordings improve documentation accuracy, they may occasionally contain technical errors or omissions. My healthcare team will review all AI-generated notes before finalizing them.`;

export const RECORDING_CONSENT_VERSION = "1.0";

// =====================================================
// AI-PROCESSING CONSENT (third-party vendor disclosure)
// =====================================================
//
// HIPAA: separate from recording consent because it authorizes
// transmission of PHI to an external AI vendor (OpenAI). Capture
// alongside recording consent and persist on the same row.

export const AI_PROCESSING_CONSENT_VENDOR = "openai";

export const AI_PROCESSING_CONSENT_TEXT = `CONSENT FOR AI PROCESSING OF AUDIO RECORDINGS

In addition to consenting to be recorded, I authorize my healthcare provider to send audio recordings and the resulting transcripts to a third-party artificial intelligence vendor (currently OpenAI) for the purpose of:

  • Generating verbatim transcripts of my visits;
  • Producing draft clinical notes that my care team will review and edit before they enter my medical record.

I understand that:

1. THIRD-PARTY DISCLOSURE: My audio and transcript text will leave my healthcare provider's systems and be processed by the AI vendor identified above under a Business Associate Agreement (BAA) governing protected health information (PHI).

2. NO TRAINING ON MY DATA: The vendor will not use my recordings or transcripts to train its AI models.

3. DECLINING IS OK: I may consent to recording but DECLINE AI processing. If I decline AI processing, the audio will not be uploaded to the vendor and my clinician will document the visit manually.

4. REVOCATION: I may revoke this AI-processing consent at any time. Revocation will not affect transcripts that were already generated and entered in my medical record.

5. ACCURACY: AI-generated drafts may contain errors. A licensed clinician will review and approve every note before it is finalized.`;

export const AI_PROCESSING_CONSENT_VERSION = "1.0";
