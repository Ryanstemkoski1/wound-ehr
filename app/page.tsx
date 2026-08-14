// Role-aware root redirect for the field surface.
// Unauthenticated → /login; office admins → /inbox; everyone else
// (field nurses and other clinical users) → /visits.

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getUserRole } from "@/lib/rbac";

export default async function Home() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const role = await getUserRole();

  if (role?.role === "tenant_admin" || role?.role === "facility_admin") {
    redirect("/inbox");
  }

  redirect("/visits");
}
