"use client";

// Admin page shell: Users tab (the real work) + an Exports stub tab.
// The export center is deferred — completed notes are downloadable
// per-note from the inbox Completed tab, so the stub points there.

import Link from "next/link";
import { ArrowRight, FileText, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { UsersPanel } from "./users-panel";
import type { AdminUserRow, FacilityOption, PendingInviteRow, ViewerRole } from "./types";

export function AdminTabs({
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
  return (
    <Tabs defaultValue="users" className="gap-4">
      <TabsList aria-label="Admin sections">
        <TabsTrigger value="users" className="min-h-8 px-4">
          <Users />
          Users
        </TabsTrigger>
        <TabsTrigger value="exports" className="min-h-8 px-4">
          <FileText />
          Exports
        </TabsTrigger>
      </TabsList>

      <TabsContent value="users">
        <UsersPanel
          users={users}
          usersError={usersError}
          invites={invites}
          invitesError={invitesError}
          facilities={facilities}
          viewerRole={viewerRole}
          countsUnavailable={countsUnavailable}
        />
      </TabsContent>

      <TabsContent value="exports">
        <section className="rounded-lg border bg-card p-6 sm:p-8">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Exports
          </p>
          <h2 className="mt-2 text-lg font-semibold text-foreground">
            The export center arrives later
          </h2>
          <p className="mt-2 max-w-prose text-sm leading-relaxed text-muted-foreground">
            Bulk exports are deferred while the core field workflow settles in. Every completed
            note is already available as a paper-mirror PDF — open the inbox and switch to the
            Completed tab to download notes one at a time.
          </p>
          <Button asChild className="mt-5 min-h-11">
            <Link href="/inbox">
              Open the inbox
              <ArrowRight />
            </Link>
          </Button>
        </section>
      </TabsContent>
    </Tabs>
  );
}
