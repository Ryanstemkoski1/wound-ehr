require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function checkUsers() {
  console.log('\n=== CHECKING ALL USERS ===\n');
  
  const { data: users } = await supabase
    .from('users')
    .select('id, name, email, credentials')
    .order('created_at');
  
  console.log(`Total users in database: ${users.length}\n`);
  
  users.forEach((u, i) => {
    console.log(`${i + 1}. ${u.name || 'No Name'} (${u.credentials || 'None'})`);
    console.log(`   Email: ${u.email}`);
    console.log(`   ID: ${u.id}`);
  });
  
  console.log('\n=== CHECKING USER ROLES ===\n');
  
  const { data: roles } = await supabase
    .from('user_roles')
    .select('user_id, role, tenant_id, facility_id');
  
  console.log(`Total user roles: ${roles.length}\n`);
  
  const userRoleMap = {};
  roles.forEach(r => {
    if (!userRoleMap[r.user_id]) userRoleMap[r.user_id] = [];
    userRoleMap[r.user_id].push(r);
  });
  
  users.forEach(u => {
    const userRoles = userRoleMap[u.id] || [];
    if (userRoles.length === 0) {
      console.log(`⚠️  ${u.name} - NO ROLE ASSIGNED!`);
    }
  });
}

checkUsers().catch(console.error);
