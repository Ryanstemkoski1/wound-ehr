import { getUserPreferences } from "@/app/actions/preferences";
import SettingsClient from "@/components/settings/settings-client";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const [result, facilitiesResult] = await Promise.all([
    getUserPreferences(),
    supabase
      .from("user_facilities")
      .select("facility_id, facilities!inner(id, name)")
      .eq("user_id", user.id),
  ]);

  const preferences = result.preferences ?? {
    pdf_include_photos: true,
    pdf_photo_size: "medium" as const,
    pdf_max_photos_per_assessment: 2,
    pdf_page_size: "letter" as const,
  };

  const facilities = (facilitiesResult.data ?? []).map((uf) => {
    const f = Array.isArray(uf.facilities) ? uf.facilities[0] : uf.facilities;
    return {
      id: (f as { id: string; name: string }).id,
      name: (f as { id: string; name: string }).name,
    };
  });

  return (
    <div className="space-y-6">
      <div className="page-hero">
        <h1 className="text-3xl font-bold tracking-tight">Settings</h1>
        <p className="text-muted-foreground mt-1">
          Manage your display, PDF, and notification preferences
        </p>
      </div>

      <SettingsClient
        initialPreferences={preferences}
        facilities={facilities}
      />
    </div>
  );
}
