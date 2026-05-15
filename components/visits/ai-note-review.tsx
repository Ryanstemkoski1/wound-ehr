"use client";

import { useState, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  CheckCircle,
  Edit3,
  RotateCcw,
  Trash2,
  Loader2,
  FileText,
  BrainCircuit,
  Clock,
  DollarSign,
  Volume2,
  Pause,
  Play,
  Eye,
  Copy,
  Check,
  Undo2,
  AlertTriangle,
  RefreshCw,
} from "lucide-react";
import {
  approveAINote,
  rejectAINote,
  regenerateAINote,
  getAudioPlaybackUrl,
} from "@/app/actions/ai-transcription";

// =====================================================
// TYPES
// =====================================================

type AIReviewTranscript = {
  id: string;
  visit_id: string;
  transcript_raw: string | null;
  transcript_clinical: string | null;
  final_note: string | null;
  clinician_edited: boolean;
  clinician_approved_at: string | null;
  approved_by: string | null;
  audio_duration_seconds: number | null;
  audio_filename: string | null;
  audio_url: string | null;
  cost_transcription: number | null;
  cost_llm: number | null;
  processing_status: string;
  transcript_metadata: Record<string, unknown> | null;
  error_message: string | null;
};

type AIReviewProps = {
  transcript: AIReviewTranscript;
  visitId: string;
  isEditable: boolean;
};

// =====================================================
// SECTION PARSER
// =====================================================

type NoteSection = {
  heading: string;
  content: string;
};

/**
 * Parse the clinical note into sections based on standard headings
 */
function parseNoteSections(note: string): NoteSection[] {
  const headingPattern =
    /^(CHIEF COMPLAINT|WOUND ASSESSMENT|TREATMENT PROVIDED|CLINICAL REASONING|PLAN OF CARE|PATIENT EDUCATION|SUBJECTIVE|OBJECTIVE|ASSESSMENT|PLAN|HPI|HISTORY OF PRESENT ILLNESS|ROS|REVIEW OF SYSTEMS|PHYSICAL EXAM):\s*$/gim;

  const sections: NoteSection[] = [];
  const lines = note.split("\n");
  let currentHeading = "";
  let currentContent: string[] = [];

  for (const line of lines) {
    const trimmed = line.trim();
    // Check if this line is a section heading
    const isHeading =
      /^[A-Z][A-Z &/]+:$/.test(trimmed) || headingPattern.test(trimmed);
    headingPattern.lastIndex = 0; // Reset regex

    if (isHeading) {
      // Save previous section
      if (currentHeading || currentContent.length > 0) {
        sections.push({
          heading: currentHeading,
          content: currentContent.join("\n").trim(),
        });
      }
      currentHeading = trimmed.replace(/:$/, "");
      currentContent = [];
    } else {
      currentContent.push(line);
    }
  }

  // Save last section
  if (currentHeading || currentContent.length > 0) {
    sections.push({
      heading: currentHeading,
      content: currentContent.join("\n").trim(),
    });
  }

  return sections;
}

// =====================================================
// FORMATTED NOTE VIEWER
// =====================================================

function FormattedNoteView({ note }: { note: string }) {
  const sections = parseNoteSections(note);

  if (sections.length <= 1) {
    // No sections detected — render as plain text
    return (
      <div className="text-sm leading-relaxed whitespace-pre-wrap">{note}</div>
    );
  }

  return (
    <div className="space-y-4">
      {sections.map((section, idx) => (
        <div key={idx}>
          {section.heading && (
            <h4 className="mb-1 text-sm font-bold tracking-wide text-teal-700 uppercase dark:text-teal-400">
              {section.heading}
            </h4>
          )}
          <div className="text-sm leading-relaxed whitespace-pre-wrap text-zinc-800 dark:text-zinc-200">
            {section.content || (
              <span className="text-zinc-400 italic">Not documented</span>
            )}
          </div>
          {idx < sections.length - 1 && <Separator className="mt-3" />}
        </div>
      ))}
    </div>
  );
}

// =====================================================
// AUDIO PLAYER
// =====================================================

