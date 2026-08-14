import Link from "next/link";
import { AlertCircle } from "lucide-react";

/**
 * Calm inline failure card for the patients surface — rendered whenever an
 * action returns { success: false }. Server component, no interactivity.
 */
export function ErrorState({
  message,
  backHref,
  backLabel,
}: {
  message: string;
  backHref?: string;
  backLabel?: string;
}) {
  return (
    <div className="rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-8 text-center">
      <AlertCircle className="mx-auto h-5 w-5 text-destructive" aria-hidden="true" />
      <p className="mt-2 text-sm font-medium text-foreground">Something went wrong</p>
      <p className="mx-auto mt-1 max-w-md text-sm text-muted-foreground">{message}</p>
      {backHref ? (
        <Link
          href={backHref}
          className="mt-4 inline-flex min-h-11 items-center justify-center rounded-md border border-border bg-background px-4 text-sm font-medium text-foreground hover:bg-muted"
        >
          {backLabel ?? "Go back"}
        </Link>
      ) : null}
    </div>
  );
}
