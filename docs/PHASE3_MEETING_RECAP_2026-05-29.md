# Phase 3 — Meeting Recap (May 29, 2026)

**Attendees:** Dr. May · Ryan
**Duration:** ~30 min
**Outcome:** Architecture greenlit · 7 questions resolved · 3 follow-up artifacts received over the weekend.

---

## Decisions on the 7 confirmations

| # | Question | Answer |
|---|---|---|
| Q1 | Procedure-tagging interpretation correct? | **Yes.** He saw the built version on screen, called it *"actually pretty good,"* will send a verified version of the rule set. |
| Q2 | FTC + UCC fields? | **Fields exist** (drafted from g-tube schema) — but there's a UI bug: 3rd & 4th chips don't expand their detail blocks. Reproducible. |
| Q3 | Vitals / CC / ROS / PE optional or always-on? | **Optional, kept.** *"For maximum billing, insurance wants as complete a note as possible. Collect it but don't mandate it to save a note."* Mandatory = Wound Assessment + Procedures + ICD-10. |
| Q4 | Treatment Order Builder as a wizard with guardrails per wound type? | **Yes, build it.** He explicitly likes that orders are guided to be appropriate per wound type to prevent inappropriate dressings. |
| Q5 | Leave-behind PDF = rendered Treatment Order sentences? | **Yes — one page per ISSUE, not per wound.** Three wounds + a G-tube = 4 pages. Stripped to *"just the positives"* — no checkbox bubbles in the output. Patient demographics + location + wound picture + features + procedure + assessment + treatment. Remove redundancy (he pointed to pain + exudate showing twice in his current output). |
| Q6 | "Sign Off" healing status meaning? | *"We're not going to be seeing that wound anymore."* Care transferred (ortho takes over, toe amputated, patient discharged) — functionally like Healed for tracking purposes, but the wound isn't actually closed. Also flagged: **"Declined" and "Deteriorating" likely redundant — drop one.** |
| Q7 | Skilled Nursing + Skin Sweep as separate visit types? | **Confirmed.** Plus a key detail: **skin sweep is a building-wide audit**; if a patient has no wounds it's a sign-off; if wounds are found it cascades into a Wound Assessment. |

## Provider-type access — final model

Dr. May was explicit: *"We're not going to have multiple forms because that would just be a maintenance hassle. So it'll be one system, but the person that's filling it out will only get access to the panels that are appropriate for them."*

- **MD / DO / NP / PA:** full panel (what's built today)
- **RN / LVN:** different flow — vitals + physical exam emphasized; lighter wound assessment scope

Later confirmation (after seeing Alana's nursing form) — **the nursing flow is genuinely structurally different**: Skilled Nursing should be its own visit type with its own form, not just panel visibility on the MD form. The MIPS Quality Measures / MD Notification / Education Given panels don't exist on the MD side. Wound shape inside nursing is qualitative-only with measurements deferred to provider.

## Bugs surfaced in the live walkthrough

- **Sign button doesn't work** on current build — Ryan acknowledged on the call
- **3rd & 4th procedure chips (FTC, UCC) don't expand** their detail blocks
- **Status chip duplication** — "Declined" vs "Deteriorating"

## Three artifacts Dr. May sent Friday evening

1. **Skilled Nursing Visit — Wound Care form** (Alana's) — branded "woundwell"
2. **G-Tube Replacement/Removal Procedure Note** — branded "tubes on demand + woundwell"
3. **Indwelling Catheter Replacement** form — designed by Dr. May, yellow highlights mark catheter-specific adaptations from the G-Tube form

## Tone

Genuinely positive. *"This is positive… this is looking good… I'm glad that you have been able to think about how we can do this."* Architecture has explicit buy-in.

## Items Ryan committed to drafting (he red-lines later)

- Leave-behind PDF v1 from artifact patterns
- Attestation placeholder text on sign dialog
- FTC + UCC documentation forms (now well-spec'd by his Indwelling Catheter form)
- Provider-type access via role-aware panel visibility (informed by nursing form)

## No fixed next meeting

Dr. May asked Ryan to follow up by email with implementation-time estimate so they can schedule the next check-in adaptively.
