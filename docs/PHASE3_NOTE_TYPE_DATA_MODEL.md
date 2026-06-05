# Note Architecture & Data Model — Updated

**Status:** Rewritten after reviewing Dr. May's two reference artifacts (5/29).
**Replaces:** The earlier junction-table proposal. The artifacts show a simpler model.

---

## What Dr. May's design actually requires

Two separate decisions, not one:

1. **At visit open — visit type.** Different visit kinds use different top-level forms (Wound Care · Skilled Nursing · Skin Sweep · Patient Not Seen). The clinician picks one.
2. **Inside a Wound Care visit — per-wound procedure tagging.** All wounds use the same Wound Assessment form. Procedures (Sharp Debridement · Biologic Graft · Arobella · Feeding Tube Change · Urinary Catheter Change) are chip-toggles inside that form. Selecting a chip expands an inline documentation block with fields specific to that procedure.

Per-wound differentiation is *not* a different template — it's *which procedures are tagged* on that wound's assessment.

---

## Visit-level shape (10 tabs from artifact 1)

```
Visit (Wound Care type)
  ├── Vitals
  ├── Chief Complaint + HPI
  ├── Review of Systems
  ├── Physical Exam
  ├── Wound Assessment            ← per-wound, navigated via left rail
  │     ├── Type & Measurements
  │     ├── Wound Features (Bed / Periwound / Edges / Exudate / Volume / Odor)
  │     ├── Healing Status
  │     ├── Debridement           ← Performed → expands Sharp Debridement doc
  │     ├── Procedures (chips)    ← each chip → expands its doc block
  │     │     ├── Biologic Allograft     → Biologic graft doc
  │     │     ├── Arobella Treatment     → Arobella doc
  │     │     ├── Feeding Tube Change    → TBD (no design yet)
  │     │     └── Urinary Catheter Change → TBD (no design yet)
  │     ├── Treatment Orders (6-category wizard)
  │     └── Wound Assessment Notes
  ├── PMH / ICD-10
  ├── Studies (orders + results table + manual entry + uploads)
  ├── Clinical Notes (Assessment / Discussion / Plan)
  ├── Rx Orders (medications + nursing orders + referrals)
  └── Timeline (read-only aggregate of visits + labs + studies)
```

Vitals / CC / ROS / PE existed in his artifact — kept but **optional per visit** (his "you don't really need them" was a priority statement, not a removal request).

---

## How this maps to existing tables (additive, not destructive)

### Keep as-is
- `visits` — parent of everything below
- `visits.em_documentation` (JSONB, exists) — already holds Vitals / CC / ROS / PE
- `assessments` — per-wound wound assessment (one row per wound per visit)
- `wounds`, `wound_notes`, `signatures`, `photos`, `patient_consents`

### Extend
- `visits.em_documentation` JSONB grows to also hold visit-level fields: `pmh_flags`, `clinical_assessment`, `clinical_discussion`, `plan`, `referrals`. (No new columns needed; same JSONB pattern as Slice 5.)
- `assessments` gains: `procedures_performed text[]` (array of procedure keys tagged on this wound).
- `assessments` gains: `healing_sign_off boolean` (the "Sign Off" healing-status chip Dr. May shows is a separate boolean, not just a status value).

### Consolidate the 8 specialized tables into 1
Today: `debridement_assessments`, `grafting_assessments`, `gtube_procedures` — each its own table.
Going forward: **one `procedure_documentation` table** with `(assessment_id, procedure_type, payload jsonb)`.

```
procedure_documentation
  id              uuid pk
  assessment_id   uuid fk assessments  -- ties it to one wound's assessment
  procedure_type  enum               -- 'sharp_debridement' | 'biologic_graft' | 'arobella' | 'feeding_tube_change' | 'urinary_catheter_change'
  payload         jsonb              -- procedure-specific fields per artifact 2
  created_by      uuid
  created_at      timestamptz
  unique (assessment_id, procedure_type)
```

