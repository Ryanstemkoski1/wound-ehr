import { Lock } from "lucide-react";
import { cn } from "@/lib/utils";
import { AddAddendumDialog } from "@/components/visits/add-addendum-dialog";

type SignedBarProps = {
  visitId: string;
  visitStatus: string;
  /** Optional ISO timestamp string of when the visit was signed. */
  signedAt?: string | null;
  /** Optional name of the clinician who signed. */
  signedBy?: string | null;
  className?: string;
};

/**
 * "Signed bar with Add Addendum" (R-064). Persistent banner that appears
 * once a visit is signed/submitted, communicating the locked state and
 * exposing the canonical addendum entry point. The legacy attestation
 * modal + sign dialog still drive the actual signing workflow; this bar
 * is the post-sign affordance.
 *
 * Returns null for non-signed statuses so the caller can drop it in
 * unconditionally.
 */
export function SignedBar({
  visitId,
  visitStatus,
  signedAt,
  signedBy,
  className,
}: SignedBarProps) {
  if (visitStatus !== "signed" && visitStatus !== "submitted") {
    return null;
  }

  const signedAtStr = signedAt
    ? new Date(signedAt).toLocaleString("en-US", {
        year: "numeric",
        month: "short",
        day: "numeric",
        hour: "numeric",
        minute: "2-digit",
      })
    : null;

  return (
    <div
      role="status"
      aria-live="polite"
      className={cn(
        "flex flex-wrap items-center gap-3 rounded-md border border-emerald-300 bg-emerald-50 px-4 py-2.5 text-sm dark:border-emerald-900/50 dark:bg-emerald-950/30",
        className
      )}
    >
      <Lock
        className="h-4 w-4 shrink-0 text-emerald-700 dark:text-emerald-300"
        aria-hidden="true"
      />
      <div className="min-w-0 flex-1">
        <p className="font-medium text-emerald-900 dark:text-emerald-100">
          {visitStatus === "submitted"
            ? "Visit submitted to office — note locked"
            : "Visit signed — note locked"}
        </p>
        {(signedBy || signedAtStr) && (
          <p className="text-xs text-emerald-800/80 dark:text-emerald-200/80">
            {signedBy ? `Signed by ${signedBy}` : "Signed"}
            {signedAtStr ? ` · ${signedAtStr}` : ""}
            {" · "}
            All further changes must be filed as an addendum.
          </p>
        )}
      </div>
      <div className="ml-auto">
        <AddAddendumDialog visitId={visitId} visitStatus={visitStatus} />
      </div>
    </div>
  );
}
