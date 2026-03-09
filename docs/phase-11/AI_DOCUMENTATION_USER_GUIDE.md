# AI Clinical Documentation — User Guide

## Overview

Wound EHR includes AI-powered clinical note generation. Record your patient encounter, and the system will automatically transcribe the audio and generate a structured clinical note that you review and approve.

**How it works:**

1. **Consent** — Patient signs a recording consent form (one-time per patient)
2. **Record** — You record the encounter during the visit using your device's microphone
3. **AI Processing** — OpenAI Whisper transcribes the audio, then GPT-4 generates a structured clinical note
4. **Review & Approve** — You review, edit if needed, and approve the final note

---

## Step 1: Patient Recording Consent

Before recording any patient, you must obtain their consent.

### First-Time Setup (Per Patient)

1. Open the patient's **Visit Detail** page
2. You'll see the **AI Documentation** card at the top
3. Click **"Get Recording Consent"**
4. The consent modal opens with:
   - Full consent text explaining what is recorded and how data is used
   - Patient signature pad (draw signature with mouse/finger)
   - Witness name field
5. Patient reads and signs the consent form
6. Click **"Save Consent"**

The consent is stored permanently. You won't need to get consent again for the same patient.

### Revoking Consent

If a patient revokes their consent:

1. Go to the patient's profile page
2. Find the **Recording Consent** card
3. Click **"Revoke Consent"** and provide a reason
4. Future visits will not allow recording for this patient

---

## Step 2: Recording the Encounter

Once consent is obtained, the visit detail page shows the **Audio Recorder**.

### Recording Controls

| Button     | Action                              |
| ---------- | ----------------------------------- |
| 🔴 Record  | Start recording                     |
| ⏸ Pause   | Pause recording (resume anytime)    |
| ⏹ Stop    | Stop and finalize recording         |
| 🗑 Discard | Delete the recording and start over |

### Recording Tips

- **Choose the right microphone** — Use the dropdown to select your preferred mic (headset, laptop, or external)
- **Check the level meter** — The green bar should move when you speak; if flat, check your mic
- **Keep recording under 60 minutes** — Maximum audio length is 60 minutes
- **File size limit** — Maximum 500 MB per recording
- **Speak naturally** — The AI handles medical terminology well; don't slow down or over-enunciate
- **Minimize background noise** — Close doors, turn off fans if possible

### After Recording

1. Click **Stop** to finalize
2. **Preview** the recording using the playback controls
3. If satisfied, click **"Upload & Process"**
4. If not, click **"Discard"** and record again

---

## Step 3: AI Processing

After uploading, the system processes your recording in two stages:

1. **Transcription** (Whisper) — Converts speech to text (~10-30 seconds)
2. **Note Generation** (GPT-4) — Structures the transcript into a clinical note (~15-30 seconds)

### Processing Status Indicators

| Status                 | Meaning                                      |
| ---------------------- | -------------------------------------------- |
| ⏳ Awaiting Processing | Audio uploaded, queued for processing        |
| 🧠 AI Processing...    | Transcription or note generation in progress |
| ✅ AI Note Ready       | Processing complete, ready for your review   |
| ❌ Processing Failed   | An error occurred (you can retry)            |

The page automatically refreshes when processing completes. You'll see the elapsed time during processing.

### If Processing Fails

- Click **"Retry Processing"** to try again
- Common causes: temporary API issues, network interruption
- The system retries automatically up to 3 times before marking as failed
- Your audio recording is preserved — you can always retry

---

## Step 4: Reviewing the AI Note

Once processing completes, the **AI Note Review Panel** appears below the status card.

### Review Tabs

| Tab            | Purpose                                                   |
| -------------- | --------------------------------------------------------- |
| **AI Note**    | View the formatted clinical note (read-only)              |
| **Edit**       | Edit the note text in a textarea                          |
| **Transcript** | View the raw word-for-word transcription                  |
| **Changes**    | Side-by-side diff comparing your edits to the AI original |

### Clinical Note Structure

The AI generates notes with these standard sections:

- **CHIEF COMPLAINT** — Why the patient was seen
- **WOUND ASSESSMENT** — Current wound status, measurements, characteristics
- **TREATMENT PROVIDED** — What was done during the visit
- **CLINICAL REASONING** — Medical decision-making rationale
- **PLAN OF CARE** — Follow-up plan, next steps
- **PATIENT EDUCATION** — What the patient was taught

### Editing the Note

1. Click the **"Edit"** tab
2. Modify the text as needed — add details, correct inaccuracies, adjust language
3. The **"Changes"** tab appears showing your edits vs. the AI original
4. Click **"Reset"** to discard your edits and revert to the AI version

### Action Buttons

| Button                  | What It Does                                                     |
| ----------------------- | ---------------------------------------------------------------- |
| **Approve AI Note**     | Accept the note as-is (no edits made)                            |
| **Approve Edited Note** | Save your edits and approve (shown when you've made changes)     |
| **Regenerate**          | Discard the current note and re-run GPT-4 on the same transcript |
| **Discard AI Note**     | Delete the AI note entirely; resets transcript for re-processing |

### Audio Playback

The review panel includes an inline audio player. Click **Play** to listen to the original recording while reviewing the note.

### Copy to Clipboard

Click the **Copy** icon (top right of the review panel) to copy the current note text to your clipboard.

---

## After Approval

Once you approve a note:

- The card turns **green** with a ✅ "Approved" badge
- If you edited the note, an "Edited" badge also appears
- The approval timestamp and your name are recorded
- The note is locked — no further edits (use addendums for corrections)
- The visit can now proceed to signature

---

## Cost & Usage

Each recording incurs API costs:

| Service                 | Cost                        |
| ----------------------- | --------------------------- |
| Whisper (transcription) | ~$0.006 per minute of audio |
| GPT-4 (note generation) | ~$0.03 per 1K tokens        |

A typical 15-minute encounter costs approximately **$0.15-$0.30**.

The review panel shows the actual cost for each note in the metadata footer.

---

## Troubleshooting

### "No microphone detected"

- Check your browser permissions (allow microphone access)
- Try a different browser (Chrome recommended)
- Check system sound settings

### Recording audio is silent

- Verify the correct microphone is selected in the dropdown
- Check the audio level meter — it should show green activity
- Test your microphone in another application

### Processing takes too long

- Normal processing time: 30-90 seconds
- If over 2 minutes, try clicking "Retry Processing"
- Check your internet connection

### AI note has inaccuracies

- This is expected — AI is a starting point, not a final product
- Always review and edit the note before approving
- Use the Edit tab to correct any errors
- The "Regenerate" option runs GPT-4 again (may produce different results)

### "Recording consent required" message

- The patient hasn't signed the recording consent form
- Click "Get Recording Consent" and complete the consent workflow
- Consent is required once per patient (not per visit)

---

## Privacy & HIPAA Compliance

- **Audio files** are stored in Supabase Storage with encryption at rest
- **AI processing** uses OpenAI with a Business Associate Agreement (BAA)
- **Zero data retention** — OpenAI does not store or train on your data
- **Signed URLs** — Audio playback links expire after 1 hour
- **Audit trail** — All consent, recording, and approval actions are logged
- **Patient consent** — Required before any recording can take place