Each procedure's payload structure (from artifact 2):
- **sharp_debridement:** size, wound bed %, instruments, tissue removed, bleeding, tolerance, visible structures, wound edges, periwound, pain
- **biologic_graft:** initial/current measurements, lab values (HbA1c/Albumin/Prealbumin), application type, product name, allograft sheets used (1×1 through 4×8 + custom), notes
- **arobella:** location & duration, type & depth dropdowns, size/features, wound bed %, edges, periwound, pain, visit details (date/freq/place), treatment response (patient + wound)
- **feeding_tube_change:** TBD — ask Dr. May
- **urinary_catheter_change:** TBD — ask Dr. May

### Backfill, not migration
Existing `debridement_assessments` / `grafting_assessments` / `gtube_procedures` rows stay where they are. New writes go to `procedure_documentation`. A read view unifies both for the UI. (Hard deprecation later, if ever.)

### Replace `treatments` shape (or add new)
Today: `treatments` is a single row per wound with flat fields.
Going forward: per artifact 2, treatment orders are a **6-category wizard with sentence-builder templates**. Each category has its own step structure (Open wound has 3 steps; Rash/dermatitis has 5; Eschar is a single radio). Best modeled as:

```
treatment_orders
  id              uuid pk
  assessment_id   uuid fk assessments
  category        enum   -- 'open_wound' | 'eschar' | 'compression_npwt' | 'skin_moisture' | 'rash_dermatitis' | 'graft_tx' | 'custom'
  payload         jsonb  -- category-specific step fills
  rendered_text   text   -- the natural-language sentence(s) generated from payload (for the leave-behind PDF + clinician review)
  created_by      uuid
```

The `rendered_text` is what the leave-behind PDF prints. That's why Dr. May designed the builder as sentence templates: the output IS the order.

### New tables for visit-level surfaces
- `visit_studies_orders` — labs / tissue culture / vascular / biopsy orders + results (parent: visit_id)
- `visit_studies_results` — child rows with test, date, result, flag (normal/abnormal/critical), uploaded document path
- `patient_icd10_codes` — active ICD-10 codes per patient (or per visit if he wants visit-level)
- `patient_pmh_flags` — boolean flags for the PMH checkbox grid (Hypertension / Type 2 Diabetes / CHF / COPD / etc.) — patient-level, not visit-level

### Skilled Nursing, Skin Sweep, Patient Not Seen
These are *different visit types*, not procedures inside Wound Care. Keep their existing tables (`skilled_nursing_assessments` + `skilled_nursing_wounds`, `skin_sweep_assessments`, `patient_not_seen_reports`). The visit-type selector at visit open routes the clinician to the right form.

---

## What's smaller than the earlier proposal

The earlier `visit_wound_notes` junction with `(visit_id, wound_id, template_type, payload_id)` is **gone**. We don't need it. The simpler shape is `assessment` (per wound) + `procedure_documentation` (per procedure tagged on that assessment).

That removes the schema gymnastics around "per-wound-different-template" — and matches what Dr. May actually drew.

---

## What's bigger than the earlier proposal

1. **Treatment Order Builder is a real wizard** — 6 categories × different step structures × sentence rendering. The current `components/assessments/treatment-order-builder.tsx` is a flat chip list; this needs a real rebuild. ~1 week.
2. **Studies tab** is its own surface with orders + results table + manual entry + uploads. ~3–4 days.
3. **Timeline tab** is a read-only aggregator — query work, no new tables. ~1 day.

Net: roughly the same 4–6 week envelope, just redistributed.

---

## Migration plan (when greenlit)

1. **Migration:** add `assessments.procedures_performed text[]` (nullable, default `{}`), add `assessments.healing_sign_off boolean`.
2. **Migration:** create `procedure_documentation` table + RLS (mirror assessments policy).
3. **Migration:** create `treatment_orders` table + RLS; create `visit_studies_orders` and `visit_studies_results` tables + RLS.
4. **Migration:** add `patient_icd10_codes` and `patient_pmh_flags` tables + RLS.
5. **Server actions:** `setProcedureTag(assessmentId, type, on)`, `saveProcedureDocumentation(assessmentId, type, payload)`, `saveTreatmentOrders(assessmentId, category, payload)`, etc.
6. **UI:** procedure chip → inline expansion of doc block; Treatment Order wizard with category tabs and sentence preview; Studies/PMH/Rx/Timeline tabs.
7. All behind the existing `clinical_ux_v2` flag.
