-- 00058_mips_measures.sql
-- Adds a MIPS / Quality Measures section to skilled_nursing_assessments
-- per Alana's nursing form (Phase 3). Captures CMS-aligned measures:
--   - smoking_status (e.g. 'never', 'former', 'current', 'unknown')
--   - cessation_counseling_offered (boolean)
--   - bmi (numeric)
--   - fall_risk_score (integer; e.g. Morse scale)
--   - advance_directive_on_file ('yes' | 'no' | 'declined')
--   - medication_list_reviewed (boolean)
--
-- Stored as a single JSONB column to keep the row width manageable -
-- skilled_nursing_assessments already has ~150 columns and adding 6+
-- typed columns for every new measure is unsustainable. JSONB also lets
-- us evolve the MIPS set as CMS changes the reporting requirements
-- without an ALTER TABLE each cycle.
--
-- No RLS changes: this column is covered by the existing
-- skilled_nursing_assessments policies (per-tenant via facility_id).
-- All statements are idempotent.

begin;

alter table public.skilled_nursing_assessments
  add column if not exists mips_measures jsonb not null default '{}'::jsonb;

comment on column public.skilled_nursing_assessments.mips_measures is
  'MIPS / Quality Measures for CMS reporting. Expected shape: '
  '{ "medication_list_reviewed": bool, "smoking_status": text, '
  '"cessation_counseling_offered": bool, "bmi": numeric, '
  '"fall_risk_score": int, "advance_directive_on_file": '
  '"yes"|"no"|"declined" }. Optional keys may be absent for older rows.';

-- GIN index so we can filter/aggregate measures (e.g. "all assessments
-- where advance_directive_on_file = 'no'") for MIPS reporting queries.
create index if not exists idx_skilled_nursing_assessments_mips_measures
  on public.skilled_nursing_assessments
  using gin (mips_measures jsonb_path_ops);

commit;
