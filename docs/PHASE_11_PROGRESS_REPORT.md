# Wound EHR — Phase 11 Update

**March 9, 2026**

---

## The Big Update: AI Notetaker

This was the #1 priority coming out of the last client meeting — and it was a big one. Building a real-time audio recording system that connects to AI for transcription and clinical note generation touched a lot of moving parts: browser audio APIs, secure file upload, cloud storage, two different AI models, background processing, real-time status updates, error recovery, and a full clinician review workflow.

**It's mostly ready for testing.** The core pipeline works end-to-end: record a visit → upload → AI generates a structured clinical note → clinician reviews and approves. That said, there are still a few improvements and edge-case fixes we want to button up over the next few days before we'd call it fully production-ready.

### How It Works (the short version)

1. Patient gives one-time recording consent (with signature — stored for compliance)
2. Clinician hits "Record" during the visit — sees a live waveform and timer
3. When done, the audio uploads to secure cloud storage (Supabase Storage, private bucket)
4. **Two AI models process the recording:**
   - **OpenAI Whisper** (`whisper-1`) — converts speech to text. This is the same model that powers most modern transcription tools. High accuracy, handles medical terminology well.
   - **OpenAI GPT-4 Turbo** — takes the raw transcript and generates a structured clinical note with sections for chief complaint, wound assessment, treatment, plan of care, and patient education.
5. Clinician reviews the AI-generated note. They can approve as-is, edit and approve, reject, or ask AI to regenerate.
6. Approved note is saved to the visit record. Full edit history is tracked.

**Time savings:** Estimated 10–15 minutes per visit (from ~20 min typing notes → ~5 min reviewing the AI draft).

### What Still Needs Work (next few days)

- A few UI polish items and edge-case handling
- Admin transcript management page (browse/search all transcripts)
- Final round of real-world testing with actual clinical recordings
- Production deployment prep (API key, storage bucket configuration)

### AI Cost

Very reasonable — roughly **$0.10–0.30 per visit**. At 300 visits/month that's about **$30–80/month** total. Breakdown:

- Whisper (speech-to-text): ~$0.06/visit
- GPT-4 Turbo (note generation): ~$0.05–0.20/visit

---

## Next Up: PDF Clinical Summaries

The client already sent us the PDF form templates a couple of weeks ago, so **this project is ready to start.** We'll be building:

- G-tube clinical summary PDF
- Wound care clinical summary PDF
- Facility access control (hide pending/unapproved notes from facility users)

Estimated time: **~1.5 weeks**. We'll kick this off as soon as we wrap the last AI improvements.

---

## After That

| What                        | Time Estimate | Notes                                                          |
| --------------------------- | ------------- | -------------------------------------------------------------- |
| Mobile UI optimization      | ~1.5 weeks    | Touch-friendly, offline support, bottom nav for phones/tablets |
| Printing & PDF enhancements | ~1 week       | Clinician signatures on PDFs, photo size options               |
| Final polish                | ~1 week       | Global search, notifications, admin tools                      |

**Target for everything:** April 24, 2026

---

## Suggested Talking Points for Client

- AI notetaker is working and nearly ready for a live demo — let's schedule one with Dr. May and clinicians
- PDF clinical summaries are next (templates received, starting soon)
- We're ahead of the original timeline on the AI work
- Monthly AI cost will be minimal (~$30–80/month)
- Need to confirm production OpenAI API key before go-live
