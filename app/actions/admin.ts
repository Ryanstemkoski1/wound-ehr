// Server Actions for Admin Management (Tenant & Facility Admins)
"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  requireTenantAdmin,
  requireAdmin,
  getUserRole,
  getUserTenantId,
} from "@/lib/rbac";
import crypto from "crypto";
import { sendInviteEmail } from "@/lib/email";

// =====================================================
// VALIDATION SCHEMAS
// =====================================================

const inviteUserSchema = z.object({
  email: z.string().email("Invalid email address"),
  role: z.enum(["tenant_admin", "facility_admin", "user"]),
  credentials: z.enum(["RN", "LVN", "MD", "DO", "PA", "NP", "CNA", "Admin"]),
  facilityId: z.string().optional(),
});

const updateUserRoleSchema = z.object({
  userId: z.string().min(1, "User ID is required"),
  role: z.enum(["tenant_admin", "facility_admin", "user"]),
  credentials: z.enum(["RN", "LVN", "MD", "DO", "PA", "NP", "CNA", "Admin"]),
  facilityId: z.string().optional(),
});

// =====================================================
// USER MANAGEMENT
// =====================================================

/**
 * Get all users in the current tenant with email and name
 */
export async function getTenantUsers() {
  try {
    await requireAdmin();

    const supabase = await createClient();
    const tenantId = await getUserTenantId();

    if (!tenantId) {
      return { error: "No tenant found" };
    }

    // Get all user roles in tenant using RPC to avoid RLS recursion
    const { data: userRoles, error: rolesError } = await supabase
      .rpc("get_tenant_user_roles", { tenant_uuid: tenantId });

    if (rolesError) {
      console.error("Error fetching user roles:", rolesError);
      throw rolesError;
    }

    // Get facility info for roles that have facility_id
    const facilityIds = (userRoles as any[])
      ?.filter((ur: any) => ur.facility_id)
      .map((ur: any) => ur.facility_id) || [];
    
    let facilitiesMap = new Map();
    if (facilityIds.length > 0) {
      const { data: facilities } = await supabase
        .from("facilities")
        .select("id, name")
        .in("id", facilityIds);
      
      facilitiesMap = new Map(facilities?.map((f) => [f.id, f]) || []);
    }

    // Add facility info to user roles
    const userRolesWithFacility = (userRoles as any[])?.map((role: any) => ({
      ...role,
      facility: role.facility_id ? facilitiesMap.get(role.facility_id) : null,
    }));

    // Get user details from the users table
    const userIds = userRolesWithFacility?.map((ur: any) => ur.user_id) || [];
    if (userIds.length === 0) {
      return { data: [] };
    }

    const { data: usersData, error: usersError } = await supabase
      .from("users")
      .select("id, email, name, credentials")
      .in("id", userIds);

    if (usersError) {
      console.error("Error fetching users:", usersError);
      throw usersError;
    }

    // Combine user roles with user details
    const usersMap = new Map(usersData?.map((u) => [u.id, u]) || []);
    const combinedData = userRolesWithFacility?.map((role: any) => ({
      ...role,
      users: usersMap.get(role.user_id) || null,
    }));

    return { data: combinedData };
  } catch (error) {
    console.error("Error fetching tenant users:", error);
    return { error: "Failed to fetch users" };
  }
}

/**
 * Invite a new user to the tenant
 */
