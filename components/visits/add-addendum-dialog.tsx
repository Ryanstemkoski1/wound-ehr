"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { FilePlus, Loader2 } from "lucide-react";
import { createAddendum } from "@/app/actions/visits";
import { useRouter } from "next/navigation";

type AddAddendumDialogProps = {
  visitId: string;
  visitStatus: string;
};

export function AddAddendumDialog({
  visitId,
  visitStatus,
}: AddAddendumDialogProps) {
  const [open, setOpen] = useState(false);
  const [content, setContent] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const router = useRouter();

  // Only allow addendums on signed/submitted visits
  const canAddAddendum =
    visitStatus === "signed" || visitStatus === "submitted";

  const handleSubmit = async () => {
    if (!content.trim()) {
      alert("Please enter addendum content");
      return;
    }

    setIsSubmitting(true);
    try {
      const result = await createAddendum(visitId, content);

      if (result.error) {
        alert("Failed to create addendum: " + result.error);
      } else {
        setContent("");
        setOpen(false);
        router.refresh();
      }
    } catch (error) {
      alert("Failed to create addendum");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!canAddAddendum) {
    return null;
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <FilePlus className="mr-2 h-4 w-4" />
          Add Addendum
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Add Visit Addendum</DialogTitle>
          <DialogDescription>
            Add a post-signature note to this visit. The original visit content
            will remain unchanged. Addendums are included in PDF exports.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <Textarea
            placeholder="Enter addendum notes..."
            value={content}
            onChange={(e) => setContent(e.target.value)}
            rows={8}
            className="resize-none"
          />
          <p className="text-sm text-gray-500">
            Your name, credentials, and timestamp will be automatically
            recorded.
          </p>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => setOpen(false)}
            disabled={isSubmitting}
          >
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={isSubmitting || !content.trim()}
          >
            {isSubmitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Saving...
              </>
            ) : (
              "Save Addendum"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
