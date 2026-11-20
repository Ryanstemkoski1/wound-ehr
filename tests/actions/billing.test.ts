import { beforeEach, describe, expect, it, vi } from "vitest";
import { revalidatePath } from "next/cache";
import { auditPhiAccess } from "@/lib/audit-log";
import type { UserRole } from "@/lib/rbac";
import {
  createBilling,
  deleteBilling,
  getAllBilling,
  getBillingForPatient,
  getBillingForVisit,
  setBillingStatus,
  submitBillingRecord,
  updateBilling,
  type BillingStatus,
} from "@/app/actions/billing";
import {
  eqValue,
  filterValue,
  useFakeSupabase,
  type FakeSupabase,
  type RecordedQuery,
} from "../helpers/supabase";
import { makeAuthUser, makeUserRole } from "../helpers/fixtures";

// The audit logger is fire-and-forget (`void auditPhiAccess(...)`), so it is
// mocked to assert the exact audit entry without racing the un-awaited
// promise. The admin gate (`hasAdminEntitlement` in lib/rbac) and the CPT
// credential check (`validateBillingCodes` in lib/procedures) run for real
// against the fake database.
vi.mock("@/lib/audit-log", () => ({ auditPhiAccess: vi.fn() }));

const VISIT_ID = "00000000-0000-4000-8000-00000000b001";
const PATIENT_ID = "00000000-0000-4000-8000-00000000a001";
const BILLING_ID = "00000000-0000-4000-8000-00000000f001";
const NOW = new Date("2026-03-04T15:30:00.000Z");
const DB_ERROR = { message: "permission denied for table billings" };
const VISIT_PATH = `/dashboard/patients/${PATIENT_ID}/visits/${VISIT_ID}`;

const DEBRIDEMENT_SCOPE = {
  procedure_code: "11042",
  procedure_name: "Debridement, subcutaneous tissue",
  allowed_credentials: ["MD", "DO", "PA", "NP"],
};

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

/** Role returned by the `get_user_role_info` RPC (lib/rbac). */
function givenRole(role: UserRole | null) {
  db.onRpc("get_user_role_info", {
    data: role ? [makeUserRole({ role })] : [],
  });
}

/** Credentials on the caller's `users` row (read by hasAdminEntitlement). */
function givenProfileCredentials(credentials: string) {
  db.on("users", "select", { data: { credentials } });
}

/** Credentials returned by the `get_current_user_credentials` RPC. */
function givenBillingCredentials(credentials: string) {
  db.onRpc("get_current_user_credentials", { data: [{ credentials }] });
}

function givenAdmin() {
  givenRole("tenant_admin");
}

function givenNonAdmin() {
  givenRole("user");
  givenProfileCredentials("RN");
}

function givenScopes(scopes: Array<typeof DEBRIDEMENT_SCOPE>) {
  db.on("procedure_scopes", "select", { data: scopes });
}

function givenBilling(row: Record<string, unknown> | null) {
  db.on(
    "billings",
    "select",
    row
      ? {
          data: {
            id: BILLING_ID,
            visit_id: VISIT_ID,
            patient_id: PATIENT_ID,
            ...row,
          },
        }
      : {}
  );
}

function revalidatedPaths() {
  return vi.mocked(revalidatePath).mock.calls.map(([path]) => path);
}

