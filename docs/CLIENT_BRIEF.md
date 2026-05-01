# WoundNote — Where We Are and What's Next

Prepared for The Wound Well Co. / May MD Inc.
May 1, 2026

---

## A quick note before we dig in

After our call on April 27th I went back and re-read both rounds of feedback (Alana's admin walkthrough and Dr. May's WoundNote v10 sketch) alongside the meeting notes. This document is my attempt to put the whole picture in one place: what the platform actually does today, what the team has asked for, how I plan to get there, and roughly how long it should take.

I tried to keep it readable rather than technical. Anything in here that's worth a longer conversation, let's flag it for Monday.

---

## 1. Where we are today

The system is in good shape under the hood. I won't list every feature, but the things that matter for our discussion:

**What's built and working.** Patient records with facility scoping, calendar and visit scheduling, eight different clinical assessment forms (standard, debridement, grafting, skilled nursing, G-tube, multi-wound, skin sweep, patient-not-seen), wound photography with privacy controls, electronic signatures with addendums, the office inbox approval flow, AI transcription with two-stage consent, billing codes with credential checks, three reports (Visit Log, Clinician Activity, Facility Summary), PDF generation, and audit logging for compliance.

**What's partially there or stubbed.** A few things show up in the menu but aren't finished or aren't right:

- The Incidents link in the nav goes to a 404 page.
- Visits don't currently let you pick a clinician at the moment of scheduling — you have to come back and assign them after.
- The visit "Location" field is a free-text box. That's been breaking the mapping into Practice Fusion.
- There's no "no-show reason" tracking when a visit is marked no-show.
- Visits only support a single fixed time, not a window.
- Facilities aren't classified by type (SNF, home health, assisted living, internal).
- Patients have no separate Home Health Agency field.
- Reports has no batch print or "select multiple and export" option.
- The Medical Records report tab is a placeholder.

**The bigger structural gap.** The biggest thing isn't a missing feature, it's that everyone is currently looking at the same interface. Admins see clinical clutter; clinicians see admin tools they shouldn't touch. That's the core thing your feedback was pointing at, and it's where I want to start.

---

## 2. What I heard from you

I want to put the meeting in writing so we can confirm we're on the same page. If I got any of this wrong, please tell me Monday.

**Strip it down, don't tear it down.** Anything that doesn't serve a daily user gets hidden, not deleted. The code stays in place so we can turn things back on later if we need to.

**Two front doors, one login.** Admin staff get a clean operational interface. Clinicians get a clean clinical interface. People like Erin, Alana, and Dr. May who do both keep one login and use a switcher in the top corner to flip between the two.

**The calendar is the operational hub.** It needs the things Alana called out: a clinician assignment at the moment you schedule, a structured service-location dropdown that maps cleanly to Practice Fusion, a no-show reason, a follow-up button that pre-fills the next visit, and an optional time window instead of forcing a single fixed time.

**Billing should live where billing happens.** CPT and ICD-10 codes need to be selectable at the visit level so the admin/QA team can confirm them without opening clinical notes. Clinicians shouldn't see the billing module at all.

**Reports need batch print.** Single-note printing isn't workable when the team needs to print a day's worth of notes for a facility.

**Consents stay informational, not blocking.** Two persistent statuses (Authorization to Treat, Procedure Consent). When either is missing, a sticky banner shows up on visit and note pages, but it doesn't block saving.

**On the clinical side, Dr. May's WoundNote v10 is direction, not a rewrite.** The look-and-feel, the breadcrumb header, the wound rail down the left, the collapsible card layout for the wound assessment, the New Encounter typeahead, the sign-and-addendum overlay — those are all good ideas and we'll roll them into what we already have. We won't be starting over from scratch on the clinical screens.

**The 11-tab clinical layout is a longer conversation.** What we agreed on the call is to fold the missing pieces (vitals, chief complaint, ROS, exam) into the existing assessment screen as sections rather than carving the note into eleven separate tabs out of the gate. Once the team has lived with that, we can decide whether the full tab structure is worth the change.

