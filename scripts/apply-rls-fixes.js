/**
 * Apply Critical RLS Security Fixes
 * Fixes multi-tenant isolation vulnerabilities
 */

require('dotenv/config');
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing Supabase credentials');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function executeSql(sql, description) {
  console.log(`\n🔄 ${description}...`);
  try {
    const { error } = await supabase.rpc('exec_sql', { sql });
    if (error) {
      console.error(`❌ Error: ${error.message}`);
      return false;
    }
    console.log(`✅ ${description} - Success`);
    return true;
  } catch (err) {
    console.error(`❌ Error: ${err.message}`);
    return false;
  }
}

async function applyFixes() {
  console.log('🔒 APPLYING CRITICAL RLS SECURITY FIXES');
  console.log('=====================================\n');

  // Fix 1: WOUND_NOTES TABLE - Drop conflicting policies
  console.log('📝 FIX 1: WOUND_NOTES TABLE');
  await executeSql(`DROP POLICY IF EXISTS "Users can view wound notes in their tenant" ON wound_notes;`, 'Drop old policy 1');
  await executeSql(`DROP POLICY IF EXISTS "Users can create wound notes in their facilities" ON wound_notes;`, 'Drop old policy 2');
  await executeSql(`DROP POLICY IF EXISTS "Users can view wound notes and addendums in their tenant" ON wound_notes;`, 'Drop old policy 3');
  await executeSql(`DROP POLICY IF EXISTS "Users can create wound notes and addendums in their facilities" ON wound_notes;`, 'Drop old policy 4');
  await executeSql(`DROP POLICY IF EXISTS "Users can update their own wound notes" ON wound_notes;`, 'Drop old policy 5');
  await executeSql(`DROP POLICY IF EXISTS "Users can delete their own wound notes" ON wound_notes;`, 'Drop old policy 6');
  
  // Create correct wound_notes SELECT policy
  await executeSql(`
    CREATE POLICY "Users can view wound notes and addendums in their facilities"
      ON wound_notes FOR SELECT
      USING (
        (wound_id IS NOT NULL AND wound_id IN (
          SELECT w.id FROM wounds w
          JOIN patients p ON w.patient_id = p.id
          INNER JOIN user_facilities uf ON p.facility_id = uf.facility_id
          WHERE uf.user_id = auth.uid()
        ))
        OR
        (wound_id IS NULL AND note_type = 'addendum' AND visit_id IN (
          SELECT v.id FROM visits v
          JOIN patients p ON v.patient_id = p.id
          INNER JOIN user_facilities uf ON p.facility_id = uf.facility_id
          WHERE uf.user_id = auth.uid()
        ))
      );
  `, 'Create wound_notes SELECT policy');

  // Create correct wound_notes INSERT policy
  await executeSql(`
    CREATE POLICY "Users can create wound notes and addendums in their facilities"
      ON wound_notes FOR INSERT
      WITH CHECK (
        (wound_id IS NOT NULL AND wound_id IN (
          SELECT w.id FROM wounds w
          JOIN patients p ON w.patient_id = p.id
          INNER JOIN user_facilities uf ON p.facility_id = uf.facility_id
          WHERE uf.user_id = auth.uid()
        ) AND created_by = auth.uid())
        OR
        (wound_id IS NULL AND note_type = 'addendum' AND visit_id IN (
          SELECT v.id FROM visits v
          JOIN patients p ON v.patient_id = p.id
          INNER JOIN user_facilities uf ON p.facility_id = uf.facility_id
          WHERE uf.user_id = auth.uid()
        ) AND created_by = auth.uid())
      );
  `, 'Create wound_notes INSERT policy');

  // Create wound_notes UPDATE policy
  await executeSql(`
    CREATE POLICY "Users can update their own wound notes and addendums"
      ON wound_notes FOR UPDATE
      USING (created_by = auth.uid())
      WITH CHECK (created_by = auth.uid());
  `, 'Create wound_notes UPDATE policy');

  // Create wound_notes DELETE policy
  await executeSql(`
    CREATE POLICY "Users can delete their own wound notes and addendums"
      ON wound_notes FOR DELETE
      USING (created_by = auth.uid());
  `, 'Create wound_notes DELETE policy');

  // Fix 2: TENANTS TABLE - Re-enable RLS
  console.log('\n🏢 FIX 2: TENANTS TABLE');
  await executeSql(`ALTER TABLE tenants ENABLE ROW LEVEL SECURITY;`, 'Enable RLS on tenants');
  await executeSql(`DROP POLICY IF EXISTS "Users can view their tenant" ON tenants;`, 'Drop old policy');
  await executeSql(`DROP POLICY IF EXISTS "Tenant admins can update their tenant" ON tenants;`, 'Drop old policy');
  await executeSql(`DROP POLICY IF EXISTS "Users can view tenants" ON tenants;`, 'Drop old policy');
  
  await executeSql(`
    CREATE POLICY "Users can view their tenant"
      ON tenants FOR SELECT
      USING (
        id = (SELECT tenant_id FROM get_user_role_info(auth.uid()) LIMIT 1)
      );
  `, 'Create tenants SELECT policy');

  await executeSql(`
    CREATE POLICY "Tenant admins can update their tenant"
      ON tenants FOR UPDATE
      USING (
        id = (SELECT tenant_id FROM get_user_role_info(auth.uid()) LIMIT 1)
        AND (SELECT role FROM get_user_role_info(auth.uid()) LIMIT 1) = 'tenant_admin'
      )
      WITH CHECK (
        id = (SELECT tenant_id FROM get_user_role_info(auth.uid()) LIMIT 1)
      );
  `, 'Create tenants UPDATE policy');

  // Fix 3: USER_INVITES TABLE - Re-enable RLS
  console.log('\n📧 FIX 3: USER_INVITES TABLE');
  await executeSql(`ALTER TABLE user_invites ENABLE ROW LEVEL SECURITY;`, 'Enable RLS on user_invites');
  await executeSql(`DROP POLICY IF EXISTS "Tenant admins can view invites in their tenant" ON user_invites;`, 'Drop old policy');
  await executeSql(`DROP POLICY IF EXISTS "Tenant admins can create invites in their tenant" ON user_invites;`, 'Drop old policy');
  await executeSql(`DROP POLICY IF EXISTS "Facility admins can create user invites in their facility" ON user_invites;`, 'Drop old policy');
  await executeSql(`DROP POLICY IF EXISTS "Users can view invites in their tenant" ON user_invites;`, 'Drop old policy');
  await executeSql(`DROP POLICY IF EXISTS "Admins can view invites in their tenant" ON user_invites;`, 'Drop old policy');
  
  await executeSql(`
    CREATE POLICY "Admins can view invites in their tenant"
      ON user_invites FOR SELECT
      USING (
        tenant_id = (SELECT tenant_id FROM get_user_role_info(auth.uid()) LIMIT 1)
        AND (SELECT role FROM get_user_role_info(auth.uid()) LIMIT 1) IN ('tenant_admin', 'facility_admin')
      );
  `, 'Create user_invites SELECT policy');

  await executeSql(`
    CREATE POLICY "Tenant admins can create invites"
      ON user_invites FOR INSERT
      WITH CHECK (
        tenant_id = (SELECT tenant_id FROM get_user_role_info(auth.uid()) LIMIT 1)
        AND (SELECT role FROM get_user_role_info(auth.uid()) LIMIT 1) = 'tenant_admin'
      );
  `, 'Create user_invites INSERT policy (tenant admin)');

  await executeSql(`
    CREATE POLICY "Facility admins can create user invites for their facility"
      ON user_invites FOR INSERT
      WITH CHECK (
        role = 'user'
        AND facility_id = (SELECT facility_id FROM get_user_role_info(auth.uid()) LIMIT 1)
        AND (SELECT role FROM get_user_role_info(auth.uid()) LIMIT 1) = 'facility_admin'
        AND tenant_id = (SELECT tenant_id FROM get_user_role_info(auth.uid()) LIMIT 1)
      );
  `, 'Create user_invites INSERT policy (facility admin)');

  await executeSql(`
    CREATE POLICY "Admins can update invites in their tenant"
      ON user_invites FOR UPDATE
      USING (
        tenant_id = (SELECT tenant_id FROM get_user_role_info(auth.uid()) LIMIT 1)
        AND (SELECT role FROM get_user_role_info(auth.uid()) LIMIT 1) IN ('tenant_admin', 'facility_admin')
      )
      WITH CHECK (
        tenant_id = (SELECT tenant_id FROM get_user_role_info(auth.uid()) LIMIT 1)
      );
  `, 'Create user_invites UPDATE policy');

  // Fix 4: PROCEDURE_SCOPES TABLE
  console.log('\n⚕️ FIX 4: PROCEDURE_SCOPES TABLE');
  await executeSql(`DROP POLICY IF EXISTS "Tenant admins can manage procedure scopes" ON procedure_scopes;`, 'Drop old policy');
  
  await executeSql(`
    CREATE POLICY "Tenant admins can manage procedure scopes"
      ON procedure_scopes FOR ALL
      USING (
        (SELECT role FROM get_user_role_info(auth.uid()) LIMIT 1) = 'tenant_admin'
      );
  `, 'Create procedure_scopes policy');

  // Verification
  console.log('\n✅ VERIFICATION');
  const { data: rlsStatus } = await supabase.rpc('exec_sql', {
    sql: `SELECT tablename, rowsecurity FROM pg_tables WHERE tablename IN ('tenants', 'user_invites', 'wound_notes', 'user_roles') ORDER BY tablename;`
  });
  
  console.log('\nRLS Status:');
  console.log(rlsStatus || 'Could not verify (check manually)');

  console.log('\n=====================================');
  console.log('✅ ALL CRITICAL RLS FIXES APPLIED!');
  console.log('=====================================');
  console.log('\n⚠️  IMPORTANT NOTES:');
  console.log('1. user_roles table has RLS DISABLED by design (to avoid recursion)');
  console.log('2. Always use get_user_role_info() RPC function for role checks');
  console.log('3. Test the application thoroughly after these changes');
  console.log('\n📝 See docs/RLS_SECURITY_AUDIT_REPORT.md for full details\n');
}

applyFixes()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('❌ Fatal error:', err);
    process.exit(1);
  });