function billingInput(
  overrides: Partial<Parameters<typeof createBilling>[0]> = {}
): Parameters<typeof createBilling>[0] {
  return {
    visitId: VISIT_ID,
    patientId: PATIENT_ID,
    cptCodes: ["97597"],
    icd10Codes: ["L89.154"],
    timeSpent: false,
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// createBilling
// ---------------------------------------------------------------------------

describe("createBilling", () => {
  function givenInsertSucceeds() {
    db.on("billings", "insert", (q: RecordedQuery) => ({
      data: { id: BILLING_ID, ...(q.payload as Record<string, unknown>) },
    }));
  }

  it("rejects unauthenticated callers", async () => {
    db.setUser(null);

    expect(await createBilling(billingInput())).toEqual({
      success: false,
      error: "User not authenticated",
    });
    expect(db.queries()).toHaveLength(0);
  });

  it("validates the input before anything else", async () => {
    const result = await createBilling(billingInput({ visitId: "visit-1" }));

    expect(result).toEqual({
      success: false,
      error: expect.stringContaining("Invalid UUID"),
    });
    expect(db.client.auth.getUser).not.toHaveBeenCalled();
    expect(db.queries()).toHaveLength(0);
  });

  it("rejects callers without an admin entitlement", async () => {
    givenNonAdmin();
    givenInsertSucceeds();

    expect(await createBilling(billingInput())).toEqual({
      success: false,
      error: "Only admin users can create billing.",
    });
    expect(db.queries("billings")).toHaveLength(0);
  });

  it("inserts the billing record, audits it and revalidates the visit", async () => {
    givenAdmin();
    givenBillingCredentials("MD");
    givenScopes([DEBRIDEMENT_SCOPE]);
    givenInsertSucceeds();

    const result = await createBilling(
      billingInput({ cptCodes: ["97597", "11042"], notes: "Synthetic" })
    );

    const row = {
      visit_id: VISIT_ID,
      patient_id: PATIENT_ID,
      cpt_codes: ["97597", "11042"],
      icd10_codes: ["L89.154"],
      modifiers: [],
      time_spent: false,
      notes: "Synthetic",
    };
    expect(result).toEqual({
      success: true,
      billing: { id: BILLING_ID, ...row },
    });
    const [insert] = db.queries("billings", "insert");
    expect(insert.payload).toEqual(row);
    expect(insert.returning).toBe(true);
    expect(
      filterValue(db.queries("procedure_scopes")[0], "in", "procedure_code")
    ).toEqual(["97597", "11042"]);
    expect(auditPhiAccess).toHaveBeenCalledExactlyOnceWith({
      action: "create",
      table: "billings",
      recordId: BILLING_ID,
      recordType: "billing_record",
    });
    expect(revalidatedPaths()).toEqual([VISIT_PATH]);
  });

  it("lets a non-admin role with the Admin credential create billing", async () => {
    givenRole("user");
    givenProfileCredentials("Admin");
    givenBillingCredentials("Admin");
    givenInsertSucceeds();

    expect((await createBilling(billingInput())).success).toBe(true);
  });

  it("blocks CPT codes outside the caller's credential scope", async () => {
    givenAdmin();
    givenBillingCredentials("RN");
    givenScopes([DEBRIDEMENT_SCOPE]);
    givenInsertSucceeds();

    expect(
      await createBilling(billingInput({ cptCodes: ["97597", "11042"] }))
    ).toEqual({
      success: false,
      error:
        "Credential restriction: Cannot document CPT 11042 (Debridement, subcutaneous tissue): Requires MD/DO/PA/NP credentials",
    });
    expect(db.queries("billings", "insert")).toHaveLength(0);
  });

  it("blocks billing when the caller's credentials are unknown", async () => {
    givenAdmin();
    givenInsertSucceeds();

    expect(await createBilling(billingInput())).toEqual({
      success: false,
      error: "Credential restriction: User credentials not found",
    });
    expect(db.queries("billings", "insert")).toHaveLength(0);
  });

  it("reports a generic failure without side effects when the insert errors", async () => {
    givenAdmin();
    givenBillingCredentials("MD");
    db.on("billings", "insert", { data: null, error: DB_ERROR });

    expect(await createBilling(billingInput())).toEqual({
      success: false,
      error: "Failed to create billing",
    });
    expect(console.error).toHaveBeenCalledWith(
      "Failed to create billing:",
      DB_ERROR
    );
    expect(auditPhiAccess).not.toHaveBeenCalled();
    expect(revalidatePath).not.toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// updateBilling
// ---------------------------------------------------------------------------

describe("updateBilling", () => {
  const UPDATED = {
    id: BILLING_ID,
    visit_id: VISIT_ID,
    visit: { patient_id: PATIENT_ID },
  };

  function givenUpdateSucceeds() {
    db.on("billings", "update", { data: UPDATED });
  }

  it("rejects unauthenticated callers", async () => {
    db.setUser(null);

    expect(await updateBilling(BILLING_ID, { notes: "x" })).toEqual({
      success: false,
      error: "User not authenticated",
    });
    expect(db.queries()).toHaveLength(0);
  });

  it("rejects callers without an admin entitlement", async () => {
    givenNonAdmin();
    givenUpdateSucceeds();

    expect(await updateBilling(BILLING_ID, { notes: "x" })).toEqual({
      success: false,
      error: "Only admin users can update billing.",
    });
    expect(db.queries("billings")).toHaveLength(0);
  });

  it("writes only the provided fields and skips CPT checks without codes", async () => {
    givenAdmin();
    givenUpdateSucceeds();

    expect(await updateBilling(BILLING_ID, { notes: "Revised" })).toEqual({
      success: true,
      billing: UPDATED,
    });

    const [update] = db.queries("billings", "update");
    expect(update.payload).toEqual({ notes: "Revised" });
    expect(eqValue(update, "id")).toBe(BILLING_ID);
    expect(update.columns).toContain("visit:visits(patient_id)");
    expect(db.queries("procedure_scopes")).toHaveLength(0);
    expect(auditPhiAccess).toHaveBeenCalledExactlyOnceWith({
      action: "update",
      table: "billings",
      recordId: BILLING_ID,
      recordType: "billing_record",
    });
    expect(revalidatedPaths()).toEqual([VISIT_PATH]);
  });

  it("maps every field, keeping falsy values", async () => {
    givenAdmin();
    givenBillingCredentials("NP");
    givenScopes([DEBRIDEMENT_SCOPE]);
    givenUpdateSucceeds();

    await updateBilling(BILLING_ID, {
      cptCodes: ["11042"],
      icd10Codes: ["L97.412"],
      modifiers: [],
      timeSpent: false,
      notes: "",
    });

    expect(db.queries("billings", "update")[0].payload).toEqual({
      cpt_codes: ["11042"],
      icd10_codes: ["L97.412"],
      modifiers: [],
      time_spent: false,
      notes: "",
    });
  });

  it("blocks CPT codes outside the caller's credential scope", async () => {
    givenAdmin();
    givenBillingCredentials("LVN");
    givenScopes([DEBRIDEMENT_SCOPE]);
    givenUpdateSucceeds();

    expect(await updateBilling(BILLING_ID, { cptCodes: ["11042"] })).toEqual({
      success: false,
      error:
        "Credential restriction: Cannot document CPT 11042 (Debridement, subcutaneous tissue): Requires MD/DO/PA/NP credentials",
    });
    expect(db.queries("billings", "update")).toHaveLength(0);
  });

  it("reports a generic failure without side effects when the update errors", async () => {
    givenAdmin();
    db.on("billings", "update", { data: null, error: DB_ERROR });

    expect(await updateBilling(BILLING_ID, { notes: "x" })).toEqual({
      success: false,
      error: "Failed to update billing",
    });
    expect(auditPhiAccess).not.toHaveBeenCalled();
    expect(revalidatePath).not.toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// deleteBilling
// ---------------------------------------------------------------------------

describe("deleteBilling", () => {
  it("rejects unauthenticated callers", async () => {
    db.setUser(null);

    expect(await deleteBilling(BILLING_ID)).toEqual({
      success: false,
      error: "User not authenticated",
    });
    expect(db.queries()).toHaveLength(0);
  });

  it("rejects callers without an admin entitlement", async () => {
    givenNonAdmin();
    givenBilling({});

    expect(await deleteBilling(BILLING_ID)).toEqual({
      success: false,
      error: "Only admin users can delete billing.",
    });
    expect(db.queries("billings")).toHaveLength(0);
  });

  it("deletes the record and revalidates its visit", async () => {
    givenAdmin();
    givenBilling({});

    expect(await deleteBilling(BILLING_ID)).toEqual({ success: true });

    const [lookup] = db.queries("billings", "select");
    expect(eqValue(lookup, "id")).toBe(BILLING_ID);
    const [del] = db.queries("billings", "delete");
    expect(eqValue(del, "id")).toBe(BILLING_ID);
    expect(revalidatedPaths()).toEqual([VISIT_PATH]);
  });

  it("reports a missing record without deleting anything", async () => {
    givenAdmin();

    expect(await deleteBilling(BILLING_ID)).toEqual({
      success: false,
      error: "Billing record not found",
    });
    expect(db.queries("billings", "delete")).toHaveLength(0);
  });

  it("reports a generic failure when the delete errors", async () => {
    givenAdmin();
    givenBilling({});
    db.on("billings", "delete", { error: DB_ERROR });

    expect(await deleteBilling(BILLING_ID)).toEqual({
      success: false,
      error: "Failed to delete billing",
    });
    expect(revalidatePath).not.toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// Reads
// ---------------------------------------------------------------------------

describe("getBillingForVisit", () => {
  it("returns null when the visit has no billing record", async () => {
    expect(await getBillingForVisit(VISIT_ID)).toEqual({
      success: true,
      billing: null,
    });
    const [query] = db.queries("billings");
    expect(eqValue(query, "visit_id")).toBe(VISIT_ID);
    expect(query.maybeSingle).toBe(true);
  });

  it("fills in defaults for unset billing fields", async () => {
    const row = {
      id: BILLING_ID,
      billing_status: null,
      submitted_at: null,
      claim_number: null,
      cpt_codes: null,
      icd10_codes: null,
      modifiers: null,
      units: null,
    };
    db.on("billings", "select", { data: row });

    expect(await getBillingForVisit(VISIT_ID)).toEqual({
      success: true,
      billing: {
        ...row,
        billingStatus: "draft",
        submittedAt: null,
        claimNumber: null,
        cptCodes: [],
        icd10Codes: [],
        modifiers: [],
        units: {},
      },
    });
  });

  it("exposes stored billing fields in camelCase", async () => {
    const row = {
      id: BILLING_ID,
      billing_status: "submitted",
      submitted_at: "2026-03-01T12:00:00.000Z",
      claim_number: "CLM-0001",
      cpt_codes: ["97597"],
      icd10_codes: ["L89.154"],
      modifiers: ["59"],
      units: { "97597": 2 },
    };
    db.on("billings", "select", { data: row });

    const result = await getBillingForVisit(VISIT_ID);

    expect(result).toEqual({
      success: true,
      billing: {
        ...row,
        billingStatus: "submitted",
        submittedAt: "2026-03-01T12:00:00.000Z",
        claimNumber: "CLM-0001",
        cptCodes: ["97597"],
        icd10Codes: ["L89.154"],
        modifiers: ["59"],
        units: { "97597": 2 },
      },
    });
  });

  it("reports a generic failure when the query errors", async () => {
    db.on("billings", "select", { data: null, error: DB_ERROR });

    expect(await getBillingForVisit(VISIT_ID)).toEqual({
      success: false,
      error: "Failed to get billing",
    });
  });
});

describe("getBillingForPatient", () => {
  it("lists the patient's billing records, newest first", async () => {
    const rows = [{ id: BILLING_ID }];
    db.on("billings", "select", { data: rows });

    expect(await getBillingForPatient(PATIENT_ID)).toEqual({
      success: true,
      billings: rows,
    });
    expect(db.queries("billings")[0].filters).toEqual([
      { method: "eq", args: ["patient_id", PATIENT_ID] },
      { method: "order", args: ["created_at", { ascending: false }] },
    ]);
  });

  it("reports a generic failure when the query errors", async () => {
    db.on("billings", "select", { data: null, error: DB_ERROR });

    expect(await getBillingForPatient(PATIENT_ID)).toEqual({
      success: false,
      error: "Failed to get billings",
    });
  });
});

describe("getAllBilling", () => {
  it("applies every filter and orders newest first", async () => {
    await getAllBilling({
      patientId: PATIENT_ID,
      facilityId: "facility-1",
      startDate: new Date("2026-02-01T00:00:00.000Z"),
      endDate: new Date("2026-02-28T23:59:59.000Z"),
    });

    expect(db.queries("billings")[0].filters).toEqual([
      { method: "eq", args: ["patient_id", PATIENT_ID] },
      { method: "eq", args: ["patient.facility_id", "facility-1"] },
      { method: "gte", args: ["visit.visit_date", "2026-02-01T00:00:00.000Z"] },
      { method: "lte", args: ["visit.visit_date", "2026-02-28T23:59:59.000Z"] },
      { method: "order", args: ["created_at", { ascending: false }] },
    ]);
  });

  it("maps records with their visit and patient to camelCase", async () => {
    db.on("billings", "select", {
      data: [
        {
          id: BILLING_ID,
          visit_id: VISIT_ID,
          patient_id: PATIENT_ID,
          cpt_codes: ["97597"],
          icd10_codes: ["L89.154"],
          modifiers: ["59"],
          time_spent: true,
          notes: "Synthetic",
          billing_status: "paid",
          submitted_at: "2026-03-01T12:00:00.000Z",
          claim_number: "CLM-0001",
          created_at: "2026-02-20T09:00:00.000Z",
          visit: {
            id: VISIT_ID,
            visit_date: "2026-02-20",
            visit_type: "follow_up",
          },
          patient: {
            id: PATIENT_ID,
            first_name: "Ada",
            last_name: "Sample",
            mrn: "MRN-0001",
            facility: { id: "facility-1", name: "Alpha Care" },
          },
        },
      ],
    });

    expect(await getAllBilling()).toEqual({
      success: true,
      billings: [
        {
          id: BILLING_ID,
          cptCodes: ["97597"],
          icd10Codes: ["L89.154"],
          modifiers: ["59"],
          timeSpent: true,
          notes: "Synthetic",
          billingStatus: "paid",
          submittedAt: "2026-03-01T12:00:00.000Z",
          claimNumber: "CLM-0001",
          createdAt: new Date("2026-02-20T09:00:00.000Z"),
          visit: {
            id: VISIT_ID,
            visitDate: new Date("2026-02-20"),
            visitType: "follow_up",
          },
          patient: {
            id: PATIENT_ID,
            firstName: "Ada",
            lastName: "Sample",
            mrn: "MRN-0001",
            facility: { id: "facility-1", name: "Alpha Care" },
          },
        },
      ],
    });
    expect(db.queries("billings")[0].filters).toEqual([
      { method: "order", args: ["created_at", { ascending: false }] },
    ]);
  });

  it("falls back to defaults when related rows and fields are missing", async () => {
    db.on("billings", "select", {
      data: [{ id: BILLING_ID, visit_id: VISIT_ID, patient_id: PATIENT_ID }],
    });

    expect(await getAllBilling()).toEqual({
      success: true,
      billings: [
        {
          id: BILLING_ID,
          cptCodes: [],
          icd10Codes: [],
          modifiers: [],
          timeSpent: false,
          notes: null,
          billingStatus: "draft",
          submittedAt: null,
          claimNumber: null,
          createdAt: NOW,
          visit: { id: VISIT_ID, visitDate: NOW, visitType: "" },
          patient: {
            id: PATIENT_ID,
            firstName: "",
            lastName: "",
            mrn: "",
            facility: { id: "", name: "" },
          },
        },
      ],
    });
  });

  it("reports a generic failure when the query errors", async () => {
    db.on("billings", "select", { data: null, error: DB_ERROR });

    expect(await getAllBilling()).toEqual({
      success: false,
      error: "Failed to get billings",
    });
  });
});

// ---------------------------------------------------------------------------
// setBillingStatus
// ---------------------------------------------------------------------------

describe("setBillingStatus", () => {
  it("rejects an unknown status before touching auth or the database", async () => {
    expect(await setBillingStatus(BILLING_ID, "void" as BillingStatus)).toEqual(
      { success: false, error: "Invalid billing status." }
    );
    expect(db.client.auth.getUser).not.toHaveBeenCalled();
    expect(db.queries()).toHaveLength(0);
  });

  it("rejects unauthenticated callers", async () => {
    db.setUser(null);

    expect(await setBillingStatus(BILLING_ID, "ready")).toEqual({
      success: false,
      error: "Unauthorized",
    });
    expect(db.queries()).toHaveLength(0);
  });

  it("rejects callers without an admin entitlement", async () => {
    givenNonAdmin();
    givenBilling({ billing_status: "draft" });

    expect(await setBillingStatus(BILLING_ID, "ready")).toEqual({
      success: false,
      error: "Only operations admins can change billing status.",
    });
    expect(db.queries("billings")).toHaveLength(0);
  });

  it("reports a missing record", async () => {
    givenAdmin();

    expect(await setBillingStatus(BILLING_ID, "ready")).toEqual({
      success: false,
      error: "Billing record not found",
    });
    const [lookup] = db.queries("billings", "select");
    expect(lookup.columns).toBe("id, visit_id, patient_id, billing_status");
    expect(eqValue(lookup, "id")).toBe(BILLING_ID);
    expect(db.queries("billings", "update")).toHaveLength(0);
  });

  it.each<[BillingStatus | null, BillingStatus]>([
    ["draft", "ready"],
    [null, "ready"],
    ["ready", "draft"],
    ["submitted", "paid"],
    ["submitted", "denied"],
    ["denied", "draft"],
    ["paid", "paid"],
    ["ready", "ready"],
  ])("allows %s -> %s", async (from, to) => {
    givenAdmin();
    givenBilling({ billing_status: from });

    expect(await setBillingStatus(BILLING_ID, to)).toEqual({ success: true });

    const [update] = db.queries("billings", "update");
    expect(update.payload).toEqual({
      billing_status: to,
      updated_at: NOW.toISOString(),
    });
    expect(eqValue(update, "id")).toBe(BILLING_ID);
  });

  it.each<[BillingStatus | null, BillingStatus, string]>([
    ["draft", "submitted", "draft"],
    ["ready", "submitted", "ready"],
    ["draft", "paid", "draft"],
    [null, "denied", "draft"],
    ["ready", "denied", "ready"],
    ["submitted", "draft", "submitted"],
    ["denied", "paid", "denied"],
    ["paid", "draft", "paid"],
  ])("blocks %s -> %s", async (from, to, shownAs) => {
    givenAdmin();
    givenBilling({ billing_status: from });

    expect(await setBillingStatus(BILLING_ID, to)).toEqual({
      success: false,
      error: `Cannot change billing status from "${shownAs}" to "${to}".`,
    });
    expect(db.queries("billings", "update")).toHaveLength(0);
    expect(auditPhiAccess).not.toHaveBeenCalled();
  });

  it("records the claim number when one is given", async () => {
    givenAdmin();
    givenBilling({ billing_status: "submitted" });

    await setBillingStatus(BILLING_ID, "paid", "CLM-0042");

    expect(db.queries("billings", "update")[0].payload).toEqual({
      billing_status: "paid",
      updated_at: NOW.toISOString(),
      claim_number: "CLM-0042",
    });
  });

  it("audits the change and revalidates the visit and billing pages", async () => {
    givenRole("user");
    givenProfileCredentials("Admin");
    givenBilling({ billing_status: "draft" });

    await setBillingStatus(BILLING_ID, "ready");

    expect(auditPhiAccess).toHaveBeenCalledExactlyOnceWith({
      action: "update",
      table: "billings",
      recordId: BILLING_ID,
      recordType: "billing_status_change",
      reason: "Status set to ready",
    });
    expect(revalidatedPaths()).toEqual([VISIT_PATH, "/dashboard/billing"]);
  });

  it("reports a failed update without side effects", async () => {
    givenAdmin();
    givenBilling({ billing_status: "draft" });
    db.on("billings", "update", { error: DB_ERROR });

    expect(await setBillingStatus(BILLING_ID, "ready")).toEqual({
      success: false,
      error: "Failed to update billing status",
    });
    expect(console.error).toHaveBeenCalledWith(
      "Failed to update billing status:",
      DB_ERROR
    );
    expect(auditPhiAccess).not.toHaveBeenCalled();
    expect(revalidatePath).not.toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// submitBillingRecord
// ---------------------------------------------------------------------------

describe("submitBillingRecord", () => {
  it("rejects unauthenticated callers", async () => {
    db.setUser(null);

    expect(await submitBillingRecord(BILLING_ID)).toEqual({
      success: false,
      error: "Unauthorized",
    });
    expect(db.queries()).toHaveLength(0);
  });

  it("rejects callers without an admin entitlement", async () => {
    givenNonAdmin();
    givenBilling({ billing_status: "ready", cpt_codes: ["97597"] });

    expect(await submitBillingRecord(BILLING_ID)).toEqual({
      success: false,
      error: "Only operations admins can submit billing records.",
    });
    expect(db.queries("billings")).toHaveLength(0);
  });

  it("reports a missing record", async () => {
    givenAdmin();

    expect(await submitBillingRecord(BILLING_ID)).toEqual({
      success: false,
      error: "Billing record not found",
    });
    expect(db.queries("billings", "update")).toHaveLength(0);
  });

  it.each(["submitted", "paid", "denied"])(
    "refuses to re-submit a %s record",
    async (status) => {
      givenAdmin();
      givenBilling({ billing_status: status, cpt_codes: ["97597"] });

      expect(await submitBillingRecord(BILLING_ID)).toEqual({
        success: false,
        error: `Billing is already ${status} — cannot re-submit.`,
      });
      expect(db.queries("billings", "update")).toHaveLength(0);
    }
  );

  it.each([[[]], [null]])(
    "requires at least one CPT code (cpt_codes = %j)",
    async (cptCodes) => {
      givenAdmin();
      givenBilling({ billing_status: "ready", cpt_codes: cptCodes });

      expect(await submitBillingRecord(BILLING_ID)).toEqual({
        success: false,
        error: "Add at least one CPT code before submitting.",
      });
      expect(db.queries("billings", "update")).toHaveLength(0);
    }
  );

  it("submits a ready record, stamping the submission time", async () => {
    givenAdmin();
    givenBilling({ billing_status: "ready", cpt_codes: ["97597"] });

    expect(await submitBillingRecord(BILLING_ID)).toEqual({ success: true });

    const [lookup] = db.queries("billings", "select");
    expect(lookup.columns).toBe(
      "id, visit_id, patient_id, billing_status, cpt_codes"
    );
    const [update] = db.queries("billings", "update");
    expect(update.payload).toEqual({
      billing_status: "submitted",
      submitted_at: NOW.toISOString(),
      updated_at: NOW.toISOString(),
    });
    expect(eqValue(update, "id")).toBe(BILLING_ID);
    expect(auditPhiAccess).toHaveBeenCalledExactlyOnceWith({
      action: "update",
      table: "billings",
      recordId: BILLING_ID,
      recordType: "billing_submission",
    });
    expect(revalidatedPaths()).toEqual([VISIT_PATH, "/dashboard/billing"]);
  });

  it("reports a failed update without side effects", async () => {
    givenAdmin();
    givenBilling({ billing_status: "ready", cpt_codes: ["97597"] });
    db.on("billings", "update", { error: DB_ERROR });

    expect(await submitBillingRecord(BILLING_ID)).toEqual({
      success: false,
      error: "Failed to submit billing record",
    });
    expect(auditPhiAccess).not.toHaveBeenCalled();
    expect(revalidatePath).not.toHaveBeenCalled();
  });
});
