import { beforeEach, describe, expect, it, vi } from "vitest";
import { revalidatePath } from "next/cache";
import { auditPhiAccess } from "@/lib/audit-log";
import {
  acknowledgeAddendum,
  approveNote,
  getCorrectionsForClinician,
  getInboxNotes,
  markAsCorrected,
  notifyAddendum,
  requestCorrection,
  sendNoteToOffice,
  voidNote,
} from "@/app/actions/approval-workflow";
import {
  eqValue,
  useFakeSupabase,
  type FakeSupabase,
  type QueryResponse,
  type RecordedQuery,
} from "../helpers/supabase";
import {
  makeAuthUser,
  TEST_FACILITY_ID,
  TEST_USER_ID,
} from "../helpers/fixtures";

// The audit logger is fire-and-forget (`void auditPhiAccess(...)`), so it is
// mocked to assert the exact audit entry without racing the un-awaited
// promise. Everything else (e.g. the Field Ops guard `isFieldVisit`) runs
// for real against the fake database.
vi.mock("@/lib/audit-log", () => ({ auditPhiAccess: vi.fn() }));

const VISIT_ID = "00000000-0000-4000-8000-00000000b001";
const NOTIFICATION_ID = "00000000-0000-4000-8000-00000000c001";
const ADDENDUM_ID = "00000000-0000-4000-8000-00000000d001";
const NOW = new Date("2026-03-04T15:30:00.000Z");
const DB_ERROR = { message: "permission denied for table visits" };

let db: FakeSupabase;

beforeEach(() => {
  db = useFakeSupabase({ user: makeAuthUser() });
  vi.spyOn(console, "error").mockImplementation(() => {});
  vi.useFakeTimers();
  vi.setSystemTime(NOW);
});

// ---------------------------------------------------------------------------
// Local helpers
// ---------------------------------------------------------------------------

function givenFieldVisit() {
  db.on("field_notes", "select", { data: { id: "field-note-1" } });
}

function givenVisit(row: Record<string, unknown>) {
  db.on("visits", "select", { data: row });
}

function givenRole(role: string | null) {
  db.on("user_roles", "select", role ? { data: { role } } : {});
}

/** Successful update/insert that echoes the written row back. */
function echoRow(query: RecordedQuery): QueryResponse {
  return {
    data: {
      id: eqValue(query, "id") ?? "new-row",
      ...(query.payload as Record<string, unknown>),
    },
  };
}

function givenVisitUpdateSucceeds() {
  db.on("visits", "update", echoRow);
}

function givenVisitUpdateFails() {
  db.on("visits", "update", { data: null, error: DB_ERROR });
}

function visitUpdates() {
  return db.queries("visits", "update");
}

function revalidatedPaths() {
  return vi.mocked(revalidatePath).mock.calls.map(([path]) => path);
}

// ---------------------------------------------------------------------------
// sendNoteToOffice
// ---------------------------------------------------------------------------

