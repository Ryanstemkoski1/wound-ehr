-- =====================================================
-- Migration 00043: Tenant Feature Flags
-- Phase 2 - Scheduling/Intake/Consent foundations
-- =====================================================
-- Per-tenant feature flags so we can stage Phase 3-6 features behind a
-- toggle (Google Chat spike, billing-blocks-without-consent, copy-forward
-- defaults, batch print, etc.) without code branches per tenant.
-- Per docs/PROJECT_PLAN.md §7.2 + §7.6.

CREATE TABLE IF NOT EXISTS tenant_features (
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  flag TEXT NOT NULL,
  enabled BOOLEAN NOT NULL DEFAULT false,
  payload JSONB,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_by UUID REFERENCES auth.users(id),
  PRIMARY KEY (tenant_id, flag)
);

COMMENT ON TABLE tenant_features IS
  'Per-tenant feature flags. Read by server actions / layout to gate behavior.';

COMMENT ON COLUMN tenant_features.flag IS
  'Stable string identifier (e.g. require_consent_for_billing, chat_spike_enabled).';

COMMENT ON COLUMN tenant_features.payload IS
  'Optional structured config for the flag (thresholds, lists, etc.).';

ALTER TABLE tenant_features ENABLE ROW LEVEL SECURITY;

-- Read: any user in the tenant (so server-side gates can resolve cheaply).
DROP POLICY IF EXISTS tenant_features_select ON tenant_features;
CREATE POLICY tenant_features_select ON tenant_features
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM user_roles ur
      WHERE ur.user_id = auth.uid()
        AND ur.tenant_id = tenant_features.tenant_id
    )
  );

-- Write: tenant_admin only.
DROP POLICY IF EXISTS tenant_features_write ON tenant_features;
CREATE POLICY tenant_features_write ON tenant_features
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM user_roles ur
      WHERE ur.user_id = auth.uid()
        AND ur.tenant_id = tenant_features.tenant_id
        AND ur.role = 'tenant_admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_roles ur
      WHERE ur.user_id = auth.uid()
        AND ur.tenant_id = tenant_features.tenant_id
        AND ur.role = 'tenant_admin'
    )
  );

CREATE OR REPLACE FUNCTION public.touch_tenant_features_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at := NOW();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS tenant_features_touch_updated_at ON tenant_features;
CREATE TRIGGER tenant_features_touch_updated_at
  BEFORE UPDATE ON tenant_features
  FOR EACH ROW EXECUTE FUNCTION public.touch_tenant_features_updated_at();
