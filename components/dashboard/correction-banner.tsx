"use client";

import { AlertCircle } from "lucide-react";
import Link from "next/link";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";

type CorrectionBannerProps = {
  count: number;
};

export function CorrectionBanner({ count }: CorrectionBannerProps) {
  if (count === 0) return null;

  return (
    <Alert variant="destructive" className="mb-6">
      <AlertCircle className="h-4 w-4" />
      <AlertTitle>Corrections Needed</AlertTitle>
      <AlertDescription className="flex items-center justify-between">
        <span>
          You have {count} visit note{count !== 1 ? "s" : ""} that need{" "}
          {count === 1 ? "s" : ""} correction from the office.
        </span>
        <Button variant="outline" size="sm" asChild>
          <Link href="/dashboard/corrections">View Corrections</Link>
        </Button>
      </AlertDescription>
    </Alert>
  );
}
