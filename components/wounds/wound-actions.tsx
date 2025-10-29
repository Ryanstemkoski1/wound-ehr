"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { MoreVertical, Pencil, Trash2, CheckCircle } from "lucide-react";
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
import { deleteWound, markWoundHealed } from "@/app/actions/wounds";

type WoundActionsProps = {
  wound: {
    id: string;
    woundNumber: string;
    status: string;
  };
  patientId: string;
};

export default function WoundActions({ wound, patientId }: WoundActionsProps) {
  const router = useRouter();
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showHealDialog, setShowHealDialog] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isHealing, setIsHealing] = useState(false);
  const [error, setError] = useState("");

  const handleDelete = async () => {
    setIsDeleting(true);
    setError("");

    const result = await deleteWound(wound.id);

    if (result.error) {
      setError(result.error);
      setIsDeleting(false);
    } else {
      setShowDeleteDialog(false);
      router.refresh();
    }
  };

  const handleMarkHealed = async () => {
    setIsHealing(true);
    setError("");

    const result = await markWoundHealed(wound.id);

    if (result.error) {
      setError(result.error);
      setIsHealing(false);
    } else {
      setShowHealDialog(false);
      router.refresh();
    }
  };

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
                `/dashboard/patients/${patientId}/wounds/${wound.id}/edit`
              )
            }
          >
            <Pencil className="mr-2 h-4 w-4" />
            Edit
          </DropdownMenuItem>
          {wound.status === "active" && (
            <DropdownMenuItem onClick={() => setShowHealDialog(true)}>
              <CheckCircle className="mr-2 h-4 w-4" />
              Mark as Healed
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
            <DialogTitle>Delete Wound</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete {wound.woundNumber}? This will
              permanently delete all associated assessments, photos, and data.
              This action cannot be undone.
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
              {isDeleting ? "Deleting..." : "Delete Wound"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showHealDialog} onOpenChange={setShowHealDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Mark Wound as Healed</DialogTitle>
            <DialogDescription>
              Are you sure you want to mark {wound.woundNumber} as healed? This
              will update the wound status and it will no longer appear in the
              active wounds list.
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
              onClick={() => setShowHealDialog(false)}
              disabled={isHealing}
            >
              Cancel
            </Button>
            <Button onClick={handleMarkHealed} disabled={isHealing}>
              {isHealing ? "Updating..." : "Mark as Healed"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
