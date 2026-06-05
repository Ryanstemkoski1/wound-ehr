-- 00054_treatment_orders.sql
--
-- Replaces the flat `treatments` chip list with a per-category Treatment Order
-- Builder. The wizard has 7 category tabs:
--   open_wound, eschar, compression_npwt, skin_moisture, rash_dermatitis,
--   graft_tx, custom
-- Each tab fills its own JSONB payload and renders one natural-language
-- sentence (`rendered_text`) — that rendered string is exactly what the
-- leave-behind PDF prints for the patient/caregiver.
--
-- Back-compat: the legacy `treatments` table is left in place. Existing
-- `treatments` rows remain valid and the app continues to read them. Only
-- newly built treatment orders (post-rollout) write here, one row per
-- (assessment_id, category). RLS mirrors the assessments-access predicate
-- (assessment → visit → patient → facility → user_facilities), matching the
-- access model used by procedure_documentation and the other per-assessment
-- child tables.
--
-- All statements are idempotent.

begin;

-- ============================================================================
-- 1. Table
-- ============================================================================

create table if not exists public.treatment_orders (
  id              uuid primary key default gen_random_uuid(),
  assessment_id   uuid not null references public.assessments(id) on delete cascade,
  category        text not null check (category in (
    'open_wound',
    'eschar',
    'compression_npwt',
    'skin_moisture',
    'rash_dermatitis',
    'graft_tx',
    'custom'
  )),
  payload         jsonb not null default '{}'::jsonb,
  rendered_text   text not null default '',
  created_by      uuid references auth.users(id),
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  -- One row per category per assessment — the wizard upserts by this key.
  unique (assessment_id, category)
);

comment on table public.treatment_orders is
  'Per-category rows for the 7-tab Treatment Order Builder wizard. Replaces '
  'the flat treatments chip list; legacy treatments rows remain valid for '
  'back-compat, new builds write here. rendered_text is the exact sentence '
  'printed on the leave-behind PDF.';

comment on column public.treatment_orders.category is
  'Which wizard tab this row belongs to. One row per (assessment_id, category).';
comment on column public.treatment_orders.payload is
  'Step-by-step fills entered in the wizard for this category (shape varies by category).';
comment on column public.treatment_orders.rendered_text is
  'Natural-language sentence rendered from payload — this is what the leave-behind PDF prints.';

-- ============================================================================
-- 2. Indexes
-- ============================================================================

create index if not exists idx_treatment_orders_assessment_id
  on public.treatment_orders (assessment_id);

-- ============================================================================
-- 3. updated_at trigger (reuses the shared helper)
-- ============================================================================

drop trigger if exists update_treatment_orders_updated_at on public.treatment_orders;
create trigger update_treatment_orders_updated_at
  before update on public.treatment_orders
  for each row execute function public.update_updated_at_column();

-- ============================================================================
-- 4. Row Level Security
-- ============================================================================

alter table public.treatment_orders enable row level security;

-- Same predicate shape as assessments / procedure_documentation:
--   user can reach a treatment_orders row iff they share a facility with the
--   patient who owns the visit that owns the assessment.
drop policy if exists "Users can view treatment orders for their assessments" on public.treatment_orders;
create policy "Users can view treatment orders for their assessments"
  on public.treatment_orders
  for select
  using (
    assessment_id in (
      select a.id
      from public.assessments a
      join public.visits v          on v.id = a.visit_id
      join public.patients p        on p.id = v.patient_id
      join public.user_facilities uf on uf.facility_id = p.facility_id
      where uf.user_id = auth.uid()
    )
  );

drop policy if exists "Users can manage treatment orders for their assessments" on public.treatment_orders;
create policy "Users can manage treatment orders for their assessments"
  on public.treatment_orders
  for all
  using (
    assessment_id in (
      select a.id
      from public.assessments a
      join public.visits v          on v.id = a.visit_id
      join public.patients p        on p.id = v.patient_id
      join public.user_facilities uf on uf.facility_id = p.facility_id
      where uf.user_id = auth.uid()
    )
  )
  with check (
    assessment_id in (
      select a.id
      from public.assessments a
      join public.visits v          on v.id = a.visit_id
      join public.patients p        on p.id = v.patient_id
      join public.user_facilities uf on uf.facility_id = p.facility_id
      where uf.user_id = auth.uid()
    )
  );

commit;