describe("sendNoteToOffice", () => {
  it("rejects unauthenticated callers without touching the database", async () => {
    db.setUser(null);

    expect(await sendNoteToOffice(VISIT_ID)).toEqual({
      success: false,
      error: "Unauthorized",
    });
    expect(db.queries()).toHaveLength(0);
  });

  it("refuses visits owned by the Field Ops app", async () => {
    givenFieldVisit();
    givenVisit({ status: "signed" });

    expect(await sendNoteToOffice(VISIT_ID)).toEqual({
      success: false,
      error: "This visit is managed in the Field Ops app",
    });
    expect(eqValue(db.queries("field_notes")[0], "visit_id")).toBe(VISIT_ID);
    expect(visitUpdates()).toHaveLength(0);
  });

  it.each(["complete", "completed", "being_corrected", "signed", "submitted"])(
    "sends a %s visit to the office",
    async (status) => {
      givenVisit({ status });
      givenVisitUpdateSucceeds();

      const result = await sendNoteToOffice(VISIT_ID);

      expect(result.success).toBe(true);
      const [update] = visitUpdates();
      expect(update.payload).toEqual({
        status: "sent_to_office",
        sent_to_office_at: NOW.toISOString(),
      });
      expect(eqValue(update, "id")).toBe(VISIT_ID);
      expect(update.returning).toBe(true);
      expect(update.single).toBe(true);
    }
  );

  it("looks up the current status of the requested visit", async () => {
    givenVisit({ status: "signed" });
    givenVisitUpdateSucceeds();

    await sendNoteToOffice(VISIT_ID);

    const [lookup] = db.queries("visits", "select");
    expect(lookup.columns).toBe("status");
    expect(eqValue(lookup, "id")).toBe(VISIT_ID);
  });

  it.each([
    "draft",
    "sent_to_office",
    "needs_correction",
    "approved",
    "voided",
  ])("blocks a visit that is %s", async (status) => {
    givenVisit({ status });
    givenVisitUpdateSucceeds();

    expect(await sendNoteToOffice(VISIT_ID)).toEqual({
      success: false,
      error: `Cannot send to office — visit is currently "${status}".`,
    });
    expect(visitUpdates()).toHaveLength(0);
    expect(revalidatePath).not.toHaveBeenCalled();
    expect(auditPhiAccess).not.toHaveBeenCalled();
  });

  it("reports an unknown status when the visit cannot be found", async () => {
    expect(await sendNoteToOffice(VISIT_ID)).toEqual({
      success: false,
      error: 'Cannot send to office — visit is currently "unknown".',
    });
    expect(visitUpdates()).toHaveLength(0);
  });

  it("reports an unknown status when the visit has no status", async () => {
    givenVisit({ status: null });

    expect(await sendNoteToOffice(VISIT_ID)).toEqual({
      success: false,
      error: 'Cannot send to office — visit is currently "unknown".',
    });
  });

  it("returns the updated visit, audits the change and refreshes the inbox", async () => {
    givenVisit({ status: "signed" });
    givenVisitUpdateSucceeds();

    expect(await sendNoteToOffice(VISIT_ID)).toEqual({
      success: true,
      data: {
        id: VISIT_ID,
        status: "sent_to_office",
        sent_to_office_at: NOW.toISOString(),
      },
    });
    expect(auditPhiAccess).toHaveBeenCalledExactlyOnceWith({
      action: "update",
      table: "visits",
      recordId: VISIT_ID,
      recordType: "visit_sent_to_office",
    });
    expect(revalidatedPaths()).toEqual([
      "/dashboard/patients",
      "/dashboard/admin/inbox",
    ]);
  });

  it("fails without side effects when the update errors", async () => {
    givenVisit({ status: "signed" });
    givenVisitUpdateFails();

    const result = await sendNoteToOffice(VISIT_ID);

    expect(result).toEqual({ success: false, error: expect.any(String) });
    expect(console.error).toHaveBeenCalledWith(
      "Error sending note to office:",
      DB_ERROR
    );
    expect(auditPhiAccess).not.toHaveBeenCalled();
    expect(revalidatePath).not.toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// requestCorrection
// ---------------------------------------------------------------------------

describe("requestCorrection", () => {
  const EXISTING_NOTE = {
    note: "Please add wound measurements",
    requested_by: "00000000-0000-4000-8000-0000000000e9",
    requested_at: "2026-02-01T08:00:00.000Z",
  };

  it("rejects unauthenticated callers", async () => {
    db.setUser(null);

    expect(await requestCorrection(VISIT_ID, "Fix it")).toEqual({
      success: false,
      error: "Not authenticated",
    });
    expect(db.queries()).toHaveLength(0);
  });

  it("checks the caller's role in user_roles", async () => {
    givenRole("tenant_admin");
    givenVisitUpdateSucceeds();

    await requestCorrection(VISIT_ID, "Fix it");

    const [roleQuery] = db.queries("user_roles");
    expect(roleQuery.columns).toBe("role");
    expect(eqValue(roleQuery, "user_id")).toBe(TEST_USER_ID);
  });

  it.each([["user"], [null]])(
    "rejects callers whose role is %s",
    async (role) => {
      givenRole(role);
      givenVisitUpdateSucceeds();

      expect(await requestCorrection(VISIT_ID, "Fix it")).toEqual({
        success: false,
        error: "Unauthorized: Admin access required to request corrections",
      });
      expect(visitUpdates()).toHaveLength(0);
      expect(auditPhiAccess).not.toHaveBeenCalled();
    }
  );

  it.each(["tenant_admin", "facility_admin"])(
    "lets a %s request a correction",
    async (role) => {
      givenRole(role);
      givenVisitUpdateSucceeds();

      const result = await requestCorrection(VISIT_ID, "Fix it");

      expect(result.success).toBe(true);
      expect(visitUpdates()).toHaveLength(1);
    }
  );

  it("appends the note to the visit's existing correction notes", async () => {
    givenRole("facility_admin");
    givenVisit({ correction_notes: [EXISTING_NOTE] });
    givenVisitUpdateSucceeds();

    await requestCorrection(VISIT_ID, "Missing pain score");

    const [lookup] = db.queries("visits", "select");
    expect(lookup.columns).toBe("correction_notes");
    expect(eqValue(lookup, "id")).toBe(VISIT_ID);

    const [update] = visitUpdates();
    expect(eqValue(update, "id")).toBe(VISIT_ID);
    expect(update.payload).toEqual({
      status: "needs_correction",
      correction_notes: [
        EXISTING_NOTE,
        {
          note: "Missing pain score",
          requested_by: TEST_USER_ID,
          requested_at: NOW.toISOString(),
        },
      ],
    });
  });

  it("starts a new list when the visit has no correction notes yet", async () => {
    givenRole("tenant_admin");
    givenVisit({ correction_notes: null });
    givenVisitUpdateSucceeds();

    await requestCorrection(VISIT_ID, "Missing pain score");

    expect(visitUpdates()[0].payload).toEqual({
      status: "needs_correction",
      correction_notes: [
        {
          note: "Missing pain score",
          requested_by: TEST_USER_ID,
          requested_at: NOW.toISOString(),
        },
      ],
    });
  });

  it("audits the request with the note as reason and refreshes the inbox", async () => {
    givenRole("tenant_admin");
    givenVisitUpdateSucceeds();

    await requestCorrection(VISIT_ID, "Missing pain score");

    expect(auditPhiAccess).toHaveBeenCalledExactlyOnceWith({
      action: "update",
      table: "visits",
      recordId: VISIT_ID,
      recordType: "visit_correction_request",
      reason: "Missing pain score",
    });
    expect(revalidatedPaths()).toEqual([
      "/dashboard/admin/inbox",
      "/dashboard/patients",
    ]);
  });

  it("is not blocked by the Field Ops guard", async () => {
    givenFieldVisit();
    givenRole("tenant_admin");
    givenVisitUpdateSucceeds();

    const result = await requestCorrection(VISIT_ID, "Fix it");

    expect(result.success).toBe(true);
    expect(db.queries("field_notes")).toHaveLength(0);
  });

  it("fails without side effects when the update errors", async () => {
    givenRole("tenant_admin");
    givenVisitUpdateFails();

    const result = await requestCorrection(VISIT_ID, "Fix it");

    expect(result).toEqual({ success: false, error: expect.any(String) });
    expect(console.error).toHaveBeenCalledWith(
      "Error requesting correction:",
      DB_ERROR
    );
    expect(auditPhiAccess).not.toHaveBeenCalled();
    expect(revalidatePath).not.toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// markAsCorrected
// ---------------------------------------------------------------------------

describe("markAsCorrected", () => {
  it("rejects unauthenticated callers without touching the database", async () => {
    db.setUser(null);

    expect(await markAsCorrected(VISIT_ID)).toEqual({
      success: false,
      error: "Unauthorized",
    });
    expect(db.queries()).toHaveLength(0);
  });

  it("refuses visits owned by the Field Ops app", async () => {
    givenFieldVisit();
    givenVisit({ status: "needs_correction" });

    expect(await markAsCorrected(VISIT_ID)).toEqual({
      success: false,
      error: "This visit is managed in the Field Ops app",
    });
    expect(visitUpdates()).toHaveLength(0);
  });

  it("sends a visit that needs correction back to the office", async () => {
    givenVisit({ status: "needs_correction" });
    givenVisitUpdateSucceeds();

    expect(await markAsCorrected(VISIT_ID)).toEqual({
      success: true,
      data: { id: VISIT_ID, status: "sent_to_office" },
    });

    const [lookup] = db.queries("visits", "select");
    expect(lookup.columns).toBe("status");
    expect(eqValue(lookup, "id")).toBe(VISIT_ID);

    const [update] = visitUpdates();
    expect(update.payload).toEqual({ status: "sent_to_office" });
    expect(eqValue(update, "id")).toBe(VISIT_ID);
    expect(revalidatedPaths()).toEqual([
      "/dashboard",
      "/dashboard/admin/inbox",
    ]);
  });

  it.each(["draft", "signed", "sent_to_office", "approved", "voided"])(
    "rejects a visit that is %s",
    async (status) => {
      givenVisit({ status });
      givenVisitUpdateSucceeds();

      expect(await markAsCorrected(VISIT_ID)).toEqual({
        success: false,
        error:
          'Only visits in "needs_correction" status can be marked as corrected',
      });
      expect(visitUpdates()).toHaveLength(0);
      expect(revalidatePath).not.toHaveBeenCalled();
    }
  );

  it("rejects a visit that cannot be found", async () => {
    expect(await markAsCorrected(VISIT_ID)).toEqual({
      success: false,
      error:
        'Only visits in "needs_correction" status can be marked as corrected',
    });
  });

  it("fails without revalidating when the update errors", async () => {
    givenVisit({ status: "needs_correction" });
    givenVisitUpdateFails();

    const result = await markAsCorrected(VISIT_ID);

    expect(result).toEqual({ success: false, error: expect.any(String) });
    expect(console.error).toHaveBeenCalledWith(
      "Error marking as corrected:",
      DB_ERROR
    );
    expect(revalidatePath).not.toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// approveNote
// ---------------------------------------------------------------------------

describe("approveNote", () => {
  it("rejects unauthenticated callers", async () => {
    db.setUser(null);

    expect(await approveNote(VISIT_ID)).toEqual({
      success: false,
      error: "Not authenticated",
    });
    expect(db.queries()).toHaveLength(0);
  });

  it.each([["user"], [null]])(
    "rejects callers whose role is %s",
    async (role) => {
      givenRole(role);
      givenVisitUpdateSucceeds();

      expect(await approveNote(VISIT_ID)).toEqual({
        success: false,
        error: "Unauthorized: Admin access required",
      });
      expect(eqValue(db.queries("user_roles")[0], "user_id")).toBe(
        TEST_USER_ID
      );
      expect(visitUpdates()).toHaveLength(0);
      expect(auditPhiAccess).not.toHaveBeenCalled();
    }
  );

  it("rejects callers when the role lookup fails", async () => {
    db.on("user_roles", "select", { data: null, error: DB_ERROR });

    expect(await approveNote(VISIT_ID)).toEqual({
      success: false,
      error: "Unauthorized: Admin access required",
    });
    expect(visitUpdates()).toHaveLength(0);
  });

  it.each(["tenant_admin", "facility_admin"])(
    "lets a %s approve and stamps the approver",
    async (role) => {
      givenRole(role);
      givenVisitUpdateSucceeds();

      expect(await approveNote(VISIT_ID)).toEqual({
        success: true,
        data: {
          id: VISIT_ID,
          status: "approved",
          approved_at: NOW.toISOString(),
          approved_by: TEST_USER_ID,
        },
      });
      const [update] = visitUpdates();
      expect(update.payload).toEqual({
        status: "approved",
        approved_at: NOW.toISOString(),
        approved_by: TEST_USER_ID,
      });
      expect(eqValue(update, "id")).toBe(VISIT_ID);
    }
  );

  it("audits the approval and refreshes the inbox", async () => {
    givenRole("tenant_admin");
    givenVisitUpdateSucceeds();

    await approveNote(VISIT_ID);

    expect(auditPhiAccess).toHaveBeenCalledExactlyOnceWith({
      action: "update",
      table: "visits",
      recordId: VISIT_ID,
      recordType: "visit_approved",
    });
    expect(revalidatedPaths()).toEqual([
      "/dashboard/admin/inbox",
      "/dashboard/patients",
    ]);
  });

  it("is not blocked by the Field Ops guard", async () => {
    givenFieldVisit();
    givenRole("facility_admin");
    givenVisitUpdateSucceeds();

    expect((await approveNote(VISIT_ID)).success).toBe(true);
    expect(db.queries("field_notes")).toHaveLength(0);
  });

  it("fails without side effects when the update errors", async () => {
    givenRole("tenant_admin");
    givenVisitUpdateFails();

    const result = await approveNote(VISIT_ID);

    expect(result).toEqual({ success: false, error: expect.any(String) });
    expect(console.error).toHaveBeenCalledWith(
      "Error approving note:",
      DB_ERROR
    );
    expect(auditPhiAccess).not.toHaveBeenCalled();
    expect(revalidatePath).not.toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// voidNote
// ---------------------------------------------------------------------------

describe("voidNote", () => {
  const REASON = "Duplicate visit entered in error";

  it("refuses Field Ops visits before checking the caller", async () => {
    givenFieldVisit();
    givenRole("tenant_admin");

    expect(await voidNote(VISIT_ID, REASON)).toEqual({
      success: false,
      error: "This visit is managed in the Field Ops app",
    });
    expect(eqValue(db.queries("field_notes")[0], "visit_id")).toBe(VISIT_ID);
    expect(db.queries("user_roles")).toHaveLength(0);
    expect(visitUpdates()).toHaveLength(0);
  });

  it("rejects unauthenticated callers", async () => {
    db.setUser(null);

    expect(await voidNote(VISIT_ID, REASON)).toEqual({
      success: false,
      error: "Not authenticated",
    });
    expect(db.queries("user_roles")).toHaveLength(0);
    expect(visitUpdates()).toHaveLength(0);
  });

  it.each([["user"], [null]])(
    "rejects callers whose role is %s",
    async (role) => {
      givenRole(role);
      givenVisitUpdateSucceeds();

      expect(await voidNote(VISIT_ID, REASON)).toEqual({
        success: false,
        error: "Unauthorized: Admin access required",
      });
      expect(visitUpdates()).toHaveLength(0);
      expect(auditPhiAccess).not.toHaveBeenCalled();
    }
  );

  it.each(["tenant_admin", "facility_admin"])(
    "lets a %s void a note with a reason",
    async (role) => {
      givenRole(role);
      givenVisitUpdateSucceeds();

      const result = await voidNote(VISIT_ID, REASON);

      expect(result.success).toBe(true);
      const [update] = visitUpdates();
      expect(update.payload).toEqual({
        status: "voided",
        voided_at: NOW.toISOString(),
        voided_by: TEST_USER_ID,
        void_reason: REASON,
      });
      expect(eqValue(update, "id")).toBe(VISIT_ID);
    }
  );

  it("audits the void as a delete with the reason and refreshes the inbox", async () => {
    givenRole("tenant_admin");
    givenVisitUpdateSucceeds();

    await voidNote(VISIT_ID, REASON);

    expect(auditPhiAccess).toHaveBeenCalledExactlyOnceWith({
      action: "delete",
      table: "visits",
      recordId: VISIT_ID,
      recordType: "visit_voided",
      reason: REASON,
    });
    expect(revalidatedPaths()).toEqual([
      "/dashboard/admin/inbox",
      "/dashboard/patients",
    ]);
  });

  it("fails without side effects when the update errors", async () => {
    givenRole("tenant_admin");
    givenVisitUpdateFails();

    const result = await voidNote(VISIT_ID, REASON);

    expect(result).toEqual({ success: false, error: expect.any(String) });
    expect(console.error).toHaveBeenCalledWith("Error voiding note:", DB_ERROR);
    expect(auditPhiAccess).not.toHaveBeenCalled();
    expect(revalidatePath).not.toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// getInboxNotes
// ---------------------------------------------------------------------------

describe("getInboxNotes", () => {
  const INBOX = [
    {
      id: "visit-1",
      clinician_name: "Dr. Quill Testwell",
      patient: { first_name: "Ada", last_name: "Sample", mrn: "MRN-0001" },
    },
    {
      id: "visit-2",
      clinician_name: "Nurse Rowan Placeholder",
      patient: { first_name: "Basil", last_name: "Example", mrn: "MRN-0002" },
    },
    { id: "visit-3", clinician_name: null, patient: null },
  ];

  function givenInbox(rows: unknown[] | null) {
    db.on("visits", "select", { data: rows });
  }

  async function searchIds(searchTerm: string) {
    givenInbox(INBOX);
    const result = await getInboxNotes({ searchTerm });
    return result.data.map((visit: { id: string }) => visit.id);
  }

  it("rejects unauthenticated callers with an empty list", async () => {
    db.setUser(null);

    expect(await getInboxNotes()).toEqual({
      success: false,
      error: "Unauthorized",
      data: [],
    });
    expect(db.queries()).toHaveLength(0);
  });

  it("lists visits sent to the office, oldest first", async () => {
    givenInbox(INBOX);

    expect(await getInboxNotes()).toEqual({ success: true, data: INBOX });

    const [query] = db.queries("visits", "select");
    expect(query.columns).toContain("patient:patients");
    expect(query.filters).toEqual([
      { method: "eq", args: ["status", "sent_to_office"] },
      { method: "order", args: ["sent_to_office_at", { ascending: true }] },
    ]);
  });

  it("applies facility and visit-date filters", async () => {
    givenInbox([]);

    await getInboxNotes({
      facilityId: TEST_FACILITY_ID,
      startDate: "2026-02-01",
      endDate: "2026-02-28",
    });

    expect(db.queries("visits", "select")[0].filters).toEqual([
      { method: "eq", args: ["status", "sent_to_office"] },
      { method: "order", args: ["sent_to_office_at", { ascending: true }] },
      { method: "eq", args: ["patient.facility_id", TEST_FACILITY_ID] },
      { method: "gte", args: ["visit_date", "2026-02-01"] },
      { method: "lte", args: ["visit_date", "2026-02-28"] },
    ]);
  });

  it("searches patient full names case-insensitively", async () => {
    expect(await searchIds("ADA sam")).toEqual(["visit-1"]);
  });

  it("searches by MRN", async () => {
    expect(await searchIds("mrn-0002")).toEqual(["visit-2"]);
  });

  it("searches by clinician name", async () => {
    expect(await searchIds("rowan")).toEqual(["visit-2"]);
  });

  it("returns nothing when no visit matches the search", async () => {
    expect(await searchIds("zzz-no-match")).toEqual([]);
  });

  it("returns an empty list when the query yields no data", async () => {
    givenInbox(null);

    expect(await getInboxNotes()).toEqual({ success: true, data: [] });
  });

  it("returns an empty list with an error when the query fails", async () => {
    db.on("visits", "select", { data: null, error: DB_ERROR });

    expect(await getInboxNotes()).toEqual({
      success: false,
      error: expect.any(String),
      data: [],
    });
    expect(console.error).toHaveBeenCalledWith(
      "Error fetching inbox notes:",
      DB_ERROR
    );
  });
});

// ---------------------------------------------------------------------------
// getCorrectionsForClinician
// ---------------------------------------------------------------------------

describe("getCorrectionsForClinician", () => {
  const CLINICIAN_ID = "00000000-0000-4000-8000-0000000000c7";
  const patient = {
    id: "patient-1",
    first_name: "Ada",
    last_name: "Sample",
    mrn: "MRN-0001",
  };

  it("rejects unauthenticated callers with an empty list", async () => {
    db.setUser(null);

    expect(await getCorrectionsForClinician(CLINICIAN_ID)).toEqual({
      success: false,
      error: "Unauthorized",
      data: [],
    });
    expect(db.queries()).toHaveLength(0);
  });

  it("queries visits needing correction that the clinician wrote notes on", async () => {
    await getCorrectionsForClinician(CLINICIAN_ID);

    const [query] = db.queries("visits", "select");
    expect(query.columns).toContain("wound_notes!inner");
    expect(query.filters).toEqual([
      { method: "eq", args: ["wound_notes.created_by", CLINICIAN_ID] },
      { method: "eq", args: ["status", "needs_correction"] },
      { method: "order", args: ["updated_at", { ascending: false }] },
    ]);
  });

  it("de-duplicates visits and drops the joined wound notes", async () => {
    const base = {
      visit_date: "2026-02-10",
      status: "needs_correction",
      correction_notes: [],
      patient,
    };
    db.on("visits", "select", {
      data: [
        { id: "visit-1", ...base, wound_notes: { id: "note-1" } },
        { id: "visit-1", ...base, wound_notes: { id: "note-2" } },
        { id: "visit-2", ...base, wound_notes: { id: "note-3" } },
      ],
    });

    expect(await getCorrectionsForClinician(CLINICIAN_ID)).toEqual({
      success: true,
      data: [
        { id: "visit-1", ...base },
        { id: "visit-2", ...base },
      ],
    });
  });

  it("returns an empty list when the query yields no data", async () => {
    db.on("visits", "select", { data: null });

    expect(await getCorrectionsForClinician(CLINICIAN_ID)).toEqual({
      success: true,
      data: [],
    });
  });

  it("returns an empty list with an error when the query fails", async () => {
    db.on("visits", "select", { data: null, error: DB_ERROR });

    expect(await getCorrectionsForClinician(CLINICIAN_ID)).toEqual({
      success: false,
      error: expect.any(String),
      data: [],
    });
  });
});

// ---------------------------------------------------------------------------
// Addendum notifications
// ---------------------------------------------------------------------------

describe("notifyAddendum", () => {
  it("rejects unauthenticated callers", async () => {
    db.setUser(null);

    expect(await notifyAddendum(VISIT_ID, ADDENDUM_ID)).toEqual({
      success: false,
      error: "Not authenticated",
    });
    expect(db.queries()).toHaveLength(0);
  });

  it("records a notification created by the caller", async () => {
    db.on("addendum_notifications", "insert", echoRow);

    expect(await notifyAddendum(VISIT_ID, ADDENDUM_ID)).toEqual({
      success: true,
      data: {
        id: "new-row",
        visit_id: VISIT_ID,
        addendum_id: ADDENDUM_ID,
        created_by: TEST_USER_ID,
      },
    });
    const [insert] = db.queries("addendum_notifications", "insert");
    expect(insert.payload).toEqual({
      visit_id: VISIT_ID,
      addendum_id: ADDENDUM_ID,
      created_by: TEST_USER_ID,
    });
    expect(insert.returning).toBe(true);
    expect(revalidatedPaths()).toEqual(["/dashboard/admin/inbox"]);
  });

  it("fails without revalidating when the insert errors", async () => {
    db.on("addendum_notifications", "insert", {
      data: null,
      error: DB_ERROR,
    });

    const result = await notifyAddendum(VISIT_ID, ADDENDUM_ID);

    expect(result).toEqual({ success: false, error: expect.any(String) });
    expect(console.error).toHaveBeenCalledWith(
      "Error creating addendum notification:",
      DB_ERROR
    );
    expect(revalidatePath).not.toHaveBeenCalled();
  });
});

describe("acknowledgeAddendum", () => {
  it("rejects unauthenticated callers", async () => {
    db.setUser(null);

    expect(await acknowledgeAddendum(NOTIFICATION_ID)).toEqual({
      success: false,
      error: "Not authenticated",
    });
    expect(db.queries()).toHaveLength(0);
  });

  it("marks the notification reviewed by the caller", async () => {
    db.on("addendum_notifications", "update", echoRow);

    expect(await acknowledgeAddendum(NOTIFICATION_ID)).toEqual({
      success: true,
      data: {
        id: NOTIFICATION_ID,
        reviewed: true,
        reviewed_by: TEST_USER_ID,
        reviewed_at: NOW.toISOString(),
      },
    });
    const [update] = db.queries("addendum_notifications", "update");
    expect(update.payload).toEqual({
      reviewed: true,
      reviewed_by: TEST_USER_ID,
      reviewed_at: NOW.toISOString(),
    });
    expect(eqValue(update, "id")).toBe(NOTIFICATION_ID);
    expect(revalidatedPaths()).toEqual(["/dashboard/admin/inbox"]);
  });

  it("fails without revalidating when the update errors", async () => {
    db.on("addendum_notifications", "update", {
      data: null,
      error: DB_ERROR,
    });

    const result = await acknowledgeAddendum(NOTIFICATION_ID);

    expect(result).toEqual({ success: false, error: expect.any(String) });
    expect(revalidatePath).not.toHaveBeenCalled();
  });
});
