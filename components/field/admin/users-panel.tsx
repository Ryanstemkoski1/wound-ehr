"use client";

// Users tab: the team table (name / email / credentials / role /
// facilities / status), the invite dialog, and pending invites with
// cancel. Mutations reuse the existing admin actions; every failure
// branch lands in a toast.

import { useState } from "react";
import { useRouter } from "next/navigation";
import { format } from "date-fns";
import { toast } from "sonner";
import { Loader2, X } from "lucide-react";
import { cancelInvite } from "@/app/actions/admin";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { DeactivateUserDialog } from "./deactivate-user-dialog";
import { InviteUserDialog } from "./invite-user-dialog";
import type { AdminUserRow, FacilityOption, PendingInviteRow, ViewerRole } from "./types";

const ROLE_LABELS: Record<AdminUserRow["role"], string> = {
  tenant_admin: "Org Admin",
  facility_admin: "Office / QA",
  user: "Field Nurse",
};

function roleLabel(role: string): string {
  return ROLE_LABELS[role as AdminUserRow["role"]] ?? role;
}

function RoleBadge({ role }: { role: AdminUserRow["role"] }) {
  return (
    <Badge
      variant={
        role === "tenant_admin" ? "default" : role === "facility_admin" ? "secondary" : "outline"
      }
    >
      {ROLE_LABELS[role]}
    </Badge>
  );
}

export function UsersPanel({
  users,
  usersError,
  invites,
  invitesError,
  facilities,
  viewerRole,
  countsUnavailable,
}: {
  users: AdminUserRow[];
  usersError: string | null;
  invites: PendingInviteRow[];
  invitesError: string | null;
  facilities: FacilityOption[];
  viewerRole: ViewerRole;
  countsUnavailable: boolean;
}) {
  const router = useRouter();
  const [cancellingId, setCancellingId] = useState<string | null>(null);

  async function handleCancelInvite(invite: PendingInviteRow) {
    setCancellingId(invite.id);
    try {
      const result = await cancelInvite(invite.id);
      if ("error" in result) {
        toast.error(result.error ?? "Failed to cancel the invite");
        return;
      }
      toast.success(`Invite for ${invite.email} cancelled`);
      router.refresh();
    } catch {
      toast.error("Failed to cancel the invite");
    } finally {
      setCancellingId(null);
    }
  }

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground">
          {users.length} active user{users.length === 1 ? "" : "s"}
          {viewerRole === "facility_admin" ? " at your facility" : ""}
        </p>
        <InviteUserDialog facilities={facilities} viewerRole={viewerRole} />
      </div>

      {viewerRole === "tenant_admin" && countsUnavailable && !usersError && (
        <p className="mt-3 text-xs text-muted-foreground">
          Open-note counts are unavailable right now — the deactivate flow will ask you to verify
          the schedule instead.
        </p>
      )}

      {usersError ? (
        <div className="mt-4 rounded-lg border border-destructive/30 bg-destructive/5 px-6 py-10 text-center">
          <p className="font-medium">Could not load users</p>
          <p className="mt-1 text-sm text-muted-foreground">{usersError}</p>
        </div>
      ) : (
        <div className="mt-4 overflow-x-auto rounded-lg border bg-card">
          <Table className="min-w-[44rem]">
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Credentials</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Facilities</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">
                  <span className="sr-only">Actions</span>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {users.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="py-10 text-center text-sm text-muted-foreground">
                    No users yet — send the first invite.
                  </TableCell>
                </TableRow>
              ) : (
                users.map((user) => (
                  <TableRow key={user.userId}>
                    <TableCell className="font-medium text-foreground">
                      {user.name}
                      {user.isSelf && <span className="ml-1.5 text-xs text-muted-foreground">(you)</span>}
                    </TableCell>
                    <TableCell className="text-muted-foreground">{user.email}</TableCell>
                    <TableCell>
                      <Badge variant="outline">{user.credentials}</Badge>
                    </TableCell>
                    <TableCell>
                      <RoleBadge role={user.role} />
                    </TableCell>
                    <TableCell className="max-w-[16rem] text-sm text-muted-foreground">
                      {user.facilityNames.length > 0 ? user.facilityNames.join(", ") : "—"}
                    </TableCell>
                    <TableCell>
                      <span className="inline-flex items-center gap-1.5 text-sm text-muted-foreground">
                        <span aria-hidden className="size-1.5 rounded-full bg-primary" />
                        Active
                      </span>
                    </TableCell>
                    <TableCell className="text-right">
                      {viewerRole === "tenant_admin" && !user.isSelf ? (
                        <DeactivateUserDialog user={user} />
                      ) : (
                        <span aria-hidden className="text-sm text-muted-foreground">
                          —
                        </span>
                      )}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      )}

      {viewerRole === "facility_admin" && !usersError && (
        <p className="mt-3 text-xs text-muted-foreground">
          Showing users at your facility. Deactivating users is limited to organization admins.
        </p>
      )}

      {invitesError && (
        <p className="mt-6 text-xs text-muted-foreground">
          Pending invites could not be loaded: {invitesError}
        </p>
      )}

      {invites.length > 0 && (
        <section className="mt-8">
          <h2 className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Pending invites
          </h2>
          <ul className="mt-3 space-y-2">
            {invites.map((invite) => (
              <li
                key={invite.id}
                className="flex flex-wrap items-center gap-x-3 gap-y-2 rounded-lg border bg-card px-4 py-3"
              >
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-foreground">{invite.email}</p>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    {roleLabel(invite.role)} · {invite.credentials}
                    {invite.facilityName ? ` · ${invite.facilityName}` : ""} · expires{" "}
                    {format(new Date(invite.expiresAt), "MMM d")}
                  </p>
                </div>
                <Badge variant="secondary">Invited</Badge>
                <Button
                  variant="ghost"
                  size="icon-lg"
                  aria-label={`Cancel invite for ${invite.email}`}
                  onClick={() => handleCancelInvite(invite)}
                  disabled={cancellingId === invite.id}
                >
                  {cancellingId === invite.id ? <Loader2 className="animate-spin" /> : <X />}
                </Button>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