function TranscriptAudioPlayer({
  transcriptId,
  filename,
  duration,
}: {
  transcriptId: string;
  filename: string | null;
  duration: number | null;
}) {
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentTime, setCurrentTime] = useState(0);
  const [audioDuration, setAudioDuration] = useState(duration ?? 0);
  const [playbackRate, setPlaybackRate] = useState(1);
  const audioRef = useRef<HTMLAudioElement>(null);
  const progressRef = useRef<HTMLDivElement>(null);

  const loadAudio = useCallback(async () => {
    if (audioUrl) return;
    setIsLoading(true);
    setError(null);
    try {
      const result = await getAudioPlaybackUrl(transcriptId);
      if (result.error || !result.url) {
        setError(result.error || "Could not load audio");
        return;
      }
      setAudioUrl(result.url);
    } catch {
      setError("Failed to load audio");
    } finally {
      setIsLoading(false);
    }
  }, [transcriptId, audioUrl]);

  const togglePlayback = useCallback(async () => {
    if (!audioUrl) {
      await loadAudio();
      return;
    }
    const audio = audioRef.current;
    if (!audio) return;

    if (isPlaying) {
      audio.pause();
      setIsPlaying(false);
    } else {
      await audio.play();
      setIsPlaying(true);
    }
  }, [audioUrl, isPlaying, loadAudio]);

  const handleSeek = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      const audio = audioRef.current;
      const bar = progressRef.current;
      if (!audio || !bar || !audioDuration) return;
      const rect = bar.getBoundingClientRect();
      const pct = Math.max(
        0,
        Math.min(1, (e.clientX - rect.left) / rect.width)
      );
      audio.currentTime = pct * audioDuration;
      setCurrentTime(audio.currentTime);
    },
    [audioDuration]
  );

  const cycleSpeed = useCallback(() => {
    const speeds = [1, 1.25, 1.5, 2, 0.75];
    const idx = speeds.indexOf(playbackRate);
    const next = speeds[(idx + 1) % speeds.length];
    setPlaybackRate(next);
    if (audioRef.current) audioRef.current.playbackRate = next;
  }, [playbackRate]);

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    return `${m}:${s.toString().padStart(2, "0")}`;
  };

  const progress = audioDuration > 0 ? (currentTime / audioDuration) * 100 : 0;

  return (
    <div className="overflow-hidden rounded-md border bg-zinc-50 dark:bg-zinc-900">
      {/* Top row: controls + filename */}
      <div className="flex items-center gap-2 px-3 py-2">
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 shrink-0"
          onClick={togglePlayback}
          disabled={isLoading}
        >
          {isLoading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : isPlaying ? (
            <Pause className="h-4 w-4" />
          ) : (
            <Play className="h-4 w-4" />
          )}
        </Button>
        <div className="min-w-0 flex-1">
          <p className="truncate text-xs font-medium">
            {filename || "Visit Recording"}
          </p>
        </div>
        {/* Playback speed */}
        <button
          type="button"
          onClick={cycleSpeed}
          className="text-muted-foreground hover:text-foreground shrink-0 rounded px-1.5 py-0.5 text-[0.65rem] font-medium transition-colors"
          title="Playback speed"
        >
          {playbackRate}×
        </button>
        <Volume2 className="h-3.5 w-3.5 shrink-0 text-zinc-400" />
      </div>

      {/* Progress bar */}
      {audioUrl && (
        <div className="px-3 pb-2">
          <div
            ref={progressRef}
            onClick={handleSeek}
            className="group relative h-1.5 cursor-pointer rounded-full bg-zinc-200 dark:bg-zinc-700"
            role="progressbar"
            aria-valuenow={currentTime}
            aria-valuemax={audioDuration}
          >
            <div
              className="h-full rounded-full bg-teal-500 transition-[width] duration-150"
              style={{ width: `${progress}%` }}
            />
            {/* Scrub handle */}
            <div
              className="absolute top-1/2 h-3 w-3 -translate-y-1/2 rounded-full bg-teal-600 opacity-0 shadow-sm transition-opacity group-hover:opacity-100"
              style={{ left: `calc(${progress}% - 6px)` }}
            />
          </div>
          <div className="mt-1 flex justify-between text-[0.6rem] text-zinc-400">
            <span>{formatTime(currentTime)}</span>
            <span>{formatTime(audioDuration)}</span>
          </div>
        </div>
      )}

      {audioUrl && (
        <audio
          ref={audioRef}
          src={audioUrl}
          onTimeUpdate={() => {
            if (audioRef.current) setCurrentTime(audioRef.current.currentTime);
          }}
          onLoadedMetadata={() => {
            if (audioRef.current) {
              setAudioDuration(audioRef.current.duration);
              audioRef.current.playbackRate = playbackRate;
            }
          }}
          onEnded={() => setIsPlaying(false)}
          onPause={() => setIsPlaying(false)}
          onPlay={() => setIsPlaying(true)}
          hidden
        />
      )}
      {error && (
        <p className="px-3 pb-2 text-xs text-red-500" title={error}>
          {error}
        </p>
      )}
    </div>
  );
}

