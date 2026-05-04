"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { MoreVertical, Pencil, Trash2, CheckCircle, UserX } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  deleteVisit,
  markVisitComplete,
  setVisitNoShow,
} from "@/app/actions/visits";

type VisitActionsProps = {
  visit: {
    id: string;
    visitDate: Date;
    status: string;
  };
  patientId: string;
};

export default function VisitActions({ visit, patientId }: VisitActionsProps) {
  const router = useRouter();
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showCompleteDialog, setShowCompleteDialog] = useState(false);
  const [showNoShowDialog, setShowNoShowDialog] = useState(false);
  const [noShowReason, setNoShowReason] = useState("");
  const [isMarkingNoShow, setIsMarkingNoShow] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isCompleting, setIsCompleting] = useState(false);
  const [error, setError] = useState("");

  const handleDelete = async () => {
    setIsDeleting(true);
    setError("");

    const result = await deleteVisit(visit.id);

    if (result.error) {
      setError(result.error);
      setIsDeleting(false);
    } else {
      setShowDeleteDialog(false);
      router.refresh();
    }
  };

  const handleMarkComplete = async () => {
    setIsCompleting(true);
    setError("");

    const result = await markVisitComplete(visit.id);

    if (result.error) {
      setError(result.error);
      setIsCompleting(false);
    } else {
      setShowCompleteDialog(false);
      router.refresh();
    }
  };

  const handleMarkNoShow = async () => {
    setIsMarkingNoShow(true);
    setError("");

    const result = await setVisitNoShow(visit.id, noShowReason);

    if (result.error) {
      setError(result.error);
      setIsMarkingNoShow(false);
    } else {
      setShowNoShowDialog(false);
      setNoShowReason("");
      setIsMarkingNoShow(false);
      router.refresh();
    }
  };

  const visitDateStr = new Date(visit.visitDate).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon">
            <MoreVertical className="h-4 w-4" />
            <span className="sr-only">Actions</span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem
            onClick={() =>
              router.push(
                `/dashboard/patients/${patientId}/visits/${visit.id}/edit`
              )
            }
          >
            <Pencil className="mr-2 h-4 w-4" />
            Edit
          </DropdownMenuItem>
          {(visit.status === "scheduled" || visit.status === "in-progress") && (
            <DropdownMenuItem onClick={() => setShowCompleteDialog(true)}>
              <CheckCircle className="mr-2 h-4 w-4" />
              Mark as Completed
            </DropdownMenuItem>
          )}
          {(visit.status === "scheduled" ||
            visit.status === "in-progress" ||
            visit.status === "in_progress" ||
            visit.status === "draft" ||
            visit.status === "incomplete") && (
            <DropdownMenuItem onClick={() => setShowNoShowDialog(true)}>
              <UserX className="mr-2 h-4 w-4" />
              Mark as No-Show
            </DropdownMenuItem>
          )}
          <DropdownMenuSeparator />
          <DropdownMenuItem
            onClick={() => setShowDeleteDialog(true)}
            className="text-red-600 dark:text-red-400"
          >
            <Trash2 className="mr-2 h-4 w-4" />
            Delete
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Visit</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete the visit from {visitDateStr}?
              This will permanently delete all associated assessments,
              treatments, and billing data. This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          {error && (
            <div className="rounded-md bg-red-50 p-3 text-sm text-red-800 dark:bg-red-900/20 dark:text-red-400">
              {error}
            </div>
          )}
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowDeleteDialog(false)}
              disabled={isDeleting}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={isDeleting}
            >
              {isDeleting ? "Deleting..." : "Delete Visit"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showCompleteDialog} onOpenChange={setShowCompleteDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Mark Visit as Complete</DialogTitle>
            <DialogDescription>
              Are you sure you want to mark the visit from {visitDateStr} as
              complete? This indicates that all documentation for this visit has
              been finished.
            </DialogDescription>
          </DialogHeader>
          {error && (
            <div className="rounded-md bg-red-50 p-3 text-sm text-red-800 dark:bg-red-900/20 dark:text-red-400">
              {error}
            </div>
          )}
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowCompleteDialog(false)}
              disabled={isCompleting}
            >
              Cancel
            </Button>
            <Button onClick={handleMarkComplete} disabled={isCompleting}>
              {isCompleting ? "Updating..." : "Mark as Complete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={showNoShowDialog}
        onOpenChange={(o) => {
          setShowNoShowDialog(o);
          if (!o) {
            setNoShowReason("");
            setError("");
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Mark Visit as No-Show</DialogTitle>
            <DialogDescription>
              Record that the patient did not present for the visit on{" "}
              {visitDateStr}. Provide a brief reason for the audit log.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="no-show-reason">Reason</Label>
            <Textarea
              id="no-show-reason"
              value={noShowReason}
              onChange={(e) => setNoShowReason(e.target.value)}
              placeholder="e.g., Patient declined visit, was off-site at appointment, etc."
              rows={3}
              maxLength={500}
              disabled={isMarkingNoShow}
            />
            <p className="text-muted-foreground text-xs">
              {noShowReason.length}/500
            </p>
          </div>
          {error && (
            <div className="rounded-md bg-red-50 p-3 text-sm text-red-800 dark:bg-red-900/20 dark:text-red-400">
              {error}
            </div>
          )}
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowNoShowDialog(false)}
              disabled={isMarkingNoShow}
            >
              Cancel
            </Button>
            <Button
              onClick={handleMarkNoShow}
              disabled={isMarkingNoShow || noShowReason.trim().length < 3}
            >
              {isMarkingNoShow ? "Saving..." : "Mark as No-Show"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