**Branding rename and palette change happens later in the cycle**, not at the start. It's a single-pass swap — better to do it after the structural work is settled so we're not re-doing it.

**Google Chat embed is a "nice-to-have"** that I'll do a small feasibility look at but won't promise for this round. If it turns out to be straightforward I'll fold it in; if it's complicated we'll save it.

---

## 3. The plan, in plain English

I've broken the work into six phases. They roughly follow the path a patient takes through the system: foundation first, then intake and scheduling, then the clinical visit, then billing and reports, then polish and branding.

### Phase 1 — Split the experience

**Goal:** When someone logs in, they land in the right place for their job.

This is the foundation everything else depends on. I'll set up the admin and clinical interfaces as separate experiences, build the role switcher for people who need both, and clean up the navigation per the list Alana sent (hide Wounds, Incidents, Signatures, AI Transcripts from Admin; hide Billing, Reports, Admin from Clinical; remove the broken Incidents link entirely). I'll also build the per-role dashboards so the home page makes sense for whoever's looking at it.

Before this ships I'll set up a sample user at each level so when we sit down for the walkthroughs you're seeing the real thing instead of the super-user view.

### Phase 2 — Fix scheduling, intake, and consents

**Goal:** Every operational pain point Alana raised is fixed.

This is where most of the database work happens. Adding the clinician dropdown to the New Visit modal. Replacing the free-text location with a proper service-location dropdown built on the standard CMS codes (so Practice Fusion gets clean data). Adding the no-show reason field. Adding the optional time window. Building the "Schedule Follow-Up" button on completed/cancelled/no-show visits.

