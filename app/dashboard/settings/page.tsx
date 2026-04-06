import { getUserPreferences } from "@/app/actions/preferences";
import SettingsClient from "@/components/settings/settings-client";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const result = await getUserPreferences();
  const preferences = result.preferences ?? {
    pdf_include_photos: true,
    pdf_photo_size: "medium" as const,
    pdf_max_photos_per_assessment: 2,
    pdf_page_size: "letter" as const,
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Settings</h1>
        <p className="text-muted-foreground">
          Manage your PDF export and display preferences
        </p>
      </div>

      <SettingsClient initialPreferences={preferences} />
    </div>
  );
}
