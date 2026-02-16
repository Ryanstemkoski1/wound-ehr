"use client";

import { useState } from "react";
import { format } from "date-fns";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  CheckCircle2,
  XCircle,
  Eye,
  Search,
  Filter,
  Calendar,
} from "lucide-react";
import Link from "next/link";
import { CorrectionRequestDialog } from "@/components/admin/correction-request-dialog";
import { VoidNoteDialog } from "@/components/admin/void-note-dialog";
import { approveNote } from "@/app/actions/approval-workflow";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

type InboxNote = {
  id: string;
  visit_date: string;
  status: string;
  sent_to_office_at: string;
  clinician_name?: string;
  clinician_credentials?: string;
  assessments?: { id: string }[];
  patient: {
    id: string;
    first_name: string;
    last_name: string;
    mrn: string;
    facility?: {
      id: string;
      name: string;
    };
  };
};

type OfficeInboxClientProps = {
  initialNotes: InboxNote[];
};

export default function OfficeInboxClient({
  initialNotes,
}: OfficeInboxClientProps) {
  const [notes, setNotes] = useState<InboxNote[]>(initialNotes);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedNote, setSelectedNote] = useState<InboxNote | null>(null);
  const [showCorrectionDialog, setShowCorrectionDialog] = useState(false);
  const [showVoidDialog, setShowVoidDialog] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  // Filter notes based on search term
  const filteredNotes = notes.filter((note) => {
    if (!searchTerm) return true;
    const searchLower = searchTerm.toLowerCase();
    const patientName =
      `${note.patient?.first_name} ${note.patient?.last_name}`.toLowerCase();
    const mrn = note.patient?.mrn?.toLowerCase() || "";
    const clinician = note.clinician_name?.toLowerCase() || "";

    return (
      patientName.includes(searchLower) ||
      mrn.includes(searchLower) ||
      clinician.includes(searchLower)
    );
  });

  const handleApprove = async (visitId: string) => {
    if (
      !confirm(
        "Approve this note? It will be locked and no further edits allowed (except addendums)."
      )
    ) {
      return;
    }

    setIsLoading(true);
    try {
      const result = await approveNote(visitId);

      if (result.success) {
        toast.success("Note approved successfully");
        // Remove from inbox
        setNotes(notes.filter((n) => n.id !== visitId));
        router.refresh();
      } else {
        toast.error(result.error || "Failed to approve note");
      }
    } catch (error) {
      toast.error("An error occurred while approving the note");
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleRequestCorrection = (note: InboxNote) => {
    setSelectedNote(note);
    setShowCorrectionDialog(true);
  };

  const handleVoidNote = (note: InboxNote) => {
    setSelectedNote(note);
    setShowVoidDialog(true);
  };

  const onCorrectionSuccess = () => {
    // Remove from inbox
    if (selectedNote) {
      setNotes(notes.filter((n) => n.id !== selectedNote.id));
    }
    setShowCorrectionDialog(false);
    setSelectedNote(null);
  };

  const onVoidSuccess = () => {
    // Remove from inbox
    if (selectedNote) {
      setNotes(notes.filter((n) => n.id !== selectedNote.id));
    }
    setShowVoidDialog(false);
    setSelectedNote(null);
  };

  return (
    <div className="space-y-4">
      {/* Search and Filters */}
      <div className="flex items-center gap-4">
        <div className="relative max-w-md flex-1">
          <Search className="text-muted-foreground absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2" />
          <Input
            placeholder="Search by patient name, MRN, or clinician..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9"
          />
        </div>
        <Button variant="outline" size="sm">
          <Filter className="mr-2 h-4 w-4" />
          Filter
        </Button>
      </div>

      {/* Stats */}
      <div className="flex items-center gap-4">
        <Badge variant="secondary" className="px-4 py-2 text-base">
          <Calendar className="mr-2 h-4 w-4" />
          {filteredNotes.length} notes pending review
        </Badge>
      </div>

      {/* Table */}
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Patient</TableHead>
              <TableHead>MRN</TableHead>
              <TableHead>Visit Date</TableHead>
              <TableHead>Clinician</TableHead>
              <TableHead>Facility</TableHead>
              <TableHead>Wounds</TableHead>
              <TableHead>Sent</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredNotes.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="h-24 text-center">
                  {searchTerm
                    ? "No notes match your search"
                    : "No pending notes"}
                </TableCell>
              </TableRow>
            ) : (
              filteredNotes.map((note) => (
                <TableRow key={note.id}>
                  <TableCell className="font-medium">
                    <Link
                      href={`/dashboard/patients/${note.patient?.id}`}
                      className="hover:underline"
                    >
                      {note.patient?.first_name} {note.patient?.last_name}
                    </Link>
                  </TableCell>
                  <TableCell>{note.patient?.mrn}</TableCell>
                  <TableCell>
                    {note.visit_date
                      ? format(new Date(note.visit_date), "MMM d, yyyy")
                      : "—"}
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-col">
                      <span className="font-medium">
                        {note.clinician_name || "—"}
                      </span>
                      {note.clinician_credentials && (
                        <Badge variant="outline" className="mt-1 w-fit">
                          {note.clinician_credentials}
                        </Badge>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>{note.patient?.facility?.name || "—"}</TableCell>
                  <TableCell>
                    <Badge variant="secondary">
                      {note.assessments?.length || 0} wounds
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {note.sent_to_office_at
                      ? format(
                          new Date(note.sent_to_office_at),
                          "MMM d, h:mm a"
                        )
                      : "—"}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        asChild
                        title="View visit"
                      >
                        <Link href={`/dashboard/patients/${note.patient?.id}`}>
                          <Eye className="h-4 w-4" />
                        </Link>
                      </Button>
                      <Button
                        variant="default"
                        size="sm"
                        onClick={() => handleApprove(note.id)}
                        disabled={isLoading}
                        title="Approve note"
                      >
                        <CheckCircle2 className="mr-1 h-4 w-4" />
                        Approve
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleRequestCorrection(note)}
                        disabled={isLoading}
                        title="Request correction"
                      >
                        Request Correction
                      </Button>
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => handleVoidNote(note)}
                        disabled={isLoading}
                        title="Void note"
                      >
                        <XCircle className="mr-1 h-4 w-4" />
                        Void
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Dialogs */}
      {selectedNote && (
        <>
          <CorrectionRequestDialog
            open={showCorrectionDialog}
            onOpenChange={setShowCorrectionDialog}
            visitId={selectedNote.id}
            patientName={`${selectedNote.patient?.first_name} ${selectedNote.patient?.last_name}`}
            onSuccess={onCorrectionSuccess}
          />
          <VoidNoteDialog
            open={showVoidDialog}
            onOpenChange={setShowVoidDialog}
            visitId={selectedNote.id}
            patientName={`${selectedNote.patient?.first_name} ${selectedNote.patient?.last_name}`}
            onSuccess={onVoidSuccess}
          />
        </>
      )}
    </div>
  );
}
