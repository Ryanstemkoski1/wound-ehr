"use client";

import { useEffect, useState } from "react";
import { getSignature } from "@/app/actions/signatures";
import { Skeleton } from "@/components/ui/skeleton";
import { CheckCircle2, FileSignature } from "lucide-react";
import { format } from "date-fns";

type SignatureDisplayProps = {
  signatureId?: string;
  signatureData?: string;
  signerName?: string;
  signerRole?: string;
  signedAt?: string;
  title?: string;
  showBorder?: boolean;
};

export function SignatureDisplay({
  signatureId,
  signatureData: initialData,
  signerName: initialName,
  signerRole: initialRole,
  signedAt: initialDate,
  title = "Signature",
  showBorder = true,
}: SignatureDisplayProps) {
  const [signatureData, setSignatureData] = useState<string | null>(
    initialData || null
  );
  const [signerName, setSignerName] = useState<string | null>(
    initialName || null
  );
  const [signerRole, setSignerRole] = useState<string | null>(
    initialRole || null
  );
  const [signedAt, setSignedAt] = useState<string | null>(initialDate || null);
  const [loading, setLoading] = useState(!initialData && !!signatureId);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchSignature() {
      if (!signatureId || initialData) return;

      setLoading(true);
      const result = await getSignature(signatureId);

      if (result.error) {
        setError(result.error);
      } else if (result.data) {
        setSignatureData(result.data.signature_data);
        setSignerName(result.data.signer_name);
        setSignerRole(result.data.signer_role);
        setSignedAt(result.data.signed_at);
      }

      setLoading(false);
    }

    fetchSignature();
  }, [signatureId, initialData]);

  if (loading) {
    return (
      <div className="space-y-2">
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-32 w-full" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-sm text-red-600 dark:text-red-400">
        Failed to load signature
      </div>
    );
  }

  if (!signatureData) {
    return null;
  }

  const containerClass = showBorder
    ? "border-2 border-zinc-300 dark:border-zinc-700 rounded-lg bg-white dark:bg-zinc-950 p-4"
    : "";

  return (
    <div className="space-y-2">
      {title && (
        <div className="flex items-center gap-2">
          <FileSignature className="h-4 w-4 text-zinc-500" />
          <h4 className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
            {title}
          </h4>
          <CheckCircle2 className="h-4 w-4 text-green-600" />
        </div>
      )}

      <div className={containerClass}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={signatureData}
          alt="Signature"
          className="h-auto w-full max-w-md"
        />
      </div>

      {(signerName || signerRole || signedAt) && (
        <div className="space-y-1 text-xs text-zinc-600 dark:text-zinc-400">
          {signerName && (
            <p>
              <span className="font-medium">Signed by:</span> {signerName}
              {signerRole && ` (${signerRole})`}
            </p>
          )}
          {signedAt && (
            <p>
              <span className="font-medium">Signed at:</span>{" "}
              {format(new Date(signedAt), "PPpp")}
            </p>
          )}
        </div>
      )}
    </div>
  );
}

/**
 * Compact signature badge for lists
 */
export function SignatureBadge({
  signatureId,
  signerName,
  signerRole,
}: {
  signatureId?: string;
  signerName?: string;
  signerRole?: string;
}) {
  if (!signatureId && !signerName) return null;

  return (
    <div className="inline-flex items-center gap-1.5 rounded-md border border-green-200 bg-green-50 px-2 py-1 dark:border-green-800 dark:bg-green-950/20">
      <CheckCircle2 className="h-3 w-3 text-green-600" />
      <span className="text-xs font-medium text-green-700 dark:text-green-400">
        Signed
        {signerName && ` by ${signerName}`}
        {signerRole && ` (${signerRole})`}
      </span>
    </div>
  );
}
