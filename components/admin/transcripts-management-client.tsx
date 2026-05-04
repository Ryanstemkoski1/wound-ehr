"use client";

import { useState, startTransition } from "react";
import Link from "next/link";
import {
  FileAudio,
  Trash2,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Loader2,
  XCircle,
  DollarSign,
  HardDrive,
  Activity,
  Play,
  RefreshCw,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import {
  getAdminTranscripts,
  cleanupExpiredAudio,
  deleteVisitAudio,
  getAudioPlaybackUrl,
  type AdminTranscript,
  type TranscriptStats,
} from "@/app/actions/ai-transcription";

type Props = {
  initialTranscripts: AdminTranscript[];
  initialStats: TranscriptStats;
};

const statusConfig: Record<
  string,
  { label: string; icon: React.ReactNode; variant: string }
> = {
  pending: {
    label: "Pending",
    icon: <Clock className="h-3.5 w-3.5" />,
    variant:
      "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300",
  },
  processing: {
    label: "Processing",
    icon: <Loader2 className="h-3.5 w-3.5 animate-spin" />,
    variant: "bg-primary/10 text-primary",
  },
  completed: {
    label: "Completed",
    icon: <CheckCircle2 className="h-3.5 w-3.5" />,
    variant:
      "bg-green-100 text-green-800 dark:bg-green-950 dark:text-green-300",
  },
  failed: {
    label: "Failed",
    icon: <XCircle className="h-3.5 w-3.5" />,
    variant: "bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300",
  },
  deleted: {
    label: "Audio Deleted",
    icon: <Trash2 className="h-3.5 w-3.5" />,
    variant: "bg-muted text-muted-foreground",
  },
};

function formatDuration(seconds: number | null) {
  if (!seconds) return "—";
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

function formatBytes(bytes: number | null) {
  if (!bytes) return "—";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatCost(amount: number | null) {
  if (!amount) return "$0.00";
  return `$${Number(amount).toFixed(4)}`;
}

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export default function TranscriptsManagementClient({
  initialTranscripts,
  initialStats,
}: Props) {
  const [transcripts, setTranscripts] =
    useState<AdminTranscript[]>(initialTranscripts);
  const [stats, setStats] = useState<TranscriptStats>(initialStats);
  const [statusFilter, setStatusFilter] = useState("all");
  const [refreshing, setRefreshing] = useState(false);
  const [cleanupDialog, setCleanupDialog] = useState(false);
  const [cleaning, setCleaning] = useState(false);
  const [cleanupResult, setCleanupResult] = useState<string | null>(null);
  const [playingId, setPlayingId] = useState<string | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);

  const refresh = async (statusOverride?: string) => {
    setRefreshing(true);
    try {
      const filter = statusOverride ?? statusFilter;
      const result = await getAdminTranscripts(
        filter !== "all" ? { status: filter } : undefined
      );
      startTransition(() => {
        setTranscripts(result.transcripts ?? []);
        if (result.stats) setStats(result.stats);
      });
    } finally {
      setRefreshing(false);
    }
  };

  const handleStatusFilterChange = (value: string) => {
    setStatusFilter(value);
    refresh(value);
  };

  const handleCleanup = async () => {
    setCleaning(true);
    setCleanupResult(null);
    try {
      const result = await cleanupExpiredAudio(false);
      if (result.error) {
        setCleanupResult(`Error: ${result.error}`);
      } else {
        setCleanupResult(
          `Successfully deleted ${result.deleted} of ${result.candidates} expired audio files.`
        );
        await refresh();
      }
    } catch {
      setCleanupResult("An unexpected error occurred.");
    } finally {
      setCleaning(false);
    }
  };

  const handleDeleteAudio = async (transcriptId: string) => {
    const result = await deleteVisitAudio(transcriptId);
    if (!result.error) {
      await refresh();
    }
  };

  const handlePlayAudio = async (transcriptId: string) => {
    if (playingId === transcriptId) {
      setPlayingId(null);
      setAudioUrl(null);
      return;
    }
    const result = await getAudioPlaybackUrl(transcriptId);
    if (result.url) {
      setPlayingId(transcriptId);
      setAudioUrl(result.url);
    }
  };

  const totalCost = stats.totalCostTranscription + stats.totalCostLlm;

  return (
    <div className="space-y-6">
      {/* Stats cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">
              Total Transcripts
            </CardTitle>
            <Activity className="text-muted-foreground h-4 w-4" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
            <p className="text-muted-foreground text-xs">
              {stats.byStatus["completed"] ?? 0} completed,{" "}
              {stats.byStatus["failed"] ?? 0} failed
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total AI Cost</CardTitle>
            <DollarSign className="text-muted-foreground h-4 w-4" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${totalCost.toFixed(2)}</div>
            <p className="text-muted-foreground text-xs">
              Whisper: {formatCost(stats.totalCostTranscription)} · GPT-4:{" "}
              {formatCost(stats.totalCostLlm)}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">
              Audio in Storage
            </CardTitle>
            <HardDrive className="text-muted-foreground h-4 w-4" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.audioStorageCount}</div>
            <p className="text-muted-foreground text-xs">
              {stats.expiredAudioCount > 0 ? (
                <span className="text-amber-600 dark:text-amber-400">
                  {stats.expiredAudioCount} past retention (90 days)
                </span>
              ) : (
                "None past retention period"
              )}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">
              Retention Cleanup
            </CardTitle>
            <Trash2 className="text-muted-foreground h-4 w-4" />
          </CardHeader>
          <CardContent>
            {stats.expiredAudioCount > 0 ? (
              <Button
                variant="destructive"
                size="sm"
                onClick={() => setCleanupDialog(true)}
              >
                <Trash2 className="mr-1.5 h-3.5 w-3.5" />
                Clean {stats.expiredAudioCount} file
                {stats.expiredAudioCount !== 1 ? "s" : ""}
              </Button>
            ) : (
              <p className="text-muted-foreground text-sm">
                No expired audio to clean
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Filters + Table */}
      <Card>
        <CardHeader className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <CardTitle>All Transcripts</CardTitle>
          <div className="flex items-center gap-2">
            <Select
              value={statusFilter}
              onValueChange={handleStatusFilterChange}
            >
              <SelectTrigger className="w-40">
                <SelectValue placeholder="Filter status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="processing">Processing</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
                <SelectItem value="failed">Failed</SelectItem>
                <SelectItem value="deleted">Deleted</SelectItem>
              </SelectContent>
            </Select>
            <Button
              variant="outline"
              size="icon"
              onClick={() => refresh()}
              disabled={refreshing}
            >
              <RefreshCw
                className={cn("h-4 w-4", refreshing && "animate-spin")}
              />
            </Button>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Patient</TableHead>
                  <TableHead>Visit Date</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Duration</TableHead>
                  <TableHead>Size</TableHead>
                  <TableHead>Cost</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {transcripts.length === 0 && (
                  <TableRow>
                    <TableCell
                      colSpan={8}
                      className="text-muted-foreground py-12 text-center"
                    >
                      <FileAudio className="mx-auto mb-2 h-8 w-8 opacity-40" />
                      No transcripts found
                    </TableCell>
                  </TableRow>
                )}
                {transcripts.map((t) => {
                  const status =
                    statusConfig[t.processing_status] ?? statusConfig.pending;
                  const patient = t.visit?.patient;
                  const cost =
                    Number(t.cost_transcription ?? 0) + Number(t.cost_llm ?? 0);

                  return (
                    <TableRow key={t.id}>
                      <TableCell>
                        {patient ? (
                          <Link
                            href={`/dashboard/patients/${patient.id}`}
                            className="font-medium hover:underline"
                          >
                            {patient.last_name}, {patient.first_name}
                          </Link>
                        ) : (
                          <span className="text-muted-foreground">Unknown</span>
                        )}
                        {patient?.mrn && (
                          <span className="text-muted-foreground ml-1.5 text-xs">
                            #{patient.mrn}
                          </span>
                        )}
                      </TableCell>
                      <TableCell className="text-sm">
                        {t.visit?.visit_date
                          ? new Date(t.visit.visit_date).toLocaleDateString()
                          : "—"}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant="secondary"
                          className={cn(
                            "inline-flex items-center gap-1",
                            status.variant
                          )}
                        >
                          {status.icon}
                          {status.label}
                        </Badge>
                        {t.clinician_approved_at && (
                          <Badge
                            variant="outline"
                            className="ml-1 text-[0.6rem]"
                          >
                            Approved
                          </Badge>
                        )}
                        {t.error_message && (
                          <p className="mt-0.5 max-w-48 truncate text-xs text-red-500">
                            {t.error_message}
                          </p>
                        )}
                      </TableCell>
                      <TableCell className="text-sm">
                        {formatDuration(t.audio_duration_seconds)}
                      </TableCell>
                      <TableCell className="text-sm">
                        {formatBytes(t.audio_size_bytes)}
                      </TableCell>
                      <TableCell className="text-sm">
                        {cost > 0 ? formatCost(cost) : "—"}
                      </TableCell>
                      <TableCell className="text-xs">
                        {formatDate(t.created_at)}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          {t.audio_url && (
                            <>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7"
                                title="Play audio"
                                onClick={() => handlePlayAudio(t.id)}
                              >
                                <Play className="h-3.5 w-3.5" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7 text-red-500 hover:text-red-600"
                                title="Delete audio"
                                onClick={() => handleDeleteAudio(t.id)}
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </Button>
                            </>
                          )}
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 text-xs"
                            asChild
                          >
                            <Link
                              href={`/dashboard/patients/${patient?.id}/visits/${t.visit_id}`}
                            >
                              View
                            </Link>
                          </Button>
                        </div>
                        {playingId === t.id && audioUrl && (
                          <div className="mt-2">
                            <audio
                              controls
                              autoPlay
                              src={audioUrl}
                              className="h-8 w-full"
                              onEnded={() => {
                                setPlayingId(null);
                                setAudioUrl(null);
                              }}
                            />
                          </div>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Cleanup confirmation dialog */}
      <Dialog open={cleanupDialog} onOpenChange={setCleanupDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-amber-500" />
              Audio Retention Cleanup
            </DialogTitle>
            <DialogDescription>
              This will permanently delete {stats.expiredAudioCount} audio file
              {stats.expiredAudioCount !== 1 ? "s" : ""} older than 90 days.
              Written transcripts and clinical notes will be preserved as part
              of the permanent medical record. This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          {cleanupResult && (
            <p
              className={cn(
                "rounded-md border px-3 py-2 text-sm",
                cleanupResult.startsWith("Error")
                  ? "border-red-200 bg-red-50 text-red-700"
                  : "border-green-200 bg-green-50 text-green-700"
              )}
            >
              {cleanupResult}
            </p>
          )}
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setCleanupDialog(false);
                setCleanupResult(null);
              }}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleCleanup}
              disabled={cleaning}
            >
              {cleaning ? (
                <>
                  <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                  Cleaning…
                </>
              ) : (
                <>
                  <Trash2 className="mr-1.5 h-3.5 w-3.5" />
                  Delete Expired Audio
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
