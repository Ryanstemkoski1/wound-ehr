#!/usr/bin/env node

/**
 * Manually confirm a user's email
 * Run with: node scripts/confirm-user.js <email>
 */

const { createClient } = require("@supabase/supabase-js");
require("dotenv").config({ path: ".env.local" });

const email = process.argv[2];

if (!email) {
  console.error("❌ Please provide an email address");
  console.log("Usage: node scripts/confirm-user.js <email>");
  process.exit(1);
}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error("❌ Missing environment variables");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

async function confirmUser() {
  console.log("\n🔧 Confirming email for:", email);
  
  // Get user
  const { data: authUsers, error: listError } = await supabase.auth.admin.listUsers();
  
  if (listError) {
    console.error("❌ Error fetching users:", listError.message);
    return;
  }

  const user = authUsers.users.find((u) => u.email === email);

  if (!user) {
    console.error("❌ User not found");
    return;
  }

  // Update user to confirm email
  const { data, error } = await supabase.auth.admin.updateUserById(user.id, {
    email_confirm: true,
  });

  if (error) {
    console.error("❌ Error confirming user:", error.message);
    return;
  }

  console.log("✅ Email confirmed successfully!");
  console.log("   User ID:", user.id);
  console.log("   Email:", email);
  console.log("\n✨ User can now login at http://localhost:3000/login\n");
}

confirmUser().catch(console.error);
