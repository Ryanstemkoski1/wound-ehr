"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { sendNoteToOffice } from "@/app/actions/approval-workflow";
import { toast } from "sonner";

type SendToOfficeButtonProps = {
  visitId: string;
  currentStatus: string;
};

export function SendToOfficeButton({
  visitId,
  currentStatus,
}: SendToOfficeButtonProps) {
  const router = useRouter();
  const [sending, setSending] = useState(false);

  // Only show button for appropriate statuses
  const showButton = ["complete", "being_corrected"].includes(currentStatus);

  if (!showButton) return null;

  const handleSendToOffice = async () => {
    setSending(true);
    const result = await sendNoteToOffice(visitId);

    if (result.success) {
      toast.success("Note sent to office for approval");
      router.refresh();
    } else {
      toast.error(result.error || "Failed to send note");
    }
    setSending(false);
  };

  return (
    <Button
      onClick={handleSendToOffice}
      disabled={sending}
      variant="default"
      className="gap-2"
    >
      <Send className="h-4 w-4" />
      {sending ? "Sending..." : "Send to Office"}
    </Button>
  );
}
