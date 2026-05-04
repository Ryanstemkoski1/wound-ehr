// Signature Audit Logs Page
// Phase 9.3.7: Admin-only compliance reporting
import { Metadata } from "next";
import { redirect } from "next/navigation";
import { isAdmin } from "@/lib/rbac";
import { SignatureAuditClient } from "@/components/admin/signature-audit-client";

export const metadata: Metadata = {
  title: "Signature Audit Logs | WoundNote",
  description: "Electronic signature audit trail and compliance reporting",
};

export const dynamic = "force-dynamic";

export default async function SignatureAuditPage() {
  const hasAccess = await isAdmin();
  if (!hasAccess) {
    redirect("/dashboard");
  }

  return (
    <div className="space-y-6">
      <div className="page-hero">
        <h1 className="text-3xl font-bold tracking-tight">
          Signature Audit Logs
        </h1>
        <p className="text-muted-foreground mt-1">
          Comprehensive audit trail of all electronic signatures for compliance
          reporting
        </p>
      </div>

      <SignatureAuditClient />
    </div>
  );
}
