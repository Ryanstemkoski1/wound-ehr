import type { Metadata } from "next";
import { getPendingInvites, getTenantUsers } from "@/app/actions/admin";
import {
  getOpenNoteCountsByNurse,
  getUserFacilityAssignments,
} from "@/app/actions/field-admin";
import { getAccessibleFacilities, getUserRole } from "@/lib/rbac";
import { AdminTabs } from "@/components/field/admin/admin-tabs";
import type {
  AdminUserRow,
  FacilityOption,
  PendingInviteRow,
  ViewerRole,
} from "@/components/field/admin/types";

export const metadata: Metadata = {
  title: "Admin",
};

// Users administration for the Field Ops surface. Reads and mutations
// reuse the existing admin actions (app/actions/admin.ts); this page
// only adds field-surface context: per-user open-note counts for the
// deactivate flow and facility assignments for the table. Role check
// is enforced here server-side — middleware alone doesn't cover it.
export default async function AdminPage() {
  const role = await getUserRole();
  if (!role || (role.role !== "tenant_admin" && role.role !== "facility_admin")) {
    return (
      <div className="mx-auto w-full max-w-3xl px-4 py-16 sm:px-6">
        <div className="rounded-lg border bg-card p-8 text-center">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Admin
          </p>
          <h1 className="mt-2 text-xl font-semibold tracking-tight">Admin access required</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            User management is limited to office and organization administrators.
          </p>
        </div>
      </div>
    );
  }
  const viewerRole: ViewerRole = role.role === "tenant_admin" ? "tenant_admin" : "facility_admin";

  const [usersRes, invitesRes, facilitiesRaw, countsRes, assignmentsRes] = await Promise.all([
    getTenantUsers(),
    getPendingInvites(),
    getAccessibleFacilities(),
    getOpenNoteCountsByNurse(),
    getUserFacilityAssignments(),
  ]);

  const counts = countsRes.success ? countsRes.counts : null;
  const facilitiesByUser = assignmentsRes.success ? assignmentsRes.byUser : {};

  let users: AdminUserRow[] = [];
  let usersError: string | null = null;
  if ("error" in usersRes || !usersRes.data) {
    usersError = ("error" in usersRes ? usersRes.error : undefined) ?? "Failed to load users";
  } else {
    users = usersRes.data
      .map(
        (row): AdminUserRow => ({
          userId: row.user_id,
          name: row.users?.name ?? "(no name on file)",
          email: row.users?.email ?? "unknown",
          credentials: row.users?.credentials ?? "—",
          role: row.role,
          facilityNames:
            row.role === "tenant_admin"
              ? ["All facilities"]
              : (facilitiesByUser[row.user_id]?.length ?? 0) > 0
                ? facilitiesByUser[row.user_id]
                : row.facility
                  ? [row.facility.name]
                  : [],
          openNotes: counts ? (counts[row.user_id] ?? 0) : null,
          isSelf: row.user_id === role.user_id,
        })
      )
      .sort((a, b) => a.name.localeCompare(b.name));
  }

  // Map invites down to a narrow DTO — the raw rows carry the invite
  // token, which must never reach the client.
  const invitesError = ("error" in invitesRes ? invitesRes.error : null) ?? null;
  let invites: PendingInviteRow[] = [];
  if (!("error" in invitesRes) && invitesRes.data) {
    invites = invitesRes.data.map(
      (invite): PendingInviteRow => ({
        id: invite.id,
        email: invite.email,
        role: invite.role,
        credentials: invite.credentials,
        facilityName: invite.facility?.name ?? null,
        expiresAt: invite.expires_at,
      })
    );
  }

  const facilities: FacilityOption[] = (facilitiesRaw ?? []).map((facility) => ({
    id: facility.id,
    name: facility.name,
  }));

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-6 sm:px-6">
      <header className="mb-6">
        <p className="text-xs font-semibold uppercase tracking-wide text-primary">
          Practice settings
        </p>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight">Admin</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Manage who can schedule, document, and review field visits.
        </p>
      </header>

      <AdminTabs
        users={users}
        usersError={usersError}
        invites={invites}
        invitesError={invitesError}
        facilities={facilities}
        viewerRole={viewerRole}
        countsUnavailable={counts === null}
      />
    </div>
  );
}