// =====================================================
// DIFF VIEW
// =====================================================

function SimpleDiffView({
  original,
  edited,
}: {
  original: string;
  edited: string;
}) {
  const origLines = original.split("\n");
  const editLines = edited.split("\n");
  const maxLines = Math.max(origLines.length, editLines.length);

  return (
    <div className="overflow-x-auto rounded-md border text-xs">
      <table className="w-full">
        <thead>
          <tr className="border-b bg-zinc-100 text-zinc-500 dark:bg-zinc-800">
            <th className="px-3 py-1.5 text-left font-medium">AI Original</th>
            <th className="px-3 py-1.5 text-left font-medium">Your Edits</th>
          </tr>
        </thead>
        <tbody className="font-mono">
          {Array.from({ length: maxLines }).map((_, i) => {
            const origLine = origLines[i] ?? "";
            const editLine = editLines[i] ?? "";
            const isDifferent = origLine !== editLine;

            return (
              <tr
                key={i}
                className={
                  isDifferent ? "bg-amber-50/50 dark:bg-amber-950/20" : ""
                }
              >
                <td
                  className={`border-r px-3 py-0.5 whitespace-pre-wrap ${
                    isDifferent && origLine && !editLine
                      ? "bg-red-50 text-red-700 line-through dark:bg-red-950/30 dark:text-red-400"
                      : isDifferent
                        ? "text-zinc-500"
                        : ""
                  }`}
                >
                  {origLine}
                </td>
                <td
                  className={`px-3 py-0.5 whitespace-pre-wrap ${
                    isDifferent && editLine && !origLine
                      ? "bg-green-50 text-green-700 dark:bg-green-950/30 dark:text-green-400"
                      : isDifferent
                        ? "font-medium text-teal-700 dark:text-teal-400"
                        : ""
                  }`}
                >
                  {editLine}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

// =====================================================
// MAIN COMPONENT
// =====================================================

export function AIReviewPanel({
  transcript,
  visitId: _visitId,
  isEditable,
}: AIReviewProps) {
  void _visitId; // Used for future navigation/linking
  const router = useRouter();
  const aiNote = transcript.transcript_clinical || "";
  const rawTranscript = transcript.transcript_raw || "";
  const existingFinalNote = transcript.final_note || "";
  const isApproved = !!transcript.clinician_approved_at;

  // Editor state
  const [editedNote, setEditedNote] = useState(existingFinalNote || aiNote);
  const [isEditing, setIsEditing] = useState(false);
  const [activeTab, setActiveTab] = useState<string>("clinical-note");

  // Action states
  const [isApproving, setIsApproving] = useState(false);
  const [isRegenerating, setIsRegenerating] = useState(false);
  const [isDiscarding, setIsDiscarding] = useState(false);
  const [copied, setCopied] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  const wasEdited = editedNote.trim() !== aiNote.trim();

  // Metadata
  const metadata = transcript.transcript_metadata as Record<
    string,
    unknown
  > | null;
  const whisperMeta = metadata?.whisper as Record<string, unknown> | null;
  const gptMeta = metadata?.gpt as Record<string, unknown> | null;
  const totalCost =
    (transcript.cost_transcription || 0) + (transcript.cost_llm || 0);

  // -----------------------------------------------
  // ACTIONS
  // -----------------------------------------------

  const handleApprove = useCallback(async () => {
    setIsApproving(true);
    setActionError(null);
    try {
      const result = await approveAINote(transcript.id, editedNote, wasEdited);
      if (result.error) {
        setActionError(result.error);
        setIsApproving(false);
        return;
      }
      router.refresh();
    } catch {
      setActionError("Failed to approve note");
      setIsApproving(false);
    }
  }, [transcript.id, editedNote, wasEdited, router]);

  const handleRegenerate = useCallback(async () => {
    setIsRegenerating(true);
    setActionError(null);
    try {
      const result = await regenerateAINote(transcript.id);
      if (result.error) {
        setActionError(result.error);
        setIsRegenerating(false);
        return;
      }
      router.refresh();
    } catch {
      setActionError("Failed to regenerate note");
      setIsRegenerating(false);
    }
  }, [transcript.id, router]);

  const handleDiscard = useCallback(async () => {
    setIsDiscarding(true);
    setActionError(null);
    try {
      const result = await rejectAINote(
        transcript.id,
        "Clinician discarded AI note"
      );
      if (result.error) {
        setActionError(result.error);
        setIsDiscarding(false);
        return;
      }
      router.refresh();
    } catch {
      setActionError("Failed to discard note");
      setIsDiscarding(false);
    }
  }, [transcript.id, router]);

  const handleCopy = useCallback(async () => {
    const text = isEditing ? editedNote : aiNote;
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [isEditing, editedNote, aiNote]);

  const handleResetEdits = useCallback(() => {
    setEditedNote(aiNote);
  }, [aiNote]);

  const handleTabChange = useCallback((tab: string) => {
    setActiveTab(tab);
    if (tab === "edit") {
      setIsEditing(true);
    }
  }, []);

  // -----------------------------------------------
  // RENDER: APPROVED STATE
  // -----------------------------------------------
  if (isApproved) {
    const displayNote = existingFinalNote || aiNote;
    return (
      <Card className="border-green-200 bg-green-50/20 dark:border-green-800 dark:bg-green-950/10">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-green-600" />
              <CardTitle className="text-base text-green-900 dark:text-green-100">
                Approved Clinical Note
              </CardTitle>
            </div>
            <div className="flex items-center gap-2">
              {transcript.clinician_edited && (
                <Badge
                  variant="outline"
                  className="border-amber-300 text-amber-700 dark:text-amber-400"
                >
                  <Edit3 className="mr-1 h-3 w-3" />
                  Edited
                </Badge>
              )}
              <Badge
                variant="outline"
                className="border-green-400 text-green-700 dark:text-green-400"
              >
                <CheckCircle className="mr-1 h-3 w-3" />
                Approved
              </Badge>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          <ScrollArea className="max-h-[500px]">
            <FormattedNoteView note={displayNote} />
          </ScrollArea>

          {/* Metadata footer */}
          <Separator />
          <div className="flex flex-wrap items-center gap-4 text-xs text-zinc-500">
            {transcript.audio_duration_seconds && (
              <span className="flex items-center gap-1">
                <Clock className="h-3 w-3" />
                {Math.round(transcript.audio_duration_seconds / 60)} min
                recording
              </span>
            )}
            {totalCost > 0 && (
              <span className="flex items-center gap-1">
                <DollarSign className="h-3 w-3" />${totalCost.toFixed(3)}
              </span>
            )}
            {typeof gptMeta?.model === "string" && (
              <span className="flex items-center gap-1">
                <BrainCircuit className="h-3 w-3" />
                {gptMeta.model}
              </span>
            )}
            <span>
              Approved{" "}
              {new Date(transcript.clinician_approved_at!).toLocaleString()}
            </span>
          </div>
        </CardContent>
      </Card>
    );
  }

  // -----------------------------------------------
  // RENDER: REVIEW STATE (not yet approved)
  // -----------------------------------------------
  return (
    <Card className="border-teal-200 dark:border-teal-800">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <BrainCircuit className="h-5 w-5 text-teal-600" />
            <CardTitle className="text-base">
              AI Clinical Note — Review Required
            </CardTitle>
          </div>
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={handleCopy}
              title="Copy note to clipboard"
            >
              {copied ? (
                <Check className="h-3.5 w-3.5 text-green-600" />
              ) : (
                <Copy className="h-3.5 w-3.5" />
              )}
            </Button>
          </div>
        </div>
        <CardDescription>
          Review the AI-generated note below. You can approve as-is, edit before
          approving, or regenerate with a fresh AI pass.
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Audio player */}
        {transcript.audio_url && (
          <TranscriptAudioPlayer
            transcriptId={transcript.id}
            filename={transcript.audio_filename}
            duration={transcript.audio_duration_seconds}
          />
        )}

        {/* Action error */}
        {actionError && (
          <div className="flex items-center gap-2 rounded-md bg-red-50 p-3 text-sm text-red-700 dark:bg-red-950/20 dark:text-red-300">
            <AlertTriangle className="h-4 w-4 shrink-0" />
            {actionError}
          </div>
        )}

        {/* Tabs: Clinical Note / Edit / Raw Transcript / Diff */}
        <Tabs value={activeTab} onValueChange={handleTabChange}>
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="clinical-note" className="gap-1 text-xs">
              <Eye className="h-3 w-3" />
              AI Note
            </TabsTrigger>
            <TabsTrigger
              value="edit"
              className="gap-1 text-xs"
              disabled={!isEditable}
            >
              <Edit3 className="h-3 w-3" />
              Edit
            </TabsTrigger>
            <TabsTrigger value="transcript" className="gap-1 text-xs">
              <FileText className="h-3 w-3" />
              Transcript
            </TabsTrigger>
            {wasEdited && (
              <TabsTrigger value="diff" className="gap-1 text-xs">
                <RefreshCw className="h-3 w-3" />
                Changes
              </TabsTrigger>
            )}
          </TabsList>

          {/* AI Clinical Note (read-only, formatted) */}
          <TabsContent value="clinical-note" className="mt-3">
            <ScrollArea className="rounded-md border p-4">
              <FormattedNoteView note={aiNote} />
            </ScrollArea>
          </TabsContent>

          {/* Edit Tab */}
          <TabsContent value="edit" className="mt-3">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <p className="text-xs text-zinc-500">
                  Edit the note below. Changes are tracked.
                </p>
                {wasEdited && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleResetEdits}
                    className="h-7 gap-1 text-xs"
                  >
                    <Undo2 className="h-3 w-3" />
                    Reset
                  </Button>
                )}
              </div>
              <Textarea
                value={editedNote}
                onChange={(e) => setEditedNote(e.target.value)}
                className="min-h-[350px] font-mono text-sm leading-relaxed"
                placeholder="Clinical note content..."
              />
              {wasEdited && (
                <Badge variant="secondary" className="text-xs">
                  <Edit3 className="mr-1 h-3 w-3" />
                  Edited — changes will be tracked
                </Badge>
              )}
            </div>
          </TabsContent>

          {/* Raw Transcript */}
          <TabsContent value="transcript" className="mt-3">
            <ScrollArea className="rounded-md border bg-zinc-50 p-4 dark:bg-zinc-900">
              {rawTranscript ? (
                <p className="text-sm leading-relaxed whitespace-pre-wrap text-zinc-700 dark:text-zinc-300">
                  {rawTranscript}
                </p>
              ) : (
                <p className="text-zinc-500 italic">
                  Raw transcript not available.
                </p>
              )}
            </ScrollArea>
          </TabsContent>

          {/* Diff View */}
          {wasEdited && (
            <TabsContent value="diff" className="mt-3">
              <SimpleDiffView original={aiNote} edited={editedNote} />
            </TabsContent>
          )}
        </Tabs>

        {/* Metadata */}
        <div className="flex flex-wrap items-center gap-4 text-xs text-zinc-500">
          {transcript.audio_duration_seconds && (
            <span className="flex items-center gap-1">
              <Clock className="h-3 w-3" />
              {Math.round(transcript.audio_duration_seconds / 60)} min
            </span>
          )}
          {totalCost > 0 && (
            <span className="flex items-center gap-1">
              <DollarSign className="h-3 w-3" />${totalCost.toFixed(3)}
            </span>
          )}
          {typeof gptMeta?.total_tokens === "number" &&
            gptMeta.total_tokens > 0 && (
              <span>{gptMeta.total_tokens.toLocaleString()} tokens</span>
            )}
          {typeof whisperMeta?.language === "string" && (
            <span>Language: {whisperMeta.language}</span>
          )}
        </div>

        {/* Action Buttons */}
        {isEditable && (
          <>
            <Separator />
            <div className="flex flex-wrap items-center gap-2">
              {/* Approve */}
              <Button
                onClick={handleApprove}
                disabled={isApproving || isRegenerating || isDiscarding}
                className="gap-2"
              >
                {isApproving ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <CheckCircle className="h-4 w-4" />
                )}
                {wasEdited ? "Approve Edited Note" : "Approve AI Note"}
              </Button>

              {/* Regenerate */}
              <Button
                variant="outline"
                onClick={handleRegenerate}
                disabled={isApproving || isRegenerating || isDiscarding}
                className="gap-2"
              >
                {isRegenerating ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <RotateCcw className="h-4 w-4" />
                )}
                Regenerate
              </Button>

              {/* Discard */}
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button
                    variant="ghost"
                    disabled={isApproving || isRegenerating || isDiscarding}
                    className="gap-2 text-red-600 hover:bg-red-50 hover:text-red-700 dark:hover:bg-red-950/20"
                  >
                    {isDiscarding ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Trash2 className="h-4 w-4" />
                    )}
                    Discard AI Note
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Discard AI Note?</AlertDialogTitle>
                    <AlertDialogDescription>
                      This will delete the AI-generated clinical note and reset
                      the transcript for re-processing. The audio recording will
                      be preserved. You can regenerate a new note later.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={handleDiscard}
                      className="bg-red-600 text-white hover:bg-red-700"
                    >
                      Discard Note
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