On the patient side: making facility required at creation (it already is in the database; I'll surface a clearer error), adding the Home Health Agency field, adding the persistent consent banner for Authorization to Treat and Procedure Consent.

On facilities: adding the Facility Type classification (SNF, HHA, Assisted Living, Internal) so it can drive the right service-location defaults later.

### Phase 3 — Clinical visit experience

**Goal:** Bring the WoundNote layout ideas into the existing visit screen.

The breadcrumb header, the patient info pill, the resizable wound rail down the left side, the collapsible cards inside the wound assessment, the New Encounter typeahead modal. The sign / attestation / addendum overlay. The sub-sections for vitals, chief complaint, ROS, and exam folded into the assessment screen so we're capturing the E/M data Practice Fusion needs for proper reimbursement.

This is the phase that will benefit most from a working session with Dr. May and Erin walking through a real visit, so I can adjust the form flow against actual usage rather than guessing.

### Phase 4 — Billing at the visit level

**Goal:** Admin/QA can confirm coding without opening clinical notes.

CPT and ICD-10 selectors moved up to the visit detail page on the admin side. Patient-level chronic diagnosis list that auto-suggests on new visits. Confirmation that the billing module is fully blocked for clinicians.

### Phase 5 — Reports, batch print, follow-up tools, and Incidents

**Goal:** Close the operational loop and bring back the time-savers.

Multi-select and batch print on the Visit Log. The Copy Forward action so clinicians don't re-type prior assessments. The two PDF formats Dr. May described (the short Clinical Note Summary and the long Full Clinical Note, with addenda appended). And the minimum viable Incidents form using the table we already have in the database.

### Phase 6 — Branding and polish

**Goal:** It looks like WoundNote.

Rename throughout the app and email templates. The forest/teal/cream palette. Inter and Nunito typography. The sidebar redesign with the Today section. And the small Google Chat feasibility look I mentioned, with a clear go/no-go at the end.

---

## 4. Timeline

I want to be straight with you about this. The honest answer is that I'd rather hit a realistic date than promise an aggressive one and slip. The phases below are what I'd consider a tight but achievable cadence. I've also built in a 1–2 week buffer at the end of the cycle for the things that always come up in testing — small adjustments after the walkthroughs, edge cases that surface only when real data is being used, that sort of thing.

| Phase    | What ships                                          | Estimated working time |
| -------- | --------------------------------------------------- | ---------------------- |
| Pre-work | Refactor user levels, seed sample users for testing | A few days             |
| Phase 1  | Surface split, role switcher, nav cleanup           | ~1 week                |
| Phase 2  | Scheduling, intake, consents, facility type         | ~2 weeks               |
| Phase 3  | Clinical visit UX (the WoundNote-style screen)      | ~2–3 weeks             |
| Phase 4  | Billing at the visit level                          | ~1 week                |
| Phase 5  | Batch print, copy-forward, two PDFs, Incidents      | ~1–2 weeks             |
| Phase 6  | Branding, polish, Chat feasibility                  | ~1 week                |
| Buffer   | Real-world testing fallout                          | 1–2 weeks              |

Each phase wraps with a Monday review session — we'd alternate between admin-side (Alana, Yestinian) and clinical-side (Dr. May, Erin) depending on what shipped that week. That gives us small, frequent course corrections instead of one big reveal at the end.

Two things that could push the cadence:

1. **Phase 3** is the biggest single block. The clinical visit screen has the most moving parts and the most potential for "let me see how it feels and adjust" iteration. If the first walkthrough surfaces meaningful changes, that phase could grow.
2. **Discovery during a phase.** Sometimes a small request turns out to depend on something larger underneath. When that happens I'd rather pause and tell you than push it through and create new problems.

Net: if everything goes smoothly, we're looking at roughly 8–10 weeks of build time plus the buffer. If we hit one of the situations above, add a couple of weeks. I'll keep you in the loop on the Monday calls so there are no surprises.

---

## 5. Things I need from you before Monday

Nothing huge, but a few items that will save us back-and-forth:

1. **Service-location codes.** I'm planning to use the CMS standard set (11 Office, 12 Home, 13 Assisted Living, 31 SNF, 32 Nursing Facility, 33 Custodial, 34 Hospice, 99 Other). Can Alana's billing team confirm that's what Practice Fusion expects?
2. **No-show reasons.** I have _Patient Hospitalized, Patient Declined, Scheduling Error, Facility Closed, Other (free text)._ Anything missing?
3. **Consent banner behavior.** Should the banner be dismissible per session, per device, or stay visible until the consent is actually resolved?
4. **Home Health Agencies.** Do you want me to seed a starter list, or will Erin/Alana add them as they come up?
5. **Batch print format.** One combined PDF with bookmarks per visit, or a zip of separate PDFs? My recommendation is the combined one, but you may have a preference.
6. **E/M fields for billing.** Which specific fields does Practice Fusion need to count an encounter at a given E/M level? I want to make sure we capture exactly that and nothing more.

We can walk through these on Monday — I just wanted to surface them now in case the answers need a quick check with the billing team.

---

## 6. What we're not doing in this cycle

To set expectations clearly, here's what's intentionally out of scope for this round, with the understanding that any of these can come back into a future cycle:

- A patient-facing portal
- E-prescribing or lab ordering integrations
- A full revenue-cycle / claims module (Practice Fusion stays the system of record there)
- A native mobile app
- A live PCC sync to pull vitals and PMH automatically
- A read-only home-health agency portal (the data model groundwork lands in Phase 2 so we can build it later without re-doing patient records)
- Replacing Google Chat with an in-app messenger

---

## Closing thought

The work that's been done so far is most of the way there. What we're doing now is mostly refinement — getting the right people seeing the right screens, cleaning up the operational paths so nothing has to be re-entered, and pulling the clinical workflow closer to how Dr. May actually thinks about a visit. None of it requires starting over, which is good news.

I'll be ready to walk through this on Monday at 11. If anything in here doesn't line up with what you remember from the call, let me know in advance so we don't burn the meeting on it.

— Ryan
