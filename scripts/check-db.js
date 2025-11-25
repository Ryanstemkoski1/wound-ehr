// Check database state
import { createClient } from "@supabase/supabase-js";
import "dotenv/config";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

async function check() {
  const { data: tenants } = await supabase.from("tenants").select("*");
  console.log("Tenants:", tenants);

  const { data: facilities } = await supabase
    .from("facilities")
    .select("id, name");
  console.log("Facilities:", facilities);
}

check();
