-- Migration: Fix user creation trigger to handle credentials
-- Version: 4.0
-- Date: November 18, 2025
-- Purpose: Update handle_new_user() trigger to set default credentials

-- Drop and recreate the trigger function with credentials support
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.users (id, email, name, credentials, created_at, updated_at)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'name', ''),
    'Admin', -- Default to Admin credentials for safety
    NOW(),
    NOW()
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION public.handle_new_user IS 
  'Automatically creates a user record when a new auth user is created. Defaults credentials to Admin.';
