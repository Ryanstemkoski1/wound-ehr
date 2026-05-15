import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCorrectionsForClinician } from "@/app/actions/approval-workflow";
import { CorrectionsListClient } from "@/components/dashboard/corrections-list-client";

export const dynamic = "force-dynamic";

export default async function CorrectionsPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: corrections } = await getCorrectionsForClinician(user.id);

  return (
    <div className="space-y-6">
      <div className="page-hero">
        <h1 className="text-3xl font-bold tracking-tight">
          Corrections Needed
        </h1>
        <p className="text-muted-foreground mt-1">
          Visit notes that require corrections from the office
        </p>
      </div>
      <CorrectionsListClient corrections={corrections || []} />
    </div>
  );
}
