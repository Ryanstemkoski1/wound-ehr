# Phase 11.1 — AI Documentation Test Plan

## Test Environment

- **Application**: Wound EHR (Next.js 16, React 19)
- **Database**: Supabase PostgreSQL (linked project)
- **AI Services**: OpenAI Whisper API + GPT-4
- **Browser**: Chrome (recommended), Firefox, Safari, Edge
- **Audio**: Device microphone or external mic

---

## 1. Recording Consent Tests

### TC-1.1: First-time consent flow

- **Precondition**: Patient has no recording consent
- **Steps**:
  1. Navigate to patient visit detail page
  2. Verify "AI Documentation" card shows "Recording consent required"
  3. Click "Get Recording Consent"
  4. Verify consent modal opens with full consent text v1.0
  5. Patient signs on signature pad
  6. Enter witness name
  7. Click "Save Consent"
- **Expected**: Consent saved, page refreshes, Audio Recorder appears
- **Verify**: `patient_recording_consents` table has new row with `is_active = true`

### TC-1.2: Consent already exists

- **Precondition**: Patient has active consent
- **Steps**: Navigate to visit detail page
- **Expected**: Audio Recorder shown (no consent prompt)

### TC-1.3: Consent revocation

- **Precondition**: Patient has active consent
- **Steps**:
  1. Navigate to patient profile page
  2. Find Recording Consent card
  3. Click "Revoke Consent"
  4. Provide reason
  5. Navigate to new visit for this patient
- **Expected**: Consent revoked (`is_active = false`, `revoked_at` set), visit shows consent prompt again

### TC-1.4: Re-consent after revocation

- **Precondition**: Patient has revoked consent
- **Steps**: Follow TC-1.1 flow
- **Expected**: New consent row created, previous row remains revoked

---

## 2. Audio Recording Tests

### TC-2.1: Basic recording flow

- **Precondition**: Patient has consent, visit is editable (draft/ready_for_signature)
- **Steps**:
  1. Click Record button
  2. Speak for 30 seconds
  3. Click Stop
  4. Verify playback preview works
  5. Click "Upload & Process"
- **Expected**: Audio uploaded to Supabase Storage, `visit_transcripts` row created, processing begins

### TC-2.2: Pause and resume

- **Steps**:
  1. Start recording
  2. Click Pause after 10 seconds
  3. Wait 5 seconds
  4. Click Resume
  5. Speak for 10 more seconds
  6. Stop and upload
- **Expected**: Complete audio file with gap, successful processing

### TC-2.3: Discard recording

- **Steps**:
  1. Start recording, speak for 10 seconds
  2. Click Stop
  3. Click "Discard"
- **Expected**: Recording deleted, recorder resets to initial state, no upload occurs

### TC-2.4: Microphone selection

- **Precondition**: Multiple audio input devices available
- **Steps**:
  1. Open microphone dropdown
  2. Select different microphone
  3. Record and verify audio level meter responds
- **Expected**: Correct device used, level meter shows activity

### TC-2.5: No microphone

- **Precondition**: No microphone connected or permissions denied
- **Steps**: Navigate to visit detail with consent
- **Expected**: Error message displayed, record button disabled

### TC-2.6: Signed visit (read-only)

- **Precondition**: Visit is in "signed" or "submitted" status
- **Steps**: Navigate to visit detail page
- **Expected**: No audio recorder shown, only status display

### TC-2.7: Maximum duration (60 min)

- **Steps**: Start recording and let it run for 60+ minutes
- **Expected**: Recording auto-stops at 60 minutes with notification

---

## 3. AI Processing Tests

### TC-3.1: Successful end-to-end processing

- **Precondition**: Audio uploaded
- **Steps**:
  1. After upload, observe status card shows "Awaiting Processing" → "AI Processing..."
  2. Wait for processing to complete (30-90 seconds typical)
  3. Page auto-refreshes
- **Expected**:
  - `processing_status` transitions: `pending` → `processing` → `completed`
  - `transcript_raw` populated with transcription
  - `transcript_clinical` populated with structured clinical note
  - Cost fields populated (`cost_transcription`, `cost_llm`)
  - `transcript_metadata` contains whisper + gpt details

### TC-3.2: Retry failed processing

- **Precondition**: Processing failed (simulate by disabling API key temporarily)
- **Steps**:
  1. Verify status shows "Processing Failed"
  2. Click "Retry Processing"
- **Expected**: Status resets, processing restarts, eventual success

### TC-3.3: Regenerate clinical note

- **Precondition**: Transcript completed
- **Steps**: Click "Regenerate" in review panel
- **Expected**: New GPT-4 call generates different note from same raw transcript, page refreshes

### TC-3.4: Polling during processing

- **Steps**: Upload audio, watch the status card
- **Expected**:
  - Polling indicator shows elapsed time
  - Status updates every 3 seconds
  - Auto-reloads page when status reaches "completed"

### TC-3.5: Network interruption during processing

- **Steps**:
  1. Upload audio
  2. Disconnect network briefly during processing
  3. Reconnect
- **Expected**: Polling resumes, if processing completed server-side the page shows completed status

---

## 4. AI Note Review Tests

### TC-4.1: View formatted AI note

- **Precondition**: Transcript status is "completed"
- **Steps**: View the AI Note tab in the review panel
- **Expected**:
  - Note displayed with section headings (CHIEF COMPLAINT, WOUND ASSESSMENT, etc.)
  - Sections styled with teal headers and separators
  - Metadata footer shows duration, cost, tokens, model

### TC-4.2: Edit AI note

