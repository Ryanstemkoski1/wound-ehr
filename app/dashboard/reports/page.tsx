/**
 * Reports Dashboard Page
 * Main hub for all reporting functionality
 */

import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { ReportsClient } from "@/components/reports/reports-client";

export const dynamic = "force-dynamic";

export default async function ReportsPage() {
  const supabase = await createClient();

  // Check authentication
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  // Fetch facilities
  const { data: facilities } = await supabase
    .from("facilities")
    .select("id, name")
    .order("name");

  // Fetch clinicians (users who have conducted visits)
  const { data: clinicians } = await supabase
    .from("users")
    .select("id, first_name, last_name, credentials, role")
    .in("role", ["admin", "clinician"])
    .order("last_name");

  // Fetch patients for medical records requests
  const { data: patients } = await supabase
    .from("patients")
    .select("id, first_name, last_name, mrn")
    .order("last_name");

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Reports</h1>
        <p className="text-muted-foreground">
          Generate and export reports for visits, clinicians, facilities, and
          patient records
        </p>
      </div>

      <ReportsClient
        facilities={facilities || []}
        clinicians={
          clinicians?.map((c) => ({
            id: c.id,
            name: `${c.last_name}, ${c.first_name}`,
            credentials: c.credentials || undefined,
          })) || []
        }
        patients={patients || []}
      />
    </div>
  );
}
