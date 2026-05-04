"use client";

import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CheckCircle2, Send, XCircle, RotateCcw, Loader2 } from "lucide-react";
import { toast } from "sonner";
import type { BillingStatus } from "@/app/actions/billing";
import { setBillingStatus, submitBillingRecord } from "@/app/actions/billing";

const STATUS_BADGE: Record<
  BillingStatus,
  { label: string; className: string }
> = {
  draft: {
    label: "Draft",
    className: "bg-muted text-muted-foreground border-border",
  },
  ready: {
    label: "Ready",
    className: "bg-primary/10 text-primary border-primary/30",
  },
  submitted: {
    label: "Submitted",
    className:
      "bg-amber-100 text-amber-700 border-amber-300 dark:bg-amber-900/40 dark:text-amber-300",
  },
  paid: {
    label: "Paid",
    className:
      "bg-emerald-100 text-emerald-700 border-emerald-300 dark:bg-emerald-900/40 dark:text-emerald-300",
  },
  denied: {
    label: "Denied",
    className:
      "bg-red-100 text-red-700 border-red-300 dark:bg-red-900/40 dark:text-red-300",
  },
};

type Props = {
  billingId: string;
  status: BillingStatus;
  submittedAt?: string | null;
  claimNumber?: string | null;
  disabled?: boolean;
};

export function BillingStatusActions({
  billingId,
  status,
  submittedAt,
  claimNumber: initialClaimNumber,
  disabled = false,
}: Props) {
  const [pending, setPending] = useState(false);
  const [claimNumber, setClaimNumber] = useState(initialClaimNumber ?? "");

  const badgeCfg = STATUS_BADGE[status];

  async function handleAction(
    fn: () => Promise<{ success: boolean; error?: string }>
  ) {
    setPending(true);
    try {
      const res = await fn();
      if (!res.success) {
        toast.error(res.error ?? "Action failed");
      } else {
        toast.success("Billing status updated");
      }
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="space-y-3">
      {/* Status badge row */}
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-muted-foreground text-xs font-medium">
          Claim status:
        </span>
        <Badge variant="outline" className={badgeCfg.className}>
          {badgeCfg.label}
        </Badge>
        {status === "submitted" && submittedAt && (
          <span className="text-muted-foreground text-xs">
            {new Date(submittedAt).toLocaleDateString()}
          </span>
        )}
        {claimNumber && (
          <span className="text-muted-foreground font-mono text-xs">
            #{claimNumber}
          </span>
        )}
      </div>

      {/* Action buttons by status */}
      {!disabled && (
        <div className="space-y-2">
          {status === "draft" && (
            <Button
              size="sm"
              variant="outline"
              disabled={pending}
              onClick={() =>
                handleAction(() => setBillingStatus(billingId, "ready"))
              }
            >
              {pending ? (
                <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
              ) : (
                <CheckCircle2 className="mr-1.5 h-3.5 w-3.5" />
              )}
              Mark Ready
            </Button>
          )}

          {status === "ready" && (
            <div className="flex flex-wrap gap-2">
              <Button
                size="sm"
                disabled={pending}
                onClick={() =>
                  handleAction(() => submitBillingRecord(billingId))
                }
              >
                {pending ? (
                  <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Send className="mr-1.5 h-3.5 w-3.5" />
                )}
                Submit Claim
              </Button>
              <Button
                size="sm"
                variant="ghost"
                disabled={pending}
                onClick={() =>
                  handleAction(() => setBillingStatus(billingId, "draft"))
                }
              >
                Back to Draft
              </Button>
            </div>
          )}

          {status === "submitted" && (
            <div className="space-y-2">
              <div className="space-y-1">
                <Label htmlFor="claim-num" className="text-xs">
                  Claim # (optional)
                </Label>
                <Input
                  id="claim-num"
                  placeholder="Payer claim number"
                  className="h-8 text-xs"
                  value={claimNumber}
                  onChange={(e) => setClaimNumber(e.target.value)}
                />
              </div>
              <div className="flex flex-wrap gap-2">
                <Button
                  size="sm"
                  className="bg-emerald-600 hover:bg-emerald-700 dark:bg-emerald-700 dark:hover:bg-emerald-600"
                  disabled={pending}
                  onClick={() =>
                    handleAction(() =>
                      setBillingStatus(
                        billingId,
                        "paid",
                        claimNumber || undefined
                      )
                    )
                  }
                >
                  {pending ? (
                    <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <CheckCircle2 className="mr-1.5 h-3.5 w-3.5" />
                  )}
                  Mark Paid
                </Button>
                <Button
                  size="sm"
                  variant="destructive"
                  disabled={pending}
                  onClick={() =>
                    handleAction(() =>
                      setBillingStatus(
                        billingId,
                        "denied",
                        claimNumber || undefined
                      )
                    )
                  }
                >
                  {pending ? (
                    <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <XCircle className="mr-1.5 h-3.5 w-3.5" />
                  )}
                  Mark Denied
                </Button>
              </div>
            </div>
          )}

          {status === "denied" && (
            <Button
              size="sm"
              variant="outline"
              disabled={pending}
              onClick={() =>
                handleAction(() => setBillingStatus(billingId, "draft"))
              }
            >
              {pending ? (
                <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
              ) : (
                <RotateCcw className="mr-1.5 h-3.5 w-3.5" />
              )}
              Reopen for Resubmit
            </Button>
          )}

          {status === "paid" && (
            <p className="text-muted-foreground text-xs">
              This claim has been paid and is closed.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