- **Steps**:
  1. Click "Edit" tab
  2. Modify text (add a sentence, correct a word)
  3. Verify "Changes" tab appears in tab list
  4. Click "Changes" tab to see diff
- **Expected**:
  - Textarea shows current note text
  - "Edited — changes will be tracked" badge appears
  - Diff view shows original vs edited side-by-side
  - Changed lines highlighted

### TC-4.3: Reset edits

- **Steps**:
  1. Edit the note
  2. Click "Reset" button
- **Expected**: Note reverts to AI original, "Changes" tab disappears

### TC-4.4: Approve AI note (no edits)

- **Steps**: Click "Approve AI Note" without editing
- **Expected**:
  - `clinician_approved_at` set to current timestamp
  - `clinician_edited` = false
  - `final_note` = same as `transcript_clinical`
  - `visits.ai_note_approved` = true
  - Card turns green with "Approved" badge

### TC-4.5: Approve edited note

- **Steps**:
  1. Edit the note (change some text)
  2. Click "Approve Edited Note"
- **Expected**:
  - `clinician_edited` = true
  - `final_note` = edited version
  - `clinician_approved_at` set
  - Card turns green with "Edited" + "Approved" badges

### TC-4.6: Discard AI note

- **Steps**:
  1. Click "Discard AI Note"
  2. Confirm in the dialog
- **Expected**:
  - `processing_status` reset to "pending"
  - `transcript_clinical` cleared
  - `clinician_approved_at` cleared
  - Status card resets, allowing re-processing

### TC-4.7: Audio playback in review

- **Steps**: Click Play button in the audio player within the review panel
- **Expected**: Audio plays from signed URL, pause/resume works

### TC-4.8: Copy to clipboard

- **Steps**: Click copy icon in the review panel header
- **Expected**: Note text copied to clipboard, check icon briefly shown

### TC-4.9: Approved note is read-only

- **Precondition**: Note is approved
- **Steps**: View the approved note card
- **Expected**: Green card, formatted note shown, no edit/approve buttons (only metadata)

### TC-4.10: Review disabled for signed visits

- **Precondition**: Visit is signed, transcript is completed but not approved
- **Steps**: View the review panel
- **Expected**: Action buttons (approve, regenerate, discard) are disabled/hidden

---

## 5. Integration Tests

### TC-5.1: Visit detail page layout

- **Steps**: Navigate to visit with completed transcript
- **Expected**:
  - VisitAIStatusCard at top of left column
  - AIReviewPanel directly below (when transcript completed/approved)
  - Visit Information card below that
  - All existing cards (billing, follow-up, signatures, assessments) still render correctly

### TC-5.2: Multiple visits for same patient

- **Steps**: Record and process audio for 2 different visits of the same patient
- **Expected**: Each visit has its own independent transcript, consent is shared

### TC-5.3: Visit workflow integration

- **Steps**:
  1. Create visit → Record → Process → Approve AI note
  2. Add wound assessment
  3. Sign visit
- **Expected**: Full workflow completes, all data saved correctly

### TC-5.4: Concurrent access

- **Steps**: Two clinicians open the same visit simultaneously
- **Expected**: Each sees the current state, no data corruption

---

## 6. Error Handling Tests

### TC-6.1: Invalid audio format

- **Steps**: Attempt to upload a non-audio file
- **Expected**: Client-side validation rejects with error message

### TC-6.2: Oversized file

- **Steps**: Attempt to upload audio > 25 MB (Whisper API limit)
- **Expected**: Client-side validation rejects before upload

### TC-6.3: API key missing

- **Steps**: Remove OPENAI_API_KEY from environment
- **Expected**: Processing fails with clear error message, retry available

### TC-6.4: Supabase storage error

- **Steps**: Simulate storage bucket unavailable
- **Expected**: Upload fails with error, user can retry

---

## 7. Security & Compliance Tests

### TC-7.1: Unauthenticated access

- **Steps**: Call server actions without being logged in
- **Expected**: Returns `{ error: "Not authenticated" }`

### TC-7.2: Cross-patient access

- **Steps**: Try to access transcript from a different patient's visit
- **Expected**: Row-Level Security blocks access

### TC-7.3: Audio URL expiration

- **Steps**: Get a signed audio URL, wait 1+ hour, try to access
- **Expected**: URL expired, returns 403/error

### TC-7.4: Consent required enforcement

- **Steps**: Try to upload audio for a patient without consent
- **Expected**: `uploadVisitAudio` returns error

---

## 8. Performance Benchmarks

| Metric                               | Target       | How to Measure                  |
| ------------------------------------ | ------------ | ------------------------------- |
| Audio upload time (15 min file)      | < 10 seconds | Timer from click to completion  |
| Whisper transcription (15 min audio) | < 30 seconds | Processing elapsed display      |
| GPT-4 note generation                | < 30 seconds | Processing elapsed display      |
| Total end-to-end time                | < 90 seconds | From upload click to note ready |
| Review panel render time             | < 500 ms     | Browser Performance tab         |
| Audio playback start time            | < 2 seconds  | From click to audio playing     |

---

## Manual Test Checklist (Pre-Demo)

- [ ] Patient consent flow works end-to-end
- [ ] Audio recording captures clear audio
- [ ] Upload + processing completes successfully
- [ ] AI note is well-structured with correct sections
- [ ] Edit → diff view shows changes correctly
- [ ] Approve updates all database fields correctly
- [ ] Regenerate produces a new note
- [ ] Discard resets the transcript
- [ ] Signed visits are read-only
- [ ] Audio playback works in the review panel
- [ ] Cost and metadata display correctly
- [ ] No console errors or UI glitches
