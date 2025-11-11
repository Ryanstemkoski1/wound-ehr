// Update a user's role for testing
import { createClient } from "@supabase/supabase-js";
import * as dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function updateUserRole() {
  const email = process.argv[2];
  const newRole = process.argv[3] as "tenant_admin" | "facility_admin" | "user";

  if (!email || !newRole) {
    console.error("Usage: npx tsx scripts/update-user-role.ts <email> <role>");
    console.error("Roles: tenant_admin, facility_admin, user");
    process.exit(1);
  }

  if (!["tenant_admin", "facility_admin", "user"].includes(newRole)) {
    console.error("Invalid role. Must be: tenant_admin, facility_admin, or user");
    process.exit(1);
  }

  try {
    // Get user by email
    const { data: authData, error: authError } =
      await supabase.auth.admin.listUsers();

    if (authError) throw authError;

    const user = authData.users.find((u) => u.email === email);
    if (!user) {
      console.error(`❌ User not found: ${email}`);
      process.exit(1);
    }

    // Update role
    const { error: updateError } = await supabase
      .from("user_roles")
      .update({ role: newRole })
      .eq("user_id", user.id);

    if (updateError) throw updateError;

    console.log(`✅ Updated ${email} to role: ${newRole}`);
  } catch (error) {
    console.error("❌ Error:", error);
    process.exit(1);
  }
}

updateUserRole();
