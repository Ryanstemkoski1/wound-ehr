"use client";

// Nurse home — "Start visit" leaf. Calls startVisit (stamps Time In,
// moves the visit to In Progress) then navigates into the note.
// The only interactive island on a Today card.

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Play } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { startVisit } from "@/app/actions/field-notes";
import { cn } from "@/lib/utils";

export function StartVisitButton({
  noteId,
  className,
}: {
  noteId: string;
  className?: string;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  return (
    <Button
      type="button"
      disabled={pending}
      className={cn("h-11 w-full", className)}
      onClick={() =>
        startTransition(async () => {
          const result = await startVisit(noteId);
          if (result.success) {
            router.push(`/notes/${noteId}`);
          } else {
            toast.error(result.error);
          }
        })
      }
    >
      {pending ? (
        <Loader2 className="size-4 animate-spin" aria-hidden />
      ) : (
        <Play className="size-4" aria-hidden />
      )}
      {pending ? "Starting…" : "Start visit"}
    </Button>
  );
}
