# AI Transcription Service Research & Architecture Design

**Phase:** 11.1.1 - Research & Architecture  
**Date:** March 7, 2026  
**Status:** ✅ APPROVED — Client selected OpenAI Whisper API + GPT-4 (direct API)  
**Objective:** Identify HIPAA-compliant AI solution and design system architecture

---

## Table of Contents

1. [Research Criteria](#research-criteria)
2. [Medical-Specific AI Services](#medical-specific-ai-services)
3. [General AI Services with BAA](#general-ai-services-with-baa)
4. [Feature Comparison Matrix](#feature-comparison-matrix)
5. [Cost Analysis](#cost-analysis)
6. [Recommended Solution](#recommended-solution)
7. [System Architecture](#system-architecture)
8. [Legal & Compliance Requirements](#legal--compliance-requirements)
9. [Implementation Plan](#implementation-plan)

---

## Research Criteria

### Must-Have Requirements

1. **HIPAA Compliance**
   - ✅ Business Associate Agreement (BAA) available
   - ✅ Encrypted at rest and in transit (minimum AES-256)
   - ✅ PHI handling compliant with HIPAA Security Rule
   - ✅ Audit logging for all PHI access
   - ✅ Data residency within United States

2. **Technical Requirements**
   - ✅ Medical terminology recognition (wound care, procedures, medications)
   - ✅ API-based integration (REST or SDK)
   - ✅ Real-time or near-real-time transcription (< 5 minutes)
   - ✅ Support for audio formats: WebM, MP4, WAV
   - ✅ Accuracy: 95%+ for medical conversations

3. **Business Requirements**
   - ✅ Predictable pricing (per-minute or per-hour)
   - ✅ Scalable to 100+ visits/month
   - ✅ Vendor reliability and uptime (99%+ SLA)
   - ✅ Good documentation and developer support

### Nice-to-Have Features

- Speaker diarization (distinguish patient vs. clinician)
- Custom medical vocabulary training
- Multiple language support (Spanish for patient conversations)
- Low latency (< 1 minute for transcription)
- Built-in clinical note structuring (not just raw transcript)

---

## Medical-Specific AI Services

### 1. AWS HealthScribe

**Overview:** AWS's purpose-built service for healthcare clinical documentation

**Key Features:**

- ✅ HIPAA-compliant (BAA available)
- ✅ Medical conversation analysis with clinical note generation
- ✅ Automatic section detection (Chief Complaint, Assessment, Plan)
- ✅ Medication and diagnosis extraction
- ✅ Speaker separation (patient vs. provider)
- ✅ Integration with AWS ecosystem (S3, Lambda, CloudWatch)

**Technical Specs:**

- Input formats: MP3, MP4, WAV, FLAC, WebM
- Processing time: Near real-time (streaming) or batch
- Medical vocabulary: Built-in medical terminology from UMLS
- Languages: English (primary), limited Spanish support
- API: AWS SDK (Node.js, Python)

**Pricing:**

- $0.144 per conversation minute (structured clinical notes)
- $0.07 per conversation minute (transcription only)
- Average 15-min visit with clinical notes: $2.16
- 100 visits/month: ~$216/month

**HIPAA Compliance:**

- ✅ BAA signing process via AWS Artifact
- ✅ PHI protected, encrypted end-to-end
- ✅ Audit logs via CloudTrail
- ✅ Data stored in US regions

**Pros:**

- Purpose-built for clinical documentation
- Automatic clinical note structuring (saves LLM step)
- Integrated with AWS (we're already using AWS for some services)
- High accuracy for medical terminology
- Speaker diarization included

**Cons:**

- Most expensive option
- AWS vendor lock-in
- Requires AWS account setup and IAM configuration
- Limited to English primarily

**Recommendation Score:** ⭐⭐⭐⭐⭐ (5/5) - Best fit for medical use case

---

### 2. Nuance Dragon Medical One

**Overview:** Industry-leading medical speech recognition (Microsoft-owned)

**Key Features:**

- ✅ HIPAA-compliant (BAA available)
- ✅ 99%+ accuracy for medical terminology
- ✅ Extensive medical vocabulary (500,000+ terms)
- ✅ Real-time transcription
- ✅ Cloud-based or on-premise options

**Technical Specs:**

- Input: Real-time audio streaming or uploaded files
- Processing: Real-time (< 1 second latency)
- Medical vocabulary: Most comprehensive in industry
- Languages: English, limited other languages
- API: PowerMic Mobile SDK, REST API

**Pricing:**

- Licensing model (not per-minute)
- Estimated: $500-1,500 per clinician per year
- May not be cost-effective for our use case (pay per user, not per usage)

**HIPAA Compliance:**

- ✅ BAA available (Microsoft Azure platform)
- ✅ Healthcare-grade encryption
- ✅ Audit trails and compliance reports

**Pros:**

- Best-in-class accuracy (99%+)
- Trusted by major hospital systems
- Comprehensive medical vocabulary
- Real-time performance

**Cons:**

- Expensive licensing model (not usage-based)
- Overkill for our wound care niche
- Requires significant integration effort
- Per-user licensing doesn't fit our model

**Recommendation Score:** ⭐⭐⭐ (3/5) - Excellent but expensive for our use case

---

### 3. Suki AI

**Overview:** AI assistant specifically designed for physicians

**Key Features:**

- ✅ HIPAA-compliant
- ✅ Ambient listening (background recording during patient visit)
- ✅ Automatic clinical note generation
- ✅ EHR integration capabilities
- ✅ Mobile app available

**Technical Specs:**

- Input: Real-time mobile app recording
- Processing: Cloud-based AI processing
- Medical vocabulary: Specialty-specific (can customize)
- Languages: English
- API: Limited (primarily mobile app focused)

**Pricing:**

- Subscription model: ~$399/month per clinician
- Not per-usage pricing
- Includes mobile app and support

**HIPAA Compliance:**

- ✅ BAA available
- ✅ Encrypted PHI handling
- ✅ Compliant with HIPAA/HITECH

**Pros:**

- Purpose-built for physicians
- Ambient listening (hands-free)
- Good mobile experience
- Clinical note quality high

**Cons:**

- Subscription per clinician (expensive for small practices)
- Limited API for custom integration
- Designed as standalone app (hard to embed in our system)
- Per-user cost doesn't scale well

**Recommendation Score:** ⭐⭐ (2/5) - Good product but not designed for embedded use

---

### 4. DeepScribe

**Overview:** Ambient AI scribe for medical documentation

**Key Features:**

- ✅ HIPAA-compliant
- ✅ Real-time ambient listening
- ✅ Automatic SOAP note generation
- ✅ Integration with major EHRs
- ✅ Mobile and web apps

**Technical Specs:**

- Input: Mobile app or web browser
- Processing: Real-time cloud processing
- Medical vocabulary: Specialty-trained models
- Languages: English
- API: Limited public API

**Pricing:**

- Subscription: $149-$399/month per provider
- Enterprise pricing available
- Not usage-based

**HIPAA Compliance:**

- ✅ BAA standard with subscription
- ✅ SOC 2 Type II certified
- ✅ End-to-end encryption

**Pros:**

- Affordable compared to Nuance
- Good note quality
- Easy to use (mobile-first)

**Cons:**

- Per-provider subscription (not usage-based)
- Limited API for custom workflows
- Designed as standalone product
- Hard to white-label into our app

**Recommendation Score:** ⭐⭐ (2/5) - Good but not suitable for embedded integration

---

### 5. Abridge

**Overview:** Medical conversation AI for patient-clinician visits

**Key Features:**

- ✅ HIPAA-compliant
- ✅ Real-time transcription and summarization
- ✅ Patient-friendly summaries (can share with patients)
- ✅ Integration with Epic, Cerner, Athena

**Technical Specs:**

- Input: Mobile app recording
- Processing: Cloud-based
- Medical vocabulary: Strong
- Languages: English
- API: Limited

**Pricing:**

- Subscription model (provider-based pricing)
- Not publicly disclosed (enterprise sales)

**HIPAA Compliance:**

- ✅ BAA available
- ✅ HIPAA/HITECH compliant

**Pros:**

- Patient engagement focus (unique)
- High-quality summaries
- Good mobile UX

**Cons:**

- Subscription-based, not usage-based
- Limited API documentation
- Enterprise sales process (not self-serve)

**Recommendation Score:** ⭐⭐ (2/5) - Good but not designed for our integration model

---

## General AI Services with BAA

### 6. OpenAI Whisper API + GPT-4

**Overview:** Combine OpenAI's speech-to-text (Whisper) with GPT-4 for clinical note generation via OpenAI's API directly, with BAA and zero data retention for HIPAA compliance.

**Key Features:**

- ✅ HIPAA-compliant (BAA available for OpenAI API with zero data retention)
- ✅ Whisper: State-of-the-art speech recognition
- ✅ GPT-4: Best-in-class language model for note synthesis
- ✅ Flexible API for custom workflows
- ✅ Excellent documentation

**Technical Specs:**

- Whisper API: Audio → text transcription
- GPT-4 API: Transcript → structured clinical note
- Input formats: MP3, MP4, WAV, WebM, M4A, FLAC
- Processing: Asynchronous (< 1-2 minutes for 15-min audio)
- Languages: 99+ languages (excellent for Spanish)
- API: REST API, official SDKs (Node.js, Python)

**Pricing:**

- Whisper: $0.006 per minute ($0.36 per hour)
- GPT-4: ~$0.03 per 1,000 tokens (estimate $0.20 per clinical note)
- **Total per 15-min visit: $0.09 (Whisper) + $0.20 (GPT-4) = $0.29**
- **100 visits/month: ~$29/month**

**HIPAA Compliance:**

- ✅ BAA available for OpenAI API customers (request via OpenAI sales/trust portal)
- ✅ Zero data retention enabled by default for API usage; must verify setting is active
- ✅ Encrypted at rest and in transit
- ✅ SOC 2 Type II certified

**Pros:**

- **Most cost-effective:** ~$0.29 per visit (vs. $2.16 for AWS)
- Highly flexible (custom prompts for note structure)
- Excellent API documentation and SDKs
- Best language model (GPT-4) for clinical reasoning
- Multi-language support (Spanish for patients)
- No vendor lock-in (can switch)

**Cons:**

- BAA requires contacting OpenAI sales (not self-service)
- Two-step process (transcription then note generation)
- Not purpose-built for medical (requires custom prompting)
- Need to handle medical vocabulary ourselves
- Zero data retention must be verified as active before processing PHI

**Recommendation Score:** ⭐⭐⭐⭐ (4/5) - Best cost/flexibility balance

---

### 7. Google Cloud Speech-to-Text (Healthcare)

**Overview:** Google's medical speech recognition with PHI support

**Key Features:**

- ✅ HIPAA-compliant (BAA available)
- ✅ Medical speech recognition models
- ✅ Integration with Google Cloud Healthcare API
- ✅ Real-time and batch transcription

**Technical Specs:**

- Input formats: Linear16, FLAC, WebM, MP3
- Processing: Streaming or batch
- Medical models: Available (US English)
- Languages: 125+ languages
- API: gRPC and REST

**Pricing:**

- Enhanced medical model: $0.024 per minute ($1.44 per hour)
- 15-min visit: $0.36
- Need to add LLM for note generation (Vertex AI / Gemini)
- Total estimate: ~$0.60 per visit
- 100 visits/month: ~$60/month

**HIPAA Compliance:**

- ✅ BAA automatic with Google Cloud Healthcare API
- ✅ PHI-safe storage
- ✅ Audit logging via Cloud Logging

**Pros:**

- Google Cloud ecosystem integration
- Medical models available
- Good accuracy and reliability
- Multi-language support

**Cons:**

- More expensive than OpenAI ($0.60 vs $0.29)
- Requires Google Cloud setup
- Medical model pricing higher than standard
- Still need LLM for clinical note (additional cost)

**Recommendation Score:** ⭐⭐⭐ (3/5) - Good but more expensive than OpenAI

---

### 8. Microsoft Azure Speech Services (Healthcare)

**Overview:** Azure's speech-to-text with healthcare compliance

**Key Features:**

- ✅ HIPAA-compliant (BAA available)
- ✅ Medical terminology support
- ✅ Custom vocabulary training
- ✅ Integration with Azure Health Data Services

**Technical Specs:**

- Input: WAV, MP3, Opus, WebM
- Processing: Real-time or batch
- Languages: 100+ languages
- API: REST and SDK

**Pricing:**

- Standard: $0.01667 per minute ($1 per hour)
- 15-min visit: $0.25
- Azure OpenAI for note generation: ~$0.20
- Total: ~$0.45 per visit
- 100 visits/month: ~$45/month

**HIPAA Compliance:**

- ✅ BAA available
- ✅ Azure for Healthcare cloud
- ✅ PHI encryption and compliance

**Pros:**

- Microsoft ecosystem (if already using Azure)
- Custom vocabulary training
- Azure OpenAI integration (GPT-4)
- Good pricing

**Cons:**

- Requires Azure account and configuration
- Vendor lock-in
- Complexity of Azure setup
- Not specialized for medical conversations

**Recommendation Score:** ⭐⭐⭐ (3/5) - Solid option if already on Azure

---

### 9. AssemblyAI Medical Transcription

**Overview:** AI transcription with medical vocabulary support

**Key Features:**

- ✅ HIPAA-compliant (BAA available)
- ✅ Medical vocabulary add-on
- ✅ Speaker diarization
- ✅ Real-time and batch options
- ✅ Simple REST API

**Technical Specs:**

- Input: Any audio format (auto-detected)
- Processing: Async (typically 15-30% of audio duration)
- Medical vocabulary: Optional add-on ($0.007/min additional)
- Languages: English (primary)
- API: REST API, webhooks for async

**Pricing:**

- Core transcription: $0.00025 per second ($0.015 per minute)
- Medical vocabulary: +$0.007 per minute
- Total: $0.022 per minute ($1.32 per hour)
- 15-min visit: $0.33 (transcription + medical)
- Add GPT-4 for note: +$0.20
- **Total: ~$0.53 per visit**
- 100 visits/month: ~$53/month

**HIPAA Compliance:**

- ✅ BAA available (self-service sign-up)
- ✅ SOC 2 Type II certified
- ✅ Zero data retention option
- ✅ Encrypted PHI handling

**Pros:**

- Easy to get started (self-service)
- Good documentation
- Medical vocabulary add-on
- Reasonable pricing
- Speaker diarization included

**Cons:**

- Still need LLM for clinical note (two steps)
- Not purpose-built for healthcare
- English-only for medical vocabulary

**Recommendation Score:** ⭐⭐⭐⭐ (4/5) - Easy integration, good pricing

---

## Feature Comparison Matrix

| Service                             | BAA | Medical Vocab | Cost/Visit         | Processing Time | API Quality | Integration Effort | Overall Score |
| ----------------------------------- | --- | ------------- | ------------------ | --------------- | ----------- | ------------------ | ------------- |
| **AWS HealthScribe**                | ✅  | ✅✅✅        | $2.16              | 1-2 min         | ⭐⭐⭐⭐    | Medium             | ⭐⭐⭐⭐⭐    |
| **Nuance Dragon**                   | ✅  | ✅✅✅        | High (licensing)   | Real-time       | ⭐⭐⭐      | High               | ⭐⭐⭐        |
| **Suki AI**                         | ✅  | ✅✅          | $399/clinician     | Real-time       | ⭐⭐        | High               | ⭐⭐          |
| **DeepScribe**                      | ✅  | ✅✅          | $149-399/clinician | Real-time       | ⭐⭐        | High               | ⭐⭐          |
| **Abridge**                         | ✅  | ✅✅          | Enterprise pricing | Real-time       | ⭐⭐        | High               | ⭐⭐          |
| **OpenAI API (Whisper + GPT-4)** ✅ | ✅  | ✅            | **$0.29**          | 1-2 min         | ⭐⭐⭐⭐⭐  | **Low**            | ⭐⭐⭐⭐      |
| **Google Cloud**                    | ✅  | ✅✅          | $0.60              | 1-2 min         | ⭐⭐⭐⭐    | Medium             | ⭐⭐⭐        |
| **Azure Speech**                    | ✅  | ✅✅          | $0.45              | 1-2 min         | ⭐⭐⭐⭐    | Medium             | ⭐⭐⭐        |
| **AssemblyAI**                      | ✅  | ✅            | $0.53              | 1-2 min         | ⭐⭐⭐⭐    | **Low**            | ⭐⭐⭐⭐      |

**Legend:**

- ✅ = Supported
- ✅✅ = Strong support
- ✅✅✅ = Industry-leading
- Cost/Visit = Estimated for 15-minute patient encounter

---

## Cost Analysis

### Usage Projection

**Current State:**

- Expected visits/month: 100 (conservative estimate)
- Average visit duration: 15 minutes
- Total audio hours/month: 25 hours

**Growth Projection (12 months):**

- Expected visits/month: 300-500
- Total audio hours/month: 75-125 hours

### Total Cost of Ownership (TCO) - First Year

| Service                 | Month 1-6 (100 visits/mo) | Month 7-12 (300 visits/mo) | Year 1 Total | Notes                      |
| ----------------------- | ------------------------- | -------------------------- | ------------ | -------------------------- |
| **AWS HealthScribe**    | $216/mo × 6 = $1,296      | $648/mo × 6 = $3,888       | **$5,184**   | All-in-one solution        |
| **OpenAI API** ✅       | $29/mo × 6 = $174         | $87/mo × 6 = $522          | **$696**     | Pay-as-you-go, lowest cost |
| **AssemblyAI + OpenAI** | $53/mo × 6 = $318         | $159/mo × 6 = $954         | **$1,272**   | Two services               |
| **Google Cloud**        | $60/mo × 6 = $360         | $180/mo × 6 = $1,080       | **$1,440**   | Plus LLM costs             |

**Winner: OpenAI Whisper + GPT-4** — Lowest TCO at scale. **Client approved March 7, 2026.**

---

## Recommended Solution

### 🏆 SELECTED: OpenAI Whisper API + GPT-4 (Direct API)

> **Decision:** Client approved OpenAI API direct on March 7, 2026. No Azure deployment needed.

**Rationale:**

1. **Cost-Effectiveness:**
   - $0.29 per visit vs. $2.16 (AWS) = **87% cost savings**
   - Year 1 TCO: $696 vs. $5,184 (AWS) = **$4,488 savings**

2. **Flexibility:**
   - Custom prompt engineering for wound care terminology
   - Full control over note structure and formatting
   - Can fine-tune prompts based on client feedback
   - No vendor lock-in (easy to switch if needed)

3. **Technical Excellence:**
   - GPT-4 = Best language model for clinical reasoning
   - Whisper = State-of-the-art speech recognition
   - Excellent API documentation and SDKs
   - Multi-language support (Spanish for patient conversations)

4. **Integration Simplicity:**
   - REST API (easy to integrate with Next.js)
   - Official Node.js SDK available
   - Async processing fits our workflow
   - Webhooks not needed (simple polling)

5. **HIPAA Compliance:**
   - BAA available via OpenAI API (request through trust portal)
   - Zero data retention enabled for API (critical — must verify)
   - SOC 2 Type II certified
   - Proven track record with healthcare customers

**Implementation Approach:**

```typescript
// Step 1: Transcribe audio with Whisper
const transcription = await openai.audio.transcriptions.create({
  file: audioFile,
  model: "whisper-1",
  language: "en",
  response_format: "verbose_json", // Includes timestamps
});

// Step 2: Generate clinical note with GPT-4
const completion = await openai.chat.completions.create({
  model: "gpt-4-turbo",
  messages: [
    {
      role: "system",
      content: CLINICAL_NOTE_SYSTEM_PROMPT, // Custom wound care prompt
    },
    {
      role: "user",
      content: `Transcript: ${transcription.text}`,
    },
  ],
  temperature: 0.3, // Lower for medical consistency
});

const clinicalNote = completion.choices[0].message.content;
```

### 🥈 FALLBACK: AWS HealthScribe

**Use Case:** If client prefers all-in-one solution or already using AWS infrastructure

**Pros:**

- Purpose-built for medical documentation
- Automatic clinical note structuring
- Built-in medical vocabulary
- No prompt engineering needed

**Cons:**

- 7.4x more expensive ($2.16 vs $0.29 per visit)
- AWS vendor lock-in
- Less flexible for customization

**Recommendation:** Start with OpenAI, keep AWS as fallback if accuracy issues arise.

---

## System Architecture

### High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                         WOUND EHR WEB APP                        │
│                     (Next.js 16 + React 19)                      │
└─────────────────────────────────────────────────────────────────┘
                                  │
                                  │
          ┌───────────────────────┼───────────────────────┐
          │                       │                       │
          ▼                       ▼                       ▼
┌──────────────────┐   ┌──────────────────┐   ┌──────────────────┐
│ Browser Audio    │   │  Supabase        │   │  OpenAI API      │
│ Recording        │   │  Storage         │   │  (Whisper +      │
│ (MediaRecorder)  │   │                  │   │   GPT-4)         │
└──────────────────┘   └──────────────────┘   └──────────────────┘
          │                       │                       │
          │ WebM audio            │ Signed URL            │ Audio file
          │                       │                       │
          └──────────►┌───────────▼───────────┐          │
                      │   Upload Audio to     │          │
                      │   visit-audio/        │          │
                      │   {visitId}/file.webm │          │
                      └───────────┬───────────┘          │
                                  │                       │
                                  │ Trigger               │
                                  ▼                       │
                      ┌───────────────────────┐          │
                      │  Server Action        │          │
                      │  processTranscription │          │
                      └───────────┬───────────┘          │
                                  │                       │
                                  │                       │
                    ┌─────────────┼─────────────┐         │
                    │             │             │         │
                    ▼             ▼             ▼         ▼
           ┌─────────────┐ ┌──────────┐ ┌──────────────────┐
           │ 1. Download │ │ 2. Send  │ │ 3. Send transcript│
           │    audio    │ │    to    │ │    to GPT-4 for   │
           │    from     │ │  Whisper │ │    clinical note  │
           │   Storage   │ │    API   │ │    synthesis      │
           └─────────────┘ └──────────┘ └──────────────────┘
                    │             │             │
                    └─────────────┼─────────────┘
                                  │
                                  ▼
                      ┌───────────────────────┐
                      │  Save to Database:    │
                      │  - Raw transcript     │
                      │  - Clinical note      │
                      │  - Processing status  │
                      │  - Metadata          │
                      └───────────┬───────────┘
                                  │
                                  ▼
                      ┌───────────────────────┐
                      │  Notify Clinician     │
                      │  (Toast + In-app      │
                      │   notification)       │
                      └───────────────────────┘
```

### Component Architecture

#### 1. Frontend Components

**AudioRecorder Component** (`components/visits/audio-recorder.tsx`)

```typescript
interface AudioRecorderProps {
  visitId: string;
  patientId: string;
  onRecordingComplete: (audioBlob: Blob) => void;
}

// Features:
// - MediaRecorder API for browser recording
// - Real-time waveform visualization (canvas)
// - Duration timer (MM:SS)
// - Audio level meter (ensure good input)
// - Pause/resume functionality
// - Discard recording option
```

**AITranscriptReview Component** (`components/visits/ai-transcript-review.tsx`)

```typescript
interface AITranscriptReviewProps {
  transcriptId: string;
  rawTranscript: string;
  clinicalNote: string;
  onApprove: (editedNote: string) => void;
  onDiscard: () => void;
}

// Features:
// - Split-screen or tabbed view (AI draft vs. editable)
// - Rich text editor (TipTap or similar)
// - Diff highlighting for edits
// - Section headers (Chief Complaint, Assessment, Plan)
// - Accept / Edit & Approve / Discard / Regenerate actions
```

#### 2. Database Schema

**Migration 00027: AI Transcription Tables**

```sql
-- Visit transcripts table
CREATE TABLE visit_transcripts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  visit_id UUID NOT NULL REFERENCES visits(id) ON DELETE CASCADE,

  -- Audio file metadata
  audio_url TEXT, -- Supabase Storage URL
  audio_filename TEXT,
  audio_size_bytes INTEGER,
  audio_duration_seconds INTEGER,

  -- Transcription data
  transcript_raw TEXT, -- Full verbatim transcript from Whisper
  transcript_clinical TEXT, -- AI-generated clinical note from GPT-4
  transcript_metadata JSONB, -- Timestamps, speaker labels (future)

  -- Processing status
  ai_service TEXT DEFAULT 'openai', -- Which service used
  processing_status TEXT DEFAULT 'pending'
    CHECK (processing_status IN ('pending', 'processing', 'completed', 'failed', 'deleted')),
  processing_started_at TIMESTAMPTZ,
  processing_completed_at TIMESTAMPTZ,
  error_message TEXT,

  -- Clinician actions
  clinician_edited BOOLEAN DEFAULT FALSE, -- Did clinician modify AI note?
  clinician_approved_at TIMESTAMPTZ,
  approved_by UUID REFERENCES auth.users(id),
  final_note TEXT, -- Final clinician-approved version (may differ from AI draft)

  -- Costs tracking (optional)
  cost_transcription DECIMAL(10, 4), -- Cost in USD
  cost_llm DECIMAL(10, 4),

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_visit_transcripts_visit_id ON visit_transcripts(visit_id);
CREATE INDEX idx_visit_transcripts_status ON visit_transcripts(processing_status);
CREATE INDEX idx_visit_transcripts_created_at ON visit_transcripts(created_at DESC);

-- Patient recording consent
CREATE TABLE patient_recording_consents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,

  -- Consent details
  consent_given BOOLEAN NOT NULL DEFAULT FALSE,
  consent_text TEXT NOT NULL, -- Full consent form text shown to patient
  consent_version TEXT NOT NULL DEFAULT '1.0', -- Track consent form versions

  -- Signature
  signature_id UUID REFERENCES signatures(id), -- Link to existing signature system
  consented_at TIMESTAMPTZ,

  -- Expiration and revocation
  expires_at TIMESTAMPTZ, -- Optional: annual renewal
  revoked_at TIMESTAMPTZ,
  revoked_reason TEXT,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(patient_id) -- One active consent per patient
);

CREATE INDEX idx_patient_recording_consents_patient_id ON patient_recording_consents(patient_id);
CREATE INDEX idx_patient_recording_consents_active ON patient_recording_consents(consent_given, revoked_at);

-- Add AI transcript flag to visits table
ALTER TABLE visits
ADD COLUMN has_ai_transcript BOOLEAN DEFAULT FALSE,
ADD COLUMN ai_transcript_id UUID REFERENCES visit_transcripts(id),
ADD COLUMN clinician_notes_manual TEXT; -- For clinicians who opt out of AI

-- Row Level Security
ALTER TABLE visit_transcripts ENABLE ROW LEVEL SECURITY;
ALTER TABLE patient_recording_consents ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Only assigned clinician and admins can access transcripts
CREATE POLICY "Users can access their visit transcripts"
ON visit_transcripts FOR ALL
USING (
  -- Admins can access all
  auth.uid() IN (
    SELECT user_id FROM user_roles WHERE role IN ('tenant_admin', 'facility_admin')
  )
  OR
  -- Assigned clinician can access
  auth.uid() IN (
    SELECT primary_clinician_id FROM visits WHERE id = visit_transcripts.visit_id
  )
  OR
  -- Visit creator can access
  auth.uid() = (SELECT created_by FROM visits WHERE id = visit_transcripts.visit_id)
);

-- RLS Policy: Users can manage consents for their facility's patients
CREATE POLICY "Users can manage recording consents for their patients"
ON patient_recording_consents FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM patients p
    INNER JOIN user_facilities uf ON p.facility_id = uf.facility_id
    WHERE p.id = patient_recording_consents.patient_id
    AND uf.user_id = auth.uid()
  )
);
```

#### 3. Supabase Storage Configuration

**Bucket:** `visit-audio`

```typescript
// Storage configuration
const STORAGE_CONFIG = {
  bucket: 'visit-audio',
  visibility: 'private', // Not publicly accessible
  allowedMimeTypes: [
    'audio/webm',
    'audio/mp4',
    'audio/wav',
    'audio/mpeg',
    'audio/ogg',
  ],
  maxFileSize: 500 * 1024 * 1024, // 500 MB (1 hour at 128kbps)
  folderStructure: '{visitId}/{timestamp}_{filename}',
};

// RLS Policy for storage
// Only assigned clinician + admins can access audio files
CREATE POLICY "Audio files are private"
ON storage.objects FOR ALL
USING (
  bucket_id = 'visit-audio' AND (
    -- Admin access
    auth.uid() IN (
      SELECT user_id FROM user_roles WHERE role IN ('tenant_admin', 'facility_admin')
    )
    OR
    -- Clinician access to their visits
    auth.uid() IN (
      SELECT primary_clinician_id FROM visits
      WHERE id::text = (storage.foldername(name))[1]
    )
  )
);
```

#### 4. Server Actions

**File:** `app/actions/ai-transcription.ts`

```typescript
"use server";

import { createClient } from "@/lib/supabase/server";
import OpenAI from "openai";
import { AI_CONFIG } from "@/lib/ai-config";

// Initialize OpenAI client (BAA signed, zero data retention verified)
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY!,
  organization: process.env.OPENAI_ORG_ID,
});

/**
 * Upload audio file to Supabase Storage
 */
export async function uploadVisitAudio(
  visitId: string,
  audioBlob: Blob,
  fileName: string
) {
  const supabase = await createClient();

  // Verify user has access to this visit
  const { data: visit } = await supabase
    .from("visits")
    .select("id, primary_clinician_id")
    .eq("id", visitId)
    .single();

  if (!visit) throw new Error("Visit not found");

  // Upload to storage
  const timestamp = Date.now();
  const filePath = `${visitId}/${timestamp}_${fileName}`;

  const { data: uploadData, error: uploadError } = await supabase.storage
    .from("visit-audio")
    .upload(filePath, audioBlob, {
      contentType: audioBlob.type,
      upsert: false,
    });

  if (uploadError) throw uploadError;

  // Create transcript record
  const { data: transcript, error: transcriptError } = await supabase
    .from("visit_transcripts")
    .insert({
      visit_id: visitId,
      audio_url: uploadData.path,
      audio_filename: fileName,
      audio_size_bytes: audioBlob.size,
      processing_status: "pending",
    })
    .select()
    .single();

  if (transcriptError) throw transcriptError;

  // Update visit record
  await supabase
    .from("visits")
    .update({
      has_ai_transcript: true,
      ai_transcript_id: transcript.id,
    })
    .eq("id", visitId);

  return transcript;
}

/**
 * Process audio transcription and generate clinical note
 */
export async function processTranscription(transcriptId: string) {
  const supabase = await createClient();

  // Update status to processing
  await supabase
    .from("visit_transcripts")
    .update({
      processing_status: "processing",
      processing_started_at: new Date().toISOString(),
    })
    .eq("id", transcriptId);

  try {
    // Fetch transcript record
    const { data: transcript } = await supabase
      .from("visit_transcripts")
      .select("*, visits(patient_id)")
      .eq("id", transcriptId)
      .single();

    if (!transcript) throw new Error("Transcript not found");

    // Download audio file from storage
    const { data: audioFile } = await supabase.storage
      .from("visit-audio")
      .download(transcript.audio_url);

    if (!audioFile) throw new Error("Audio file not found");

    // Step 1: Transcribe with Whisper
    const transcription = await openai.audio.transcriptions.create({
      file: audioFile,
      model: "whisper-1",
      language: "en", // Can detect automatically
      response_format: "verbose_json", // Includes timestamps
      temperature: 0, // Most accurate (less creative)
    });

    const costTranscription = (transcript.audio_duration_seconds / 60) * 0.006;

    // Step 2: Generate clinical note with GPT-4
    const completion = await openai.chat.completions.create({
      model: "gpt-4-turbo", // Latest model
      messages: [
        {
          role: "system",
          content: AI_CONFIG.CLINICAL_NOTE_SYSTEM_PROMPT,
        },
        {
          role: "user",
          content: `Please generate a structured clinical note from this wound care visit transcript:\n\n${transcription.text}`,
        },
      ],
      temperature: 0.3, // Lower for medical consistency
      max_tokens: 2000,
    });

    const clinicalNote = completion.choices[0].message.content;
    const costLLM = (completion.usage.total_tokens / 1000) * 0.03; // Approx GPT-4 cost

    // Save results
    await supabase
      .from("visit_transcripts")
      .update({
        transcript_raw: transcription.text,
        transcript_clinical: clinicalNote,
        transcript_metadata: {
          duration: transcription.duration,
          language: transcription.language,
        },
        processing_status: "completed",
        processing_completed_at: new Date().toISOString(),
        cost_transcription: costTranscription,
        cost_llm: costLLM,
      })
      .eq("id", transcriptId);

    return { success: true, transcriptId };
  } catch (error) {
    // Save error
    await supabase
      .from("visit_transcripts")
      .update({
        processing_status: "failed",
        error_message: error.message,
      })
      .eq("id", transcriptId);

    throw error;
  }
}

/**
 * Approve AI-generated note (with optional edits)
 */
export async function approveAINote(
  transcriptId: string,
  editedNote: string | null = null
) {
  const supabase = await createClient();
  const user = await supabase.auth.getUser();

  const { data: transcript } = await supabase
    .from("visit_transcripts")
    .select("transcript_clinical")
    .eq("id", transcriptId)
    .single();

  const finalNote = editedNote || transcript.transcript_clinical;
  const wasEdited =
    editedNote !== null && editedNote !== transcript.transcript_clinical;

  await supabase
    .from("visit_transcripts")
    .update({
      clinician_approved_at: new Date().toISOString(),
      approved_by: user.data.user?.id,
      clinician_edited: wasEdited,
      final_note: finalNote,
    })
    .eq("id", transcriptId);

  // Also save to visit record for easy access
  const { data: visitTranscript } = await supabase
    .from("visit_transcripts")
    .select("visit_id")
    .eq("id", transcriptId)
    .single();

  await supabase
    .from("visits")
    .update({
      ai_note_approved: true,
      // Could add field: ai_clinical_note: finalNote
    })
    .eq("id", visitTranscript.visit_id);

  return { success: true };
}
```

#### 5. AI Configuration

**File:** `lib/ai-config.ts`

```typescript
export const AI_CONFIG = {
  OPENAI_MODEL_WHISPER: "whisper-1",
  OPENAI_MODEL_GPT: "gpt-4-turbo",

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

  // Whisper transcription settings
  WHISPER_CONFIG: {
    language: "en",
    response_format: "verbose_json", // Includes timestamps
    temperature: 0, // Most accurate
  },

  // GPT-4 note generation settings
  GPT_CONFIG: {
    temperature: 0.3, // Low for medical consistency
    max_tokens: 2000,
    presence_penalty: 0,
    frequency_penalty: 0,
  },

  // Cost tracking
  PRICING: {
    WHISPER_PER_MINUTE: 0.006, // $0.006 per minute
    GPT4_PER_1K_TOKENS: 0.03, // Approximate (input + output)
  },
};
```

---

## Legal & Compliance Requirements

### 1. HIPAA Compliance Checklist

**Business Associate Agreement (BAA):**

- ✅ Sign BAA with OpenAI (request via trust portal)
- ✅ Verify zero data retention is enabled for all API requests
- ✅ Confirm PHI encryption at rest and in transit
- ✅ Review OpenAI's HIPAA compliance documentation

**Technical Safeguards:**

- ✅ All audio files stored in private Supabase Storage
- ✅ Row Level Security (RLS) on all transcript tables
- ✅ Access limited to assigned clinician + admins only
- ✅ Audit logging for all PHI access (Supabase logs)
- ✅ Secure API key storage (environment variables only)

**Administrative Safeguards:**

- ✅ Document data retention policy (see below)
- ✅ Train staff on proper audio recording procedures
- ✅ Establish incident response plan for data breaches
- ✅ Regular security audits (quarterly)

---

### 2. Patient Recording Consent Form

**Draft Consent Language:**

```
CONSENT FOR AUDIO RECORDING OF MEDICAL VISITS

Patient Name: _______________________________  Date: _____________

I hereby consent to have my medical visits with [COMPANY NAME] audio recorded
for the purpose of accurate clinical documentation.

I understand that:

1. RECORDING PURPOSE: Audio recordings will be used solely to create accurate
   clinical documentation of my wound care visits. Recordings will be transcribed
   using secure, HIPAA-compliant artificial intelligence technology.

2. CONFIDENTIALITY: All recordings and transcripts are protected health information
   (PHI) and will be kept strictly confidential in accordance with HIPAA regulations.
   Only my healthcare team and authorized administrators will have access.

3. STORAGE & RETENTION: Audio recordings will be securely stored for [90 days /
   as required by law], after which they will be permanently deleted. Written
   transcripts and clinical notes will be retained as part of my permanent medical
   record.

4. ACCESS: I may request to listen to recordings or review transcripts of my visits.
   I understand that recordings may be used for quality assurance and compliance
   purposes.

5. VOLUNTARY: This consent is voluntary. I may decline to be recorded without
   affecting the quality of care I receive. If I decline, my clinician will document
   my visit using traditional written or typed notes.

6. REVOCATION: I may revoke this consent at any time by notifying my healthcare
   provider in writing. Revocation will not affect recordings made prior to
   revocation.

7. NO GUARANTEE: I understand that while recordings improve documentation accuracy,
   they may occasionally contain technical errors or omissions. My healthcare team
   will review all AI-generated notes before finalizing them.

By signing below, I confirm that I have read and understood this consent form,
have had the opportunity to ask questions, and voluntarily consent to audio
recording of my medical visits.

Patient Signature: ___________________________  Date: _____________

Witness Signature: ___________________________  Date: _____________

Clinician Name (Print): ______________________  Credentials: ______

[For office use only]
Consent Version: 1.0
Entered into system by: ________________  Date: _____________
```

---

### 3. Data Retention Policy

**Audio Files:**

- **Retention Period:** 90 days from visit date
- **Auto-Deletion:** Automated cron job deletes files after 90 days
- **Rationale:** Balance between audit trail needs and storage costs
- **Exception:** May retain longer if visit is under dispute or investigation

**Transcripts:**

- **Retention Period:** Permanent (part of medical record)
- **Storage:** Database (visit_transcripts table)
- **Backup:** Included in regular database backups (7-year retention per HIPAA)

**Clinical Notes:**

- **Retention Period:** Permanent (legal requirement for medical records)
- **Storage:** visits table + visit_transcripts.final_note
- **Compliance:** Meets HIPAA minimum 6-year retention requirement

---

### 4. Access Control Policy

**Who Can Listen to Audio Recordings:**

| Role                     | Raw Audio             | Transcripts                  | Clinical Notes         |
| ------------------------ | --------------------- | ---------------------------- | ---------------------- |
| **Assigned Clinician**   | ✅ Yes                | ✅ Yes                       | ✅ Yes                 |
| **Supervising Provider** | ✅ Yes                | ✅ Yes                       | ✅ Yes                 |
| **Tenant Admin**         | ✅ Yes (audit only)   | ✅ Yes                       | ✅ Yes                 |
| **Facility Admin**       | ❌ No                 | ✅ Yes (approved notes only) | ✅ Yes (approved only) |
| **Other Clinicians**     | ❌ No                 | ❌ No                        | ❌ No                  |
| **Patient**              | ✅ Yes (upon request) | ✅ Yes (upon request)        | ✅ Yes                 |

**Audit Logging:**

- All audio playback logged with timestamp and user ID
- Transcript views logged
- Any downloads tracked
- Monthly audit reports generated for compliance officer

---

### 5. Compliance Documentation

**Required Documentation (To Complete):**

- [ ] OpenAI API BAA (signed copy on file)
- [ ] Data Processing Agreement with Supabase (verify PHI handling)
- [ ] Privacy Policy update (disclose AI transcription use)
- [ ] Notice of Privacy Practices update (patient rights to recordings)
- [ ] Staff training materials (how to obtain consent, use recorder)
- [ ] Incident response plan (what to do if recording leaked)
- [ ] Security risk assessment (document risks and mitigations)

---

## Implementation Plan

### Week 1: Research & Setup ✅ (Current Week)

**Day 1-2: Service Selection & Account Setup**

- [x] Complete this research document
- [ ] Present to client: OpenAI vs AWS comparison
- [ ] Get client approval on recommended solution (OpenAI)
- [ ] Set up OpenAI API account (pay-as-you-go) and request BAA
- [ ] Sign Business Associate Agreement with OpenAI
- [ ] Configure API keys and test access
- [ ] Verify zero data retention setting enabled

**Day 3: Legal & Compliance**

- [ ] Review patient consent form with client's legal team
- [ ] Finalize consent language and version
- [ ] Define data retention policy specifics
- [ ] Document access control requirements
- [ ] Create compliance checklist

**Day 4-5: Architecture Finalization**

- [ ] Review this architecture doc with development team
- [ ] Create detailed database migration script (00027)
- [ ] Design Supabase Storage bucket structure
- [ ] Set up development/staging environment for testing
- [ ] Create technical specification for AudioRecorder component

**Deliverables:**

- ✅ This research document
- [ ] Client approval on OpenAI
- [ ] Signed OpenAI API BAA
- [ ] Final patient consent form
- [ ] Migration 00027 script ready for review

### Week 2: Database & Storage (Next Week)

See Phase 11.1.2 in main plan for detailed tasks.

---

## Appendix: Technical Specifications

### Audio Recording Specifications

**Browser Compatibility:**

- Chrome/Edge: ✅ Full support (MediaRecorder API)
- Safari: ✅ Supported (iOS 14.3+)
- Firefox: ✅ Supported
- Recommended: Chrome for best quality

**Audio Formats:**

- Primary: WebM with Opus codec (best browser support, small size)
- Fallback: MP4 with AAC (Safari)
- Quality: 48kHz sampling, 128kbps bitrate (mono)
- File size: ~1 MB per minute (~15 MB for 15-min visit)

**Recording Best Practices:**

- Test microphone before each visit
- Position device 3-6 feet from patient
- Minimize background noise (close door, turn off TV)
- Use external microphone for better quality (optional)
- Pause during physical exams (privacy)

---

### Cost Monitoring

**Usage Tracking:**

```typescript
// Add to admin dashboard
interface TranscriptionStats {
  month: string;
  totalVisits: number;
  totalMinutes: number;
  costWhisper: number;
  costGPT4: number;
  totalCost: number;
  averageCostPerVisit: number;
}

// Monthly report query
SELECT
  DATE_TRUNC('month', created_at) as month,
  COUNT(*) as total_visits,
  SUM(audio_duration_seconds) / 60 as total_minutes,
  SUM(cost_transcription) as cost_whisper,
  SUM(cost_llm) as cost_gpt4,
  SUM(cost_transcription + cost_llm) as total_cost,
  AVG(cost_transcription + cost_llm) as avg_cost_per_visit
FROM visit_transcripts
WHERE processing_status = 'completed'
GROUP BY DATE_TRUNC('month', created_at)
ORDER BY month DESC;
```

**Cost Alerts:**

- Alert if monthly cost exceeds $100 (safety threshold)
- Alert if per-visit cost > $0.50 (unusually long recording)
- Dashboard widget showing month-to-date spending

---

## Next Steps

**Immediate (This Week):**

1. ✅ Share this document with client for review
2. ⏳ Schedule meeting to discuss OpenAI vs AWS recommendation
3. ⏳ Get signoff on patient consent form language
4. ✅ Client approved OpenAI API direct (March 7, 2026)

**Week 2:**

1. Set up OpenAI API account and request BAA
2. Sign BAA with OpenAI
3. Create database migration 00027
4. Set up Supabase Storage bucket
5. Begin building AudioRecorder component

**Questions for Client:**

1. ~~Do you prefer OpenAI API direct ($0.29/visit) or AWS HealthScribe ($2.16/visit)?~~ **→ OpenAI API approved ✅**
2. Is 90-day audio retention acceptable, or do you need longer?
3. Who should review/approve the patient consent form (legal team)?
4. Do you want cost alerts sent to you monthly?
5. Should we support Spanish language transcription for future?

---

**Document Status:** ✅ APPROVED — OpenAI Whisper API + GPT-4 selected  
**Last Updated:** March 7, 2026  
**Author:** Development Team  
**Decision Date:** March 7, 2026  
**Next Step:** Phase 11.1.2 — Database Schema & Storage Setup
