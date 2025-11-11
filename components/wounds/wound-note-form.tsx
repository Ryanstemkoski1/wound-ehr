"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { createWoundNote } from "@/app/actions/wound-notes";
import { MessageSquarePlus } from "lucide-react";

type WoundNoteFormProps = {
  woundId: string;
  visitId?: string | null;
};

export function WoundNoteForm({ woundId, visitId }: WoundNoteFormProps) {
  const router = useRouter();
  const [note, setNote] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!note.trim()) {
      setError("Note cannot be empty");
      return;
    }

    setIsSubmitting(true);
    setError("");

    const formData = new FormData();
    formData.append("woundId", woundId);
    formData.append("note", note.trim());
    if (visitId) {
      formData.append("visitId", visitId);
    }

    const result = await createWoundNote(formData);

    if (result.error) {
      setError(result.error);
      setIsSubmitting(false);
    } else {
      setNote("");
      setIsSubmitting(false);
      router.refresh();
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <Textarea
        value={note}
        onChange={(e) => setNote(e.target.value)}
        placeholder="Add a note about this wound..."
        className="min-h-20 resize-none"
        disabled={isSubmitting}
      />
      {error && (
        <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
      )}
      <div className="flex justify-end">
        <Button
          type="submit"
          size="sm"
          disabled={isSubmitting || !note.trim()}
          className="gap-1"
        >
          <MessageSquarePlus className="h-4 w-4" />
          {isSubmitting ? "Saving..." : "Add Note"}
        </Button>
      </div>
    </form>
  );
}
