// Script to manually delete a user account completely
// Usage: node scripts/delete-user.js <email>

require("dotenv").config({ path: ".env.local" });
const { createClient } = require("@supabase/supabase-js");

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function deleteUserByEmail(email) {
  console.log(`\n🔍 Looking for user: ${email}\n`);

  try {
    // Find user in auth.users
    const { data: authUsers, error: authError } =
      await supabase.auth.admin.listUsers();

    if (authError) {
      console.error("❌ Error listing auth users:", authError);
      return;
    }

    const user = authUsers.users.find((u) => u.email === email);

    if (!user) {
      console.log(`❌ User not found: ${email}`);
      return;
    }

    console.log(`✅ Found user:`);
    console.log(`   ID: ${user.id}`);
    console.log(`   Email: ${user.email}`);
    console.log(`   Created: ${user.created_at}`);

    // Check user_roles
    const { data: roles, error: rolesError } = await supabase
      .from("user_roles")
      .select("*")
      .eq("user_id", user.id);

    if (!rolesError && roles) {
      console.log(`\n   User Roles: ${roles.length}`);
      roles.forEach((role) => {
        console.log(`   - ${role.role} in tenant ${role.tenant_id}`);
      });
    }

    // Delete the user
    console.log(`\n🗑️  Deleting user from auth.users...`);
    const { error: deleteError } = await supabase.auth.admin.deleteUser(
      user.id
    );

    if (deleteError) {
      console.error("❌ Error deleting user:", deleteError);
      return;
    }

    console.log(`✅ User deleted successfully!`);
    console.log(`\n   The user can no longer log in.`);
    console.log(
      `   Database records in 'users' and 'user_roles' tables were cascade deleted.`
    );
  } catch (error) {
    console.error("❌ Unexpected error:", error);
  }
}

// Get email from command line argument
const email = process.argv[2];

if (!email) {
  console.log("Usage: node scripts/delete-user.js <email>");
  console.log("Example: node scripts/delete-user.js user@example.com");
  process.exit(1);
}

deleteUserByEmail(email);
