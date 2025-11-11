// Clean up pending invites for users who already have accounts
import { createClient } from "@supabase/supabase-js";
import * as dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function cleanupInvites() {
  try {
    console.log("🧹 Cleaning up pending invites...\n");

    // Get all pending invites
    const { data: pendingInvites, error: invitesError } = await supabase
      .from("user_invites")
      .select("*")
      .is("accepted_at", null);

    if (invitesError) throw invitesError;

    console.log(`Found ${pendingInvites.length} pending invites`);

    // Get all users
    const { data: authData, error: authError } =
      await supabase.auth.admin.listUsers();

    if (authError) throw authError;

    const userEmails = new Set(authData.users.map((u) => u.email));

    // Mark invites as accepted for users who already signed up
    let cleaned = 0;
    for (const invite of pendingInvites) {
      if (userEmails.has(invite.email)) {
        const { error: updateError } = await supabase
          .from("user_invites")
          .update({
            accepted_at: new Date().toISOString(),
          })
          .eq("id", invite.id);

        if (updateError) {
          console.error(`❌ Failed to update invite for ${invite.email}`);
        } else {
          console.log(`✅ Marked invite as accepted: ${invite.email}`);
          cleaned++;
        }
      }
    }

    console.log(`\n✅ Cleaned up ${cleaned} outdated invites`);
  } catch (error) {
    console.error("❌ Error:", error);
    process.exit(1);
  }
}

cleanupInvites();
