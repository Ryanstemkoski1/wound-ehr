"use client";

import { Badge } from "@/components/ui/badge";
import { FileEdit, FileSignature, CheckCircle2, Clock } from "lucide-react";

type VisitStatus =
  | "draft"
  | "ready_for_signature"
  | "signed"
  | "submitted"
  | "incomplete"
  | "complete";

type VisitStatusBadgeProps = {
  status: VisitStatus;
  size?: "sm" | "md" | "lg";
};

const STATUS_CONFIG = {
  draft: {
    label: "Draft",
    icon: FileEdit,
    variant: "secondary" as const,
    className:
      "bg-muted text-foreground dark:bg-muted dark:text-muted-foreground/80",
  },
  ready_for_signature: {
    label: "Ready to Sign",
    icon: Clock,
    variant: "default" as const,
    className:
      "bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-400 border-amber-300 dark:border-amber-700",
  },
  signed: {
    label: "Signed",
    icon: FileSignature,
    variant: "default" as const,
    className: "bg-primary/10 text-primary border-primary/30",
  },
  submitted: {
    label: "Submitted",
    icon: CheckCircle2,
    variant: "default" as const,
    className:
      "bg-green-100 text-green-700 dark:bg-green-950 dark:text-green-400 border-green-300 dark:border-green-700",
  },
  incomplete: {
    label: "Incomplete",
    icon: FileEdit,
    variant: "destructive" as const,
    className:
      "bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-400 border-red-300 dark:border-red-700",
  },
  complete: {
    label: "Complete",
    icon: CheckCircle2,
    variant: "default" as const,
    className:
      "bg-green-100 text-green-700 dark:bg-green-950 dark:text-green-400 border-green-300 dark:border-green-700",
  },
};

export function VisitStatusBadge({
  status,
  size = "md",
}: VisitStatusBadgeProps) {
  const config = STATUS_CONFIG[status] || STATUS_CONFIG.draft;
  const Icon = config.icon;

  const sizeClasses = {
    sm: "text-xs px-2 py-0.5",
    md: "text-sm px-2.5 py-1",
    lg: "text-base px-3 py-1.5",
  };

  const iconSizes = {
    sm: "h-3 w-3",
    md: "h-4 w-4",
    lg: "h-5 w-5",
  };

  return (
    <Badge
      variant={config.variant}
      className={`${config.className} ${sizeClasses[size]} inline-flex items-center gap-1.5 border font-medium`}
    >
      <Icon className={iconSizes[size]} />
      {config.label}
    </Badge>
  );
}

/**
 * Visit status with description
 */
export function VisitStatusDetail({ status }: { status: VisitStatus }) {
  const descriptions: Record<VisitStatus, string> = {
    draft: "Visit is being documented. Save your progress anytime.",
    ready_for_signature:
      "All assessments complete. Ready for provider signature.",
    signed:
      "Provider has signed. Ready for patient signature (if required) or submission.",
    submitted:
      "Visit has been submitted to the office. This visit is now read-only.",
    incomplete: "Visit is missing required information.",
    complete: "Visit is complete and finalized.",
  };

  return (
    <div className="flex items-start gap-3">
      <VisitStatusBadge status={status} />
      <p className="text-muted-foreground flex-1 text-sm">
        {descriptions[status]}
      </p>
    </div>
  );
}
