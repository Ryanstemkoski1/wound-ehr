// Autosave Recovery Modal
// Phase 9.3.2: Modal to restore unsaved form data

"use client";

import { useState } from "react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { formatAutosaveTime } from "@/lib/autosave";
import { Clock, AlertTriangle } from "lucide-react";

type AutosaveRecoveryModalProps = {
  isOpen: boolean;
  onRestore: () => void;
  onDiscard: () => void;
  timestamp: string;
  formType: string;
};

export default function AutosaveRecoveryModal({
  isOpen,
  onRestore,
  onDiscard,
  timestamp,
  formType,
}: AutosaveRecoveryModalProps) {
  const [isRestoring, setIsRestoring] = useState(false);

  const handleRestore = () => {
    setIsRestoring(true);
    onRestore();
  };

  return (
    <AlertDialog open={isOpen}>
      <AlertDialogContent className="max-w-md">
        <AlertDialogHeader>
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-amber-100 dark:bg-amber-900/20">
              <AlertTriangle className="h-6 w-6 text-amber-600 dark:text-amber-500" />
            </div>
            <div>
              <AlertDialogTitle>Unsaved Data Found</AlertDialogTitle>
              <AlertDialogDescription className="text-xs">
                Would you like to restore your work?
              </AlertDialogDescription>
            </div>
          </div>
        </AlertDialogHeader>

        <div className="space-y-4 py-4">
          <p className="text-muted-foreground text-sm">
            We found unsaved {formType} data from a previous session. You can
            restore this data to continue where you left off, or start fresh.
          </p>

          <div className="bg-muted/50 flex items-center gap-2 rounded-lg border p-3">
            <Clock className="text-muted-foreground h-4 w-4" />
            <div className="flex-1">
              <p className="text-xs font-medium">Last saved</p>
              <p className="text-muted-foreground text-xs">
                {formatAutosaveTime(timestamp)}
              </p>
            </div>
          </div>

          <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 dark:border-amber-900/50 dark:bg-amber-900/10">
            <p className="text-xs text-amber-900 dark:text-amber-200">
              <strong>Note:</strong> Discarding will permanently delete the
              autosaved data.
            </p>
          </div>
        </div>

        <AlertDialogFooter>
          <AlertDialogCancel onClick={onDiscard} disabled={isRestoring}>
            Start Fresh
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={handleRestore}
            disabled={isRestoring}
            className="bg-primary"
          >
            {isRestoring ? "Restoring..." : "Restore Data"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
