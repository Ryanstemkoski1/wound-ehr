import Link from "next/link";
import { AlertTriangle, FileWarning } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  getPatientConsentStatus,
  type ConsentStatus,
} from "@/app/actions/consent-status";

type ConsentBannerProps = {
  patientId: string;
  /** Optional CSS classes to append. */
  className?: string;
};

/**
 * Persistent, non-blocking consent banner per the 4/27 meeting decision
 * (R-019). Renders inline above the patient header on every patient-scoped
 * page so missing/incomplete consent is impossible to miss but never
 * interrupts clinical work.
 *
 * - status='on_file'    → render nothing (no nag for compliant patients).
 * - status='incomplete' → amber banner, "Complete consent" CTA.
 * - status='missing'    → red banner, "Capture consent" CTA.
 *
 * Server component; no client JS.
 */
export async function ConsentBanner({
  patientId,
  className,
}: ConsentBannerProps) {
  const status = await getPatientConsentStatus(patientId);
  if (!status || status.status === "on_file") return null;

  const variant = status.status;
  const { Icon, title, body, ctaLabel, color } = COPY[variant];
  const ctaHref = `/dashboard/patients/${patientId}/consents/new`;

  return (
    <div
      role="status"
      aria-live="polite"
      className={cn(
        "flex flex-wrap items-start gap-3 rounded-md border px-4 py-3 text-sm",
        color,
        className
      )}
    >
      <Icon className="mt-0.5 h-5 w-5 shrink-0" aria-hidden="true" />
      <div className="min-w-[14rem] flex-1">
        <p className="font-medium">{title}</p>
        <p className="text-xs opacity-90">{body}</p>
      </div>
      <Link
        href={ctaHref}
        className={cn(
          "inline-flex items-center rounded-md border px-3 py-1.5 text-xs font-medium transition",
          "border-current hover:bg-white/40 focus-visible:ring-2 focus-visible:ring-current focus-visible:outline-none"
        )}
      >
        {ctaLabel}
      </Link>
    </div>
  );
}

const COPY: Record<
  Exclude<ConsentStatus, "on_file">,
  {
    Icon: typeof AlertTriangle;
    title: string;
    body: string;
    ctaLabel: string;
    color: string;
  }
> = {
  missing: {
    Icon: AlertTriangle,
    title: "Patient consent is not on file",
    body: "Capture or upload signed consent before billing this patient's visits.",
    ctaLabel: "Capture consent",
    color:
      "border-red-300 bg-red-50 text-red-900 dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-200",
  },
  incomplete: {
    Icon: FileWarning,
    title: "Consent on file is incomplete",
    body: "A consent record exists but is missing a signature or document. Resolve before next visit.",
    ctaLabel: "Complete consent",
    color:
      "border-amber-300 bg-amber-50 text-amber-900 dark:border-amber-900/50 dark:bg-amber-950/40 dark:text-amber-200",
  },
};
