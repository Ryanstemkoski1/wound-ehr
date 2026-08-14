// Field surface — app shell.
// Server component: authenticates, resolves role + credentials, and
// renders the top bar, role-filtered navigation (desktop top nav +
// phone bottom tab bar), and the content column. Route-level role
// gates live in proxy.ts; this shell only decides what nav to show.

import type { ReactNode } from "react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { LogOut } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getUserCredentials, getUserRole } from "@/lib/rbac";
import { getCredentialsLabel } from "@/lib/credentials";
import { signOutField } from "@/app/actions/field-auth";
import {
  FieldNav,
  FieldTabBar,
  type FieldNavItem,
} from "@/components/field/ui/field-nav";
import { Button } from "@/components/ui/button";

export default async function FieldLayout({
  children,
}: {
  children: ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const [role, credentials, userRow] = await Promise.all([
    getUserRole(),
    getUserCredentials(),
    supabase.from("users").select("name").eq("id", user.id).maybeSingle(),
  ]);

  const displayName = userRow.data?.name ?? user.email ?? "User";
  const isOfficeAdmin =
    role?.role === "tenant_admin" || role?.role === "facility_admin";

  const navItems: FieldNavItem[] = isOfficeAdmin
    ? [
        { href: "/inbox", label: "Inbox", icon: "inbox" },
        { href: "/schedule", label: "Schedule", icon: "schedule" },
        { href: "/patients", label: "Patients", icon: "patients" },
        { href: "/admin", label: "Admin", icon: "admin" },
      ]
    : [
        { href: "/visits", label: "My Visits", icon: "visits" },
        { href: "/patients", label: "Patients", icon: "patients" },
      ];

  return (
    <div className="flex min-h-dvh flex-col bg-background">
      <header className="sticky top-0 z-40 border-b border-border bg-background/95 backdrop-blur">
        <div className="mx-auto flex h-14 w-full max-w-6xl items-center gap-4 px-4">
          <Link
            href="/"
            className="shrink-0 text-lg font-semibold tracking-tight text-foreground"
          >
            Wound<span className="text-primary">Note</span>
          </Link>

          {role && <FieldNav items={navItems} />}

          <div className="ml-auto flex items-center gap-2 sm:gap-3">
            <div className="hidden items-center gap-2 sm:flex">
              <span className="max-w-[12rem] truncate text-sm font-medium">
                {displayName}
              </span>
              {credentials && (
                <span className="rounded-full border border-border bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">
                  {getCredentialsLabel(credentials, true)}
                </span>
              )}
            </div>
            <form action={signOutField}>
              <Button
                type="submit"
                variant="ghost"
                size="icon"
                aria-label="Sign out"
                title="Sign out"
              >
                <LogOut className="h-4 w-4" />
              </Button>
            </form>
          </div>
        </div>
      </header>

      {role ? (
        <>
          <main className="mx-auto w-full max-w-6xl flex-1 px-4 pt-6 pb-24 md:pb-10">
            {children}
          </main>
          <FieldTabBar items={navItems} />
        </>
      ) : (
        <main className="mx-auto flex w-full max-w-6xl flex-1 items-start justify-center px-4 py-16">
          <div className="w-full max-w-md rounded-lg border border-border bg-card p-6 text-center">
            <p className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
              Account setup
            </p>
            <h1 className="mt-2 text-lg font-semibold">No role assigned</h1>
            <p className="mt-2 text-sm text-muted-foreground">
              Your account is not assigned to an organization yet. Contact your
              administrator to finish setting up your access, then sign in
              again.
            </p>
          </div>
        </main>
      )}
    </div>
  );
}
