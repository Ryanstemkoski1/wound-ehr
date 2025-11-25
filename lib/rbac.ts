// RBAC (Role-Based Access Control) Utilities
// Provides helper functions for checking user roles and permissions

import { createClient } from "@/lib/supabase/server";
import type { Credentials } from "@/lib/credentials";
import { requiresPatientSignature as requiresPatientSig } from "@/lib/credentials";

export type UserRole = "tenant_admin" | "facility_admin" | "user";

export type UserRoleData = {
  id: string;
  user_id: string;
  tenant_id: string;
  role: UserRole;
  facility_id: string | null;
  created_at: string;
};

export type TenantData = {
  id: string;
  name: string;
  subdomain: string | null;
  is_active: boolean;
};

/**
 * Get current user's role information
 * Returns the highest priority role if user has multiple tenant assignments
 */
export async function getUserRole(): Promise<UserRoleData | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  // Use RPC function to avoid RLS infinite recursion
  const { data, error } = await supabase.rpc("get_user_role_info", {
    user_uuid: user.id,
  });

  if (error) {
    console.error("Error fetching user role:", error);
    return null;
  }
  if (!data || data.length === 0) return null;

  // RPC returns an array, get the first item
  return data[0] as UserRoleData;
}

/**
 * Get all roles for current user (may have multiple if assigned to multiple facilities)
 */
export async function getUserRoles(): Promise<UserRoleData[]> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return [];

  const { data, error } = await supabase
    .from("user_roles")
    .select("*")
    .eq("user_id", user.id);

  if (error) return [];
  return (data as UserRoleData[]) || [];
}

/**
 * Check if current user is a tenant admin
 */
export async function isTenantAdmin(): Promise<boolean> {
  const role = await getUserRole();
  return role?.role === "tenant_admin";
}

/**
 * Check if current user is a facility admin
 */
export async function isFacilityAdmin(): Promise<boolean> {
  const role = await getUserRole();
  return role?.role === "facility_admin";
}

/**
 * Check if current user has admin privileges (tenant or facility admin)
 */
export async function isAdmin(): Promise<boolean> {
  const role = await getUserRole();
  return role?.role === "tenant_admin" || role?.role === "facility_admin";
}

/**
 * Get current user's tenant ID
 */
export async function getUserTenantId(): Promise<string | null> {
  const role = await getUserRole();
  return role?.tenant_id || null;
}

/**
 * Get current user's assigned facility IDs
 */
export async function getUserFacilityIds(): Promise<string[]> {
  const roles = await getUserRoles();
  return roles
    .map((r) => r.facility_id)
    .filter((id): id is string => id !== null);
}

/**
 * Check if user has access to a specific facility
 */
export async function hasAccessToFacility(
  facilityId: string
): Promise<boolean> {
  const role = await getUserRole();
  if (!role) return false;

  // Tenant admins have access to all facilities in their tenant
  if (role.role === "tenant_admin") {
    const supabase = await createClient();
    const { data } = await supabase
      .from("facilities")
      .select("tenant_id")
      .eq("id", facilityId)
      .single();

    return data?.tenant_id === role.tenant_id;
  }

  // Facility admins and users only have access to assigned facilities
  const facilityIds = await getUserFacilityIds();
  return facilityIds.includes(facilityId);
}

/**
 * Get accessible facilities for current user
 */
export async function getAccessibleFacilities() {
  const supabase = await createClient();
  const role = await getUserRole();

  if (!role) return [];

  // Tenant admin: get all facilities in tenant
  if (role.role === "tenant_admin") {
    const { data } = await supabase
      .from("facilities")
      .select("*")
      .eq("tenant_id", role.tenant_id)
      .eq("is_active", true)
      .order("name");

    return data || [];
  }

  // Facility admin/user: get only assigned facilities
  const facilityIds = await getUserFacilityIds();
  if (facilityIds.length === 0) return [];

  const { data } = await supabase
    .from("facilities")
    .select("*")
    .in("id", facilityIds)
    .eq("is_active", true)
    .order("name");

  return data || [];
}

/**
 * Get tenant information for current user
 */
export async function getUserTenant(): Promise<TenantData | null> {
  const tenantId = await getUserTenantId();
  if (!tenantId) return null;

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("tenants")
    .select("*")
    .eq("id", tenantId)
    .single();

  if (error) return null;
  return data as TenantData;
}

/**
 * Require tenant admin role (throws error if not authorized)
 */
export async function requireTenantAdmin() {
  const isAdmin = await isTenantAdmin();
  if (!isAdmin) {
    throw new Error("Unauthorized: Tenant admin role required");
  }
}

/**
 * Require admin role (tenant or facility admin)
 */
export async function requireAdmin() {
  const hasAdmin = await isAdmin();
  if (!hasAdmin) {
    throw new Error("Unauthorized: Admin role required");
  }
}

/**
 * Require access to specific facility
 */
export async function requireFacilityAccess(facilityId: string) {
  const hasAccess = await hasAccessToFacility(facilityId);
  if (!hasAccess) {
    throw new Error("Unauthorized: No access to this facility");
  }
}

/**
 * Get current user's credentials
 */
export async function getUserCredentials(): Promise<Credentials | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const { data, error } = await supabase
    .from("users")
    .select("credentials")
    .eq("id", user.id)
    .single();

  if (error || !data) return null;
  return data.credentials as Credentials;
}

/**
 * Check if current user's credentials require patient signatures
 */
export async function requiresPatientSignature(): Promise<boolean> {
  const credentials = await getUserCredentials();
  return requiresPatientSig(credentials);
}

/**
 * Get allowed procedures for current user based on credentials
 */
export async function getAllowedProcedures(): Promise<string[]> {
  const credentials = await getUserCredentials();
  if (!credentials) return [];

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("procedure_scopes")
    .select("procedure_code")
    .contains("allowed_credentials", [credentials]);

  if (error) return [];
  return data?.map((p) => p.procedure_code) || [];
}

/**
 * Check if current user can perform a specific procedure
 */
export async function canPerformProcedure(
  procedureCode: string
): Promise<boolean> {
  const credentials = await getUserCredentials();
  if (!credentials) return false;

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("procedure_scopes")
    .select("allowed_credentials")
    .eq("procedure_code", procedureCode)
    .single();

  if (error || !data) return true; // Default allow if procedure not in scopes

  return data.allowed_credentials.includes(credentials);
}

/**
 * Require specific credentials (throws error if not authorized)
 */
export async function requireCredentials(allowedCredentials: Credentials[]) {
  const credentials = await getUserCredentials();
  if (!credentials || !allowedCredentials.includes(credentials)) {
    throw new Error(
      `Unauthorized: Requires credentials: ${allowedCredentials.join(", ")}`
    );
  }
}
