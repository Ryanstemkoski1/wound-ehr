// Server Actions for Signature Audit Logs
// Phase 9.3.7: Admin-only reporting and compliance views
"use server";

import { createClient } from "@/lib/supabase/server";
import { getUserRole } from "@/lib/rbac";

// =====================================================
// TYPES
// =====================================================

export type SignatureAuditLog = {
  signature_id: string;
  signature_type: "patient" | "provider" | "consent";
  signature_method: "draw" | "type" | "upload";
  signed_at: string;
  ip_address: string | null;
  visit_id: string | null;
  visit_date: string | null;
  visit_type: string | null;
  visit_status: string | null;
  patient_id: string;
  patient_name: string;
  patient_mrn: string;
  facility_id: string;
  facility_name: string;
  signer_user_id: string | null;
  signer_name: string;
  signer_role: string | null;
  signer_credentials: string | null;
  created_at: string;
};

export type SignatureAuditStats = {
  total_signatures: number;
  consent_signatures: number;
  patient_signatures: number;
  provider_signatures: number;
  drawn_signatures: number;
  typed_signatures: number;
  uploaded_signatures: number;
  total_visits_signed: number;
  unique_signers: number;
};

export type SignatureAuditFilters = {
  tenantId?: string;
  facilityId?: string;
  userId?: string;
  signatureType?: "patient" | "provider" | "consent";
  startDate?: string;
  endDate?: string;
  limit?: number;
  offset?: number;
};

// =====================================================
// ADMIN GUARD
// =====================================================

async function requireAdmin() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error("Not authenticated");
  }

  const userRoleData = await getUserRole();
  if (
    !userRoleData ||
    (userRoleData.role !== "tenant_admin" &&
      userRoleData.role !== "facility_admin")
  ) {
    throw new Error("Admin access required");
  }

  return { supabase, user };
}

// =====================================================
// SIGNATURE AUDIT LOG QUERIES
// =====================================================

/**
 * Get signature audit logs with filtering
 * Admin-only - requires tenant_admin or facility_admin role
 */
export async function getSignatureAuditLogs(
  filters: SignatureAuditFilters = {}
) {
  try {
    const { supabase } = await requireAdmin();

    const { data, error } = await supabase.rpc("get_signature_audit_logs", {
      p_tenant_id: filters.tenantId || null,
      p_facility_id: filters.facilityId || null,
      p_user_id: filters.userId || null,
      p_signature_type: filters.signatureType || null,
      p_start_date: filters.startDate || null,
      p_end_date: filters.endDate || null,
      p_limit: filters.limit || 100,
      p_offset: filters.offset || 0,
    });

    if (error) {
      console.error("Error fetching signature audit logs:", error);
      return { error: error.message };
    }

    return { data: data as SignatureAuditLog[] };
  } catch (error) {
    console.error("Exception fetching signature audit logs:", error);
    return {
      error:
        error instanceof Error ? error.message : "Failed to fetch audit logs",
    };
  }
}

/**
 * Get signature audit statistics
 * Admin-only - requires tenant_admin or facility_admin role
 */
export async function getSignatureAuditStats(
  filters: Pick<
    SignatureAuditFilters,
    "tenantId" | "facilityId" | "startDate" | "endDate"
  > = {}
) {
  try {
    const { supabase } = await requireAdmin();

    const { data, error } = await supabase.rpc("get_signature_audit_stats", {
      p_tenant_id: filters.tenantId || null,
      p_facility_id: filters.facilityId || null,
      p_start_date: filters.startDate || null,
      p_end_date: filters.endDate || null,
    });

    if (error) {
      console.error("Error fetching signature audit stats:", error);
      return { error: error.message };
    }

    // RPC returns array with single row, extract first item
    const stats = data?.[0] as SignatureAuditStats;
    return { data: stats };
  } catch (error) {
    console.error("Exception fetching signature audit stats:", error);
    return {
      error:
        error instanceof Error ? error.message : "Failed to fetch audit stats",
    };
  }
}

/**
 * Export signature audit logs as CSV
 * Admin-only - requires tenant_admin or facility_admin role
 */
export async function exportSignatureAuditLogs(
  filters: SignatureAuditFilters = {}
) {
  try {
    const { supabase } = await requireAdmin();

    // Get all logs without limit for export
    const { data, error } = await supabase.rpc("get_signature_audit_logs", {
      p_tenant_id: filters.tenantId || null,
      p_facility_id: filters.facilityId || null,
      p_user_id: filters.userId || null,
      p_signature_type: filters.signatureType || null,
      p_start_date: filters.startDate || null,
      p_end_date: filters.endDate || null,
      p_limit: 10000, // Max for export
      p_offset: 0,
    });

    if (error) {
      console.error("Error exporting signature audit logs:", error);
      return { error: error.message };
    }

    const logs = data as SignatureAuditLog[];

    // Generate CSV
    const headers = [
      "Signature ID",
      "Type",
      "Method",
      "Signed At",
      "IP Address",
      "Patient Name",
      "Patient MRN",
      "Facility",
      "Visit Date",
      "Visit Type",
      "Visit Status",
      "Signer Name",
      "Signer Role",
      "Signer Credentials",
      "Created At",
    ];

    const rows = logs.map((log) => [
      log.signature_id,
      log.signature_type,
      log.signature_method,
      log.signed_at,
      log.ip_address || "",
      log.patient_name,
      log.patient_mrn,
      log.facility_name,
      log.visit_date || "",
      log.visit_type || "",
      log.visit_status || "",
      log.signer_name,
      log.signer_role || "",
      log.signer_credentials || "",
      log.created_at,
    ]);

    const csvContent = [
      headers.join(","),
      ...rows.map((row) =>
        row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(",")
      ),
    ].join("\n");

    return { data: csvContent };
  } catch (error) {
    console.error("Exception exporting signature audit logs:", error);
    return {
      error: error instanceof Error ? error.message : "Failed to export logs",
    };
  }
}