export async function inviteUser(formData: FormData) {
  try {
    const supabase = await createClient();
    const {
      data: { user: currentUser },
    } = await supabase.auth.getUser();

    if (!currentUser) {
      return { error: "Unauthorized" };
    }

    const currentRole = await getUserRole();
    if (!currentRole) {
      return { error: "No role found" };
    }

    // Validate input
    const result = inviteUserSchema.safeParse({
      email: formData.get("email"),
      role: formData.get("role"),
      credentials: formData.get("credentials"),
      facilityId: formData.get("facilityId"),
    });

    if (!result.success) {
      return {
        error: result.error.issues[0].message,
      };
    }

    const { email, role, credentials, facilityId } = result.data;

    // Check permissions
    if (role === "tenant_admin" || role === "facility_admin") {
      await requireTenantAdmin();
    } else if (role === "user") {
      // Facility admins can invite users to their facility
      if (currentRole.role === "facility_admin") {
        if (!facilityId || facilityId !== currentRole.facility_id) {
          return {
            error: "Facility admins can only invite users to their facility",
          };
        }
      } else {
        await requireAdmin();
      }
    }

    // Validate facility requirement
    if ((role === "facility_admin" || role === "user") && !facilityId) {
      return {
        error: "Facility is required for facility admin and user roles",
      };
    }

    // Check if user already has an invite
    const { data: existingInvite } = await supabase
      .from("user_invites")
      .select("id")
      .eq("email", email)
      .eq("tenant_id", currentRole.tenant_id)
      .is("accepted_at", null)
      .single();

    if (existingInvite) {
      return { error: "User already has a pending invite" };
    }

    // Generate invite token
    const inviteToken = crypto.randomBytes(32).toString("hex");
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7); // Expires in 7 days

    // Create invite
    const { error: inviteError } = await supabase.from("user_invites").insert({
      email,
      tenant_id: currentRole.tenant_id,
      role,
      credentials,
      facility_id: facilityId || null,
      invited_by: currentUser.id,
      invite_token: inviteToken,
      expires_at: expiresAt.toISOString(),
    });

    if (inviteError) throw inviteError;

    // Get facility name for email
    let facilityName: string | undefined;
    if (facilityId) {
      const { data: facility } = await supabase
        .from("facilities")
        .select("name")
        .eq("id", facilityId)
        .single();
      facilityName = facility?.name;
    }

    // Send invite email
    const emailResult = await sendInviteEmail({
      to: email,
      inviteToken,
      invitedBy: currentUser.email || "Admin",
      role,
      facilityName,
    });

    if (emailResult.error) {
      console.error("Email sending failed:", emailResult.error);
      // Continue even if email fails - invite still created
    }

    revalidatePath("/admin/invites");
    revalidatePath("/admin/users");

    return {
      success: true,
      inviteToken,
      message: "User invited successfully. Invitation email sent.",
    };
  } catch (error) {
    console.error("Error inviting user:", error);
    return {
      error: error instanceof Error ? error.message : "Failed to invite user",
    };
  }
}

/**
 * Update user role
 */
export async function updateUserRole(formData: FormData) {
  try {
    await requireTenantAdmin();

    const supabase = await createClient();
    const tenantId = await getUserTenantId();

    // Validate input
    const validatedFields = updateUserRoleSchema.safeParse({
      userId: formData.get("userId"),
      role: formData.get("role"),
      credentials: formData.get("credentials"),
      facilityId: formData.get("facilityId") || undefined,
    });

    if (!validatedFields.success) {
      return {
        error: validatedFields.error.issues[0].message,
      };
    }

    const { userId, role, credentials, facilityId } = validatedFields.data;

    // Validate facility requirement
    if ((role === "facility_admin" || role === "user") && !facilityId) {
      return {
        error: "Facility is required for facility admin and user roles",
      };
    }

    // Update user credentials in users table
    const { error: updateUserError } = await supabase
      .from("users")
      .update({ credentials })
      .eq("id", userId);

    if (updateUserError) {
      console.error("Error updating user credentials:", updateUserError);
      return { error: "Failed to update user credentials" };
    }

    // Update user role
    const { error: updateError } = await supabase
      .from("user_roles")
      .update({
        role,
        facility_id: facilityId || null,
        updated_at: new Date().toISOString(),
      })
      .eq("user_id", userId)
      .eq("tenant_id", tenantId!);

    if (updateError) {
      console.error("Error updating user role:", updateError);
      return { error: "Failed to update user role" };
    }

    revalidatePath("/admin/users");

    return { success: true, message: "User role updated successfully" };
  } catch (error) {
    console.error("Error updating user role:", error);
    return {
      error:
        error instanceof Error ? error.message : "Failed to update user role",
    };
  }
}

/**
 * Remove user from tenant (and optionally delete account completely)
 */
export async function removeUserFromTenant(userId: string) {
  try {
    await requireTenantAdmin();

    const supabase = await createClient();
    const adminClient = createAdminClient();
    const tenantId = await getUserTenantId();

    // Check if user has roles in other tenants
    const { data: otherRoles } = await supabase
      .from("user_roles")
      .select("id")
      .eq("user_id", userId)
      .neq("tenant_id", tenantId!);

    // Delete user role from current tenant
    const { error: deleteRoleError } = await supabase
      .from("user_roles")
      .delete()
      .eq("user_id", userId)
      .eq("tenant_id", tenantId!);

    if (deleteRoleError) throw deleteRoleError;

    // If user has no other tenant roles, delete the user account completely
    if (!otherRoles || otherRoles.length === 0) {
      // First, delete from auth.users using admin API (requires service role)
      const { error: deleteAuthError } = await adminClient.auth.admin.deleteUser(
        userId
      );

      if (deleteAuthError) {
        console.error("Error deleting auth user:", deleteAuthError);
        throw new Error(
          `Failed to delete user account: ${deleteAuthError.message}`
        );
      }

      // The users table record will be deleted automatically via ON DELETE CASCADE
      // from the auth.users foreign key relationship
    }

    revalidatePath("/admin/users");
    revalidatePath("/admin");

    return {
      success: true,
      message:
        !otherRoles || otherRoles.length === 0
          ? "User account deleted completely"
          : "User removed from your organization",
    };
  } catch (error) {
    console.error("Error removing user:", error);
    return {
      error: error instanceof Error ? error.message : "Failed to remove user",
    };
  }
}

