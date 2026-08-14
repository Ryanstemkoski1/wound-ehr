// Shared DTO shapes for the Field Ops admin surface.
// Built by the server page (app/(field)/admin/page.tsx) and passed
// down to the client components — never raw database rows.

export interface FacilityOption {
  id: string;
  name: string;
}

export interface AdminUserRow {
  userId: string;
  name: string;
  email: string;
  credentials: string;
  role: "tenant_admin" | "facility_admin" | "user";
  facilityNames: string[];
  /**
   * Open field notes (scheduled / in progress / needs correction)
   * assigned to this user. null = the count could not be loaded, so
   * the deactivate flow must ask the admin to verify the schedule.
   */
  openNotes: number | null;
  isSelf: boolean;
}

export interface PendingInviteRow {
  id: string;
  email: string;
  role: string;
  credentials: string;
  facilityName: string | null;
  expiresAt: string;
}

export type ViewerRole = "tenant_admin" | "facility_admin";
