-- =====================================================
-- Migration 00045: Billing Status + Claim Tracking
-- Phase 4 - Visit-Level Billing
-- =====================================================
-- Extends the billings table with:
-- 1. billing_status enum (draft → ready → submitted → paid | denied)
-- 2. submitted_at timestamp for audit trail
-- 3. claim_number for payer reference
-- 4. units JSONB (CPT code → integer) for multi-unit dressing codes
--
-- All columns default-safe so existing rows are preserved.

-- Status enum
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_type WHERE typname = 'billing_status'
  ) THEN
    CREATE TYPE billing_status AS ENUM (
      'draft',
      'ready',
      'submitted',
      'paid',
      'denied'
    );
  END IF;
END $$;

ALTER TABLE billings
  ADD COLUMN IF NOT EXISTS billing_status billing_status NOT NULL DEFAULT 'draft',
  ADD COLUMN IF NOT EXISTS submitted_at   TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS claim_number   TEXT,
  ADD COLUMN IF NOT EXISTS units          JSONB;

-- Submitted_at should only be set when status is submitted
-- (application-layer enforced; no constraint added to keep updates simple)

COMMENT ON COLUMN billings.billing_status IS
  'Lifecycle: draft → ready → submitted → paid | denied. Managed by ops staff.';

COMMENT ON COLUMN billings.submitted_at IS
  'UTC timestamp when the claim was electronically submitted to the payer.';

COMMENT ON COLUMN billings.claim_number IS
  'Payer-assigned claim reference number, populated post-submission.';

COMMENT ON COLUMN billings.units IS
  'Per-CPT unit counts. Map of {cpt_code: integer}. NULL when all codes = 1 unit.';

-- Index for status filtering on billing dashboard
CREATE INDEX IF NOT EXISTS idx_billings_status
  ON billings (billing_status);

-- Index for submitted_at range queries (monthly/quarterly reports)
CREATE INDEX IF NOT EXISTS idx_billings_submitted_at
  ON billings (submitted_at)
  WHERE submitted_at IS NOT NULL;
