-- Fix search_path for SECURITY DEFINER trigger functions
-- These functions are invoked by Supabase Auth (GoTrue) during user creation/invite,
-- which runs with a restricted search_path that doesn't include 'public'.
-- Without explicit search_path, references to public tables fail with:
-- "relation "user_roles" does not exist"

-- Fix handle_new_user: add SET search_path
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.users (id, email, name, credentials, created_at, updated_at)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'name', ''),
    'Admin',
    NOW(),
    NOW()
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Fix auto_assign_user_role: add SET search_path + fully qualify table names
CREATE OR REPLACE FUNCTION public.auto_assign_user_role()
RETURNS TRIGGER AS $$
DECLARE
  default_tenant_id UUID;
  default_facility_id UUID;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = NEW.id) THEN
    SELECT id INTO default_tenant_id FROM public.tenants ORDER BY created_at LIMIT 1;
    IF default_tenant_id IS NOT NULL THEN
      SELECT id INTO default_facility_id FROM public.facilities WHERE tenant_id = default_tenant_id LIMIT 1;
      IF default_facility_id IS NOT NULL THEN
        INSERT INTO public.user_roles (user_id, tenant_id, role, facility_id)
        VALUES (NEW.id, default_tenant_id, 'user', default_facility_id)
        ON CONFLICT (user_id, tenant_id) DO NOTHING;
      END IF;
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;
