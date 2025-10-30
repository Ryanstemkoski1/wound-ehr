import { notFound } from "next/navigation";
import FacilityForm from "@/components/facilities/facility-form";
import { createClient } from "@/lib/supabase/server";

export default async function EditFacilityPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    notFound();
  }

  // Check if user has access to this facility
  const { data: userFacility } = await supabase
    .from("user_facilities")
    .select("facility_id")
    .eq("user_id", user.id)
    .eq("facility_id", id)
    .maybeSingle();

  if (!userFacility) {
    notFound();
  }

  const { data: facility, error } = await supabase
    .from("facilities")
    .select("*")
    .eq("id", id)
    .single();

  if (error || !facility) {
    notFound();
  }

  return <FacilityForm facility={facility} />;
}