// =====================================================
// INVITE MANAGEMENT
// =====================================================

/**
 * Get all pending invites for current tenant
 */
export async function getPendingInvites() {
  try {
    await requireAdmin();

    const supabase = await createClient();
    const tenantId = await getUserTenantId();

    const { data, error } = await supabase
      .from("user_invites")
      .select(
        `
        *,
        facility:facilities(id, name)
      `
      )
      .eq("tenant_id", tenantId!)
      .is("accepted_at", null)
      .gt("expires_at", new Date().toISOString())
      .order("created_at", { ascending: false });

    if (error) throw error;

    return { data };
  } catch (error) {
    console.error("Error fetching invites:", error);
    return { error: "Failed to fetch invites" };
  }
}

/**
 * Cancel/delete an invite
 */
export async function cancelInvite(inviteId: string) {
  try {
    await requireAdmin();

    const supabase = await createClient();

    const { error } = await supabase
      .from("user_invites")
      .delete()
      .eq("id", inviteId);

    if (error) throw error;

    revalidatePath("/admin/invites");

    return { success: true, message: "Invite cancelled" };
  } catch (error) {
    console.error("Error cancelling invite:", error);
    return { error: "Failed to cancel invite" };
  }
}

/**
 * Accept invite and create user role (called during signup)
 */
export async function acceptInvite(inviteToken: string) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return { error: "Unauthorized" };
    }

    // Get invite
    const { data: invite, error: inviteError } = await supabase
      .from("user_invites")
      .select("*")
      .eq("invite_token", inviteToken)
      .is("accepted_at", null)
      .single();

    if (inviteError || !invite) {
      return { error: "Invalid or expired invite" };
    }

    // Check if invite expired
    if (new Date(invite.expires_at) < new Date()) {
      return { error: "Invite has expired" };
    }

    // Check if email matches
    if (invite.email !== user.email) {
      return { error: "Invite email does not match user email" };
    }

    // Update user credentials in users table
    const { error: updateUserError } = await supabase
      .from("users")
      .update({ credentials: invite.credentials })
      .eq("id", user.id);

    if (updateUserError) {
      console.error("Error updating user credentials:", updateUserError);
      // Continue even if this fails - role assignment is more critical
    }

    // Check if user already has a role in this tenant
    const { data: existingRole } = await supabase
      .from("user_roles")
      .select("*")
      .eq("user_id", user.id)
      .eq("tenant_id", invite.tenant_id)
      .single();

    if (existingRole) {
      // Update existing role
      const { error: roleError } = await supabase
        .from("user_roles")
        .update({
          role: invite.role,
          facility_id: invite.facility_id,
        })
        .eq("user_id", user.id)
        .eq("tenant_id", invite.tenant_id);

      if (roleError) throw roleError;
    } else {
      // Create new user role
      const { error: roleError } = await supabase.from("user_roles").insert({
        user_id: user.id,
        tenant_id: invite.tenant_id,
        role: invite.role,
        facility_id: invite.facility_id,
      });

      if (roleError) throw roleError;
    }

    // Create user_facilities entry if facility_id is provided
    if (invite.facility_id) {
      const { error: facilityError } = await supabase
        .from("user_facilities")
        .insert({
          user_id: user.id,
          facility_id: invite.facility_id,
          is_default: true,
        });

      if (facilityError) {
        // Only log error if it's not a duplicate (user might already have facility access)
        if (!facilityError.message?.includes("duplicate")) {
          console.error("Error adding user to facility:", facilityError);
        }
      }
    }

    // Mark invite as accepted
    const { error: updateError } = await supabase
      .from("user_invites")
      .update({
        accepted_at: new Date().toISOString(),
      })
      .eq("id", invite.id);

    if (updateError) throw updateError;

    return { success: true, message: "Invite accepted successfully" };
  } catch (error) {
    console.error("Error accepting invite:", error);
    return { error: "Failed to accept invite" };
  }
}
