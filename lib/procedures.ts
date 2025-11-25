// Procedure Scope Utilities
// Phase 9.3.1: Credential-based procedure restrictions

import { createClient } from "@/lib/supabase/server";
import type { Credentials } from "@/lib/credentials";

export type ProcedureScope = {
  id: string;
  procedure_code: string;
  procedure_name: string;
  allowed_credentials: Credentials[];
  category: string | null;
  description: string | null;
  created_at: string;
  updated_at: string;
};

export type AllowedProcedure = {
  procedure_code: string;
  procedure_name: string;
  category: string | null;
};

export type RestrictedProcedure = {
  procedure_code: string;
  procedure_name: string;
  category: string | null;
  required_credentials: Credentials[];
};

// Procedure categories
export const PROCEDURE_CATEGORIES = {
  debridement: "Debridement",
  wound_care: "Wound Care",
  diagnostic: "Diagnostic",
  preventive: "Preventive",
  advanced_therapy: "Advanced Therapy",
  other: "Other",
} as const;

export type ProcedureCategory = keyof typeof PROCEDURE_CATEGORIES;

/**
 * Check if a user with given credentials can perform a specific procedure
 */
export async function canPerformProcedure(
  credentials: Credentials | null | undefined,
  procedureCode: string
): Promise<boolean> {
  if (!credentials) return false;

  const supabase = await createClient();

  // Use RPC function for efficient check
  const { data, error } = await supabase.rpc("can_perform_procedure", {
    user_credentials: credentials,
    cpt_code: procedureCode,
  });

  if (error) {
    console.error("Error checking procedure permission:", error);
    return false;
  }

  return data === true;
}

/**
 * Get all procedures allowed for a user's credentials
 */
export async function getAllowedProcedures(
  credentials: Credentials | null | undefined
): Promise<AllowedProcedure[]> {
  if (!credentials) return [];

  const supabase = await createClient();

  // Query procedure_scopes table directly instead of using RPC
  const { data, error } = await supabase
    .from("procedure_scopes")
    .select("procedure_code, procedure_name, category")
    .contains("allowed_credentials", [credentials])
    .order("category")
    .order("procedure_code");

  if (error) {
    console.error("Error fetching allowed procedures:", error);
    console.error("Credentials passed:", credentials);
    console.error("Error details:", JSON.stringify(error));
    return [];
  }

  return data || [];
}

/**
 * Get all procedures restricted for a user's credentials
 */
export async function getRestrictedProcedures(
  credentials: Credentials | null | undefined
): Promise<RestrictedProcedure[]> {
  if (!credentials) return [];

  const supabase = await createClient();

  // Query procedure_scopes table directly instead of using RPC
  const { data, error } = await supabase
    .from("procedure_scopes")
    .select("procedure_code, procedure_name, category, allowed_credentials")
    .not("allowed_credentials", "cs", `{${credentials}}`)
    .order("category")
    .order("procedure_code");

  if (error) {
    console.error("Error fetching restricted procedures:", error);
    console.error("Credentials passed:", credentials);
    console.error("Error details:", JSON.stringify(error));
    return [];
  }

  // Map to required_credentials for consistency with RPC function
  return (data || []).map((proc) => ({
    procedure_code: proc.procedure_code,
    procedure_name: proc.procedure_name,
    category: proc.category,
    required_credentials: proc.allowed_credentials,
  }));
}

/**
 * Get all procedures allowed for a user's credentials, grouped by category
 */
export async function getAllowedProceduresByCategory(
  credentials: Credentials | null | undefined
): Promise<Record<string, AllowedProcedure[]>> {
  const procedures = await getAllowedProcedures(credentials);

  const grouped: Record<string, AllowedProcedure[]> = {};

  procedures.forEach((proc) => {
    const category = proc.category || "other";
    if (!grouped[category]) {
      grouped[category] = [];
    }
    grouped[category].push(proc);
  });

  return grouped;
}

/**
 * Get all procedure scopes (admin only)
 */
export async function getAllProcedureScopes(): Promise<ProcedureScope[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("procedure_scopes")
    .select("*")
    .order("category", { ascending: true })
    .order("procedure_code", { ascending: true });

  if (error) {
    console.error("Error fetching procedure scopes:", error);
    return [];
  }

  return data || [];
}

/**
 * Filter a list of CPT codes to only include allowed ones for user's credentials
 * Useful for filtering billing code dropdowns
 */
export async function filterAllowedCPTCodes(
  credentials: Credentials | null | undefined,
  cptCodes: string[]
): Promise<string[]> {
  if (!credentials || cptCodes.length === 0) return [];

  const allowedProcedures = await getAllowedProcedures(credentials);
  const allowedCodes = new Set(allowedProcedures.map((p) => p.procedure_code));

  return cptCodes.filter((code) => allowedCodes.has(code));
}

/**
 * Check if multiple CPT codes are all allowed for user's credentials
 * Returns array of { code, allowed } objects
 */
export async function checkMultipleProcedures(
  credentials: Credentials | null | undefined,
  procedureCodes: string[]
): Promise<{ code: string; allowed: boolean; name?: string }[]> {
  if (!credentials || procedureCodes.length === 0) return [];

  const supabase = await createClient();

  // Get all procedure scopes for the codes
  const { data: scopes, error } = await supabase
    .from("procedure_scopes")
    .select("procedure_code, procedure_name, allowed_credentials")
    .in("procedure_code", procedureCodes);

  if (error) {
    console.error("Error checking multiple procedures:", error);
    return procedureCodes.map((code) => ({ code, allowed: false }));
  }

  return procedureCodes.map((code) => {
    const scope = scopes?.find((s) => s.procedure_code === code);

    // If no scope found, allow by default (not restricted)
    if (!scope) {
      return { code, allowed: true };
    }

    // Check if user's credentials are in allowed list
    const allowed = scope.allowed_credentials.includes(credentials);

    return {
      code,
      allowed,
      name: scope.procedure_name,
    };
  });
}

/**
 * Validate billing codes before saving - server-side validation
 * Throws error if any restricted procedures are attempted
 */
export async function validateBillingCodes(
  credentials: Credentials | null | undefined,
  cptCodes: string[]
): Promise<{ valid: boolean; errors: string[] }> {
  if (!credentials) {
    return {
      valid: false,
      errors: ["User credentials not found"],
    };
  }

  if (cptCodes.length === 0) {
    return { valid: true, errors: [] };
  }

  const checks = await checkMultipleProcedures(credentials, cptCodes);
  const errors: string[] = [];

  checks.forEach((check) => {
    if (!check.allowed) {
      errors.push(
        `Cannot document CPT ${check.code}${check.name ? ` (${check.name})` : ""}: Requires MD/DO/PA/NP credentials`
      );
    }
  });

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Get human-readable restriction message for a procedure
 */
export function getRestrictionMessage(
  procedureCode: string,
  requiredCredentials: Credentials[]
): string {
  const credList = requiredCredentials.join(", ");
  return `CPT ${procedureCode} requires ${credList} credentials`;
}

/**
 * Check if credentials have full procedure access (no restrictions)
 */
export function hasFullProcedureAccess(
  credentials: Credentials | null | undefined
): boolean {
  if (!credentials) return false;
  return ["MD", "DO", "PA", "NP"].includes(credentials);
}

/**
 * Check if credentials have limited procedure access (has restrictions)
 */
export function hasLimitedProcedureAccess(
  credentials: Credentials | null | undefined
): boolean {
  if (!credentials) return true;
  return ["RN", "LVN", "CNA"].includes(credentials);
}
