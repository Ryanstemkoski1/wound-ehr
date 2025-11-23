-- Comprehensive RLS Fix for Users Table
-- Allow users to view other users' names/credentials (needed for addendums, signatures, audit trails)

-- Drop existing policies (including ones that already exist)
DROP POLICY IF EXISTS "Users can view own profile" ON users;
DROP POLICY IF EXISTS "Users can update own profile" ON users;
DROP POLICY IF EXISTS "Users can view users in their facilities" ON users;

-- New SELECT policy: Users can view all users in their facilities
CREATE POLICY "Users can view users in their facilities"
  ON users FOR SELECT
  USING (
    -- Users can always view their own profile
    id = auth.uid()
    OR
    -- Users can view other users in the same facilities
    id IN (
      SELECT uf2.user_id 
      FROM user_facilities uf1
      JOIN user_facilities uf2 ON uf1.facility_id = uf2.facility_id
      WHERE uf1.user_id = auth.uid()
    )
  );

-- UPDATE policy: Users can only update their own profile
CREATE POLICY "Users can update own profile"
  ON users FOR UPDATE
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid());

-- Create RPC function for visit addendums with proper user data
CREATE OR REPLACE FUNCTION get_visit_addendums(p_visit_id UUID)
RETURNS TABLE (
  id UUID,
  note TEXT,
  note_type TEXT,
  created_at TIMESTAMPTZ,
  created_by UUID,
  users JSONB
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    wn.id,
    wn.note,
    wn.note_type,
    wn.created_at,
    wn.created_by,
    jsonb_build_array(
      jsonb_build_object(
        'full_name', COALESCE(u.name, u.email, 'Unknown'),
        'email', u.email,
        'credentials', u.credentials
      )
    ) as users
  FROM wound_notes wn
  LEFT JOIN users u ON u.id = wn.created_by
  WHERE wn.visit_id = p_visit_id
    AND wn.note_type = 'addendum'
  ORDER BY wn.created_at ASC;
END;
$$;

COMMENT ON FUNCTION get_visit_addendums IS 'Fetch visit addendums with user info, bypassing RLS for display purposes';
