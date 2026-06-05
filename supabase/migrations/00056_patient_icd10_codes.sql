-- 00056_patient_icd10_codes.sql
-- Patient-level active ICD-10 diagnoses, surfaced on the PMH / ICD-10 tab.
--
-- This is the patient's running list of active diagnoses (problem list).
-- It is distinct from billings.icd10_codes, which is per-visit claim coding.
-- A patient can have many ICD-10 codes; a code may be deactivated (is_active = false)
-- but kept for history. Active codes are deduped per patient via a partial unique
-- index, while inactive duplicates are allowed (so you can re-add and re-resolve
-- a diagnosis over time without violating uniqueness).
--
-- RLS: facility-scoped through the patient's facility_id via user_facilities.
-- All statements are idempotent.

begin;

-- ---------------------------------------------------------------------------
-- Table
-- ---------------------------------------------------------------------------
create table if not exists public.patient_icd10_codes (
  id          uuid primary key default gen_random_uuid(),
  patient_id  uuid not null references public.patients(id) on delete cascade,
  icd10_code  text not null,                    -- e.g. 'E11.621'
  description text,                             -- e.g. 'Type 2 DM with foot ulcer'
  added_by    uuid references auth.users(id),
  added_at    timestamptz not null default now(),
  is_active   boolean not null default true,
  notes       text
);

-- ---------------------------------------------------------------------------
-- Indexes
-- ---------------------------------------------------------------------------
-- Lookups are almost always "give me this patient's codes".
create index if not exists patient_icd10_codes_patient_id_idx
  on public.patient_icd10_codes (patient_id);

-- Partial unique: prevent duplicate ACTIVE codes per patient, but allow
-- historical inactive rows (so a resolved diagnosis can be re-added later).
create unique index if not exists patient_icd10_codes_patient_code_active_uniq
  on public.patient_icd10_codes (patient_id, icd10_code)
  where is_active = true;

-- ---------------------------------------------------------------------------
-- Row Level Security
-- ---------------------------------------------------------------------------
alter table public.patient_icd10_codes enable row level security;

-- Drop-and-recreate so the policies are idempotent on re-run.
drop policy if exists "patient_icd10_codes_select" on public.patient_icd10_codes;
drop policy if exists "patient_icd10_codes_insert" on public.patient_icd10_codes;
drop policy if exists "patient_icd10_codes_update" on public.patient_icd10_codes;
drop policy if exists "patient_icd10_codes_delete" on public.patient_icd10_codes;

-- SELECT: rows whose patient lives in a facility the caller is assigned to.
create policy "patient_icd10_codes_select"
  on public.patient_icd10_codes
  for select
  using (
    patient_id in (
      select id from public.patients where facility_id in (
        select facility_id from public.user_facilities where user_id = auth.uid()
      )
    )
  );

-- INSERT: new rows must reference a patient in one of the caller's facilities.
create policy "patient_icd10_codes_insert"
  on public.patient_icd10_codes
  for insert
  with check (
    patient_id in (
      select id from public.patients where facility_id in (
        select facility_id from public.user_facilities where user_id = auth.uid()
      )
    )
  );

-- UPDATE: caller must currently see the row AND any new patient_id must also be
-- in their facility scope (prevents moving a code to a patient they cannot see).
create policy "patient_icd10_codes_update"
  on public.patient_icd10_codes
  for update
  using (
    patient_id in (
      select id from public.patients where facility_id in (
        select facility_id from public.user_facilities where user_id = auth.uid()
      )
    )
  )
  with check (
    patient_id in (
      select id from public.patients where facility_id in (
        select facility_id from public.user_facilities where user_id = auth.uid()
      )
    )
  );

-- DELETE: caller must be able to see the row.
create policy "patient_icd10_codes_delete"
  on public.patient_icd10_codes
  for delete
  using (
    patient_id in (
      select id from public.patients where facility_id in (
        select facility_id from public.user_facilities where user_id = auth.uid()
      )
    )
  );

commit;
