// Signature Audit Logs Page
// Phase 9.3.7: Admin-only compliance reporting
import { Metadata } from "next";
import { SignatureAuditClient } from "@/components/admin/signature-audit-client";

export const metadata: Metadata = {
  title: "Signature Audit Logs | Wound EHR",
  description: "Electronic signature audit trail and compliance reporting",
};

export const dynamic = "force-dynamic";

export default function SignatureAuditPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">
          Signature Audit Logs
        </h1>
        <p className="text-muted-foreground mt-2">
          Comprehensive audit trail of all electronic signatures for compliance
          reporting
        </p>
      </div>

      <SignatureAuditClient />
    </div>
  );
}
