import { getAdminTranscripts } from "@/app/actions/ai-transcription";
import TranscriptsManagementClient from "@/components/admin/transcripts-management-client";

export const dynamic = "force-dynamic";

export default async function AdminTranscriptsPage() {
  const result = await getAdminTranscripts();
  const transcripts = result.transcripts ?? [];
  const stats = result.stats ?? {
    total: 0,
    byStatus: {},
    totalCostTranscription: 0,
    totalCostLlm: 0,
    audioStorageCount: 0,
    expiredAudioCount: 0,
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">AI Transcripts</h1>
        <p className="text-muted-foreground">
          Manage AI-generated clinical notes, audio recordings, and retention
          policies
        </p>
      </div>

      <TranscriptsManagementClient
        initialTranscripts={transcripts}
        initialStats={stats}
      />
    </div>
  );
}
