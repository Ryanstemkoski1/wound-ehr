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
    <div className="container mx-auto px-4 py-8">
      <div className="mb-6">
        <h1 className="text-3xl font-bold">Corrections Needed</h1>
        <p className="text-muted-foreground">
          Visit notes that require corrections from the office
        </p>
      </div>
      <CorrectionsListClient corrections={corrections || []} />
    </div>
  );
}
