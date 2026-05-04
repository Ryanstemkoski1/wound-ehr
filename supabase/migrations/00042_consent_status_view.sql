-- =====================================================
-- Migration 00042: Consent Status View
-- Phase 2 - Scheduling/Intake/Consent foundations
-- =====================================================
-- Convenience view for the persistent consent banner. For each patient,
-- returns whether the canonical 'initial_treatment' consent is on file
-- and how stale it is. The banner queries this view instead of joining
-- patient_consents at every render.
-- Per docs/PROJECT_PLAN.md §7.2 (R-019, R-020).

CREATE OR REPLACE VIEW public.patient_consent_status AS
SELECT
  p.id                                       AS patient_id,
  p.facility_id                              AS facility_id,
  pc.id                                      AS consent_id,
  pc.consented_at                            AS consented_at,
  pc.patient_signature_id                    AS patient_signature_id,
  pc.consent_document_url                    AS document_url,
  CASE
    WHEN pc.id IS NULL THEN 'missing'
    WHEN pc.patient_signature_id IS NULL
         AND pc.consent_document_url IS NULL THEN 'incomplete'
    ELSE 'on_file'
  END                                        AS status,
  CASE
    WHEN pc.consented_at IS NULL THEN NULL
    ELSE EXTRACT(DAY FROM (NOW() - pc.consented_at))::INTEGER
  END                                        AS days_since_consent
FROM patients p
LEFT JOIN patient_consents pc
  ON pc.patient_id = p.id
 AND pc.consent_type = 'initial_treatment';

COMMENT ON VIEW public.patient_consent_status IS
  'Per-patient consent state for the banner. status: missing | incomplete | on_file.';

-- Views inherit RLS from underlying tables in PostgreSQL when created with
-- security_invoker = on (PG15+). Set it explicitly for clarity.
ALTER VIEW public.patient_consent_status SET (security_invoker = on);

GRANT SELECT ON public.patient_consent_status TO authenticated;
