import { beforeEach, describe, expect, it, vi } from "vitest";
import { revalidatePath } from "next/cache";
import { auditPhiAccess } from "@/lib/audit-log";
import {
  createWound,
  deleteWound,
  getWound,
  getWoundAssessments,
  getWounds,
  markWoundHealed,
  updateWound,
} from "@/app/actions/wounds";
import {
  eqValue,
  filterValue,
  useFakeSupabase,
  type FakeSupabase,
} from "../helpers/supabase";
import { makeAuthUser } from "../helpers/fixtures";

// The audit logger is fire-and-forget (`void auditPhiAccess(...)`), so it is
// mocked to assert the exact audit entry without racing the un-awaited
// promise. All other code runs for real against the fake database.
vi.mock("@/lib/audit-log", () => ({ auditPhiAccess: vi.fn() }));

const PATIENT_ID = "00000000-0000-4000-8000-00000000a001";
const OTHER_PATIENT_ID = "00000000-0000-4000-8000-00000000a002";
const WOUND_ID = "00000000-0000-4000-8000-00000000e001";
const NOW = new Date("2026-03-04T15:30:00.000Z");
const DB_ERROR = { message: "permission denied for table wounds" };

let db: FakeSupabase;

beforeEach(() => {
  db = useFakeSupabase({ user: makeAuthUser() });
  vi.spyOn(console, "error").mockImplementation(() => {});
  vi.useFakeTimers();
  vi.setSystemTime(NOW);
});

function woundForm(overrides: Record<string, string | undefined> = {}) {
  const values: Record<string, string | undefined> = {
    patientId: PATIENT_ID,
    woundNumber: "W-1",
    location: "Left heel",
    woundType: "pressure_injury",
    onsetDate: "2026-02-10",
    status: "active",
    ...overrides,
  };
  const form = new FormData();
  for (const [key, value] of Object.entries(values)) {
    if (value !== undefined) form.set(key, value);
  }
  return form;
}

function woundRow(overrides: Record<string, unknown> = {}) {
  return {
    id: WOUND_ID,
    patient_id: PATIENT_ID,
    wound_number: "W-1",
    location: "Left heel",
    wound_type: "pressure_injury",
    onset_date: "2026-02-10",
    status: "active",
    healing_status: "improving",
    notes: "Synthetic note",
    created_at: "2026-02-10T09:00:00.000Z",
    updated_at: "2026-02-12T09:00:00.000Z",
    ...overrides,
  };
}

/** The ownership lookup `select("id, patient_id")` used by the mutators. */
function givenExistingWound(patientId = PATIENT_ID) {
  db.on(
    "wounds",
    "select",
    { data: { id: WOUND_ID, patient_id: patientId } },
    { where: (q) => q.maybeSingle }
  );
}

function revalidatedPaths() {
  return vi.mocked(revalidatePath).mock.calls.map(([path]) => path);
}

// ---------------------------------------------------------------------------
// Reads
// ---------------------------------------------------------------------------

describe("getWounds", () => {
  it("returns nothing for unauthenticated callers", async () => {
    db.setUser(null);

    expect(await getWounds(PATIENT_ID)).toEqual([]);
    expect(db.queries()).toHaveLength(0);
  });

  it("lists the patient's wounds by status, newest first, in camelCase", async () => {
    db.on("wounds", "select", { data: [woundRow()] });

    expect(await getWounds(PATIENT_ID)).toEqual([
      {
        id: WOUND_ID,
        patientId: PATIENT_ID,
        woundNumber: "W-1",
        location: "Left heel",
        woundType: "pressure_injury",
        onsetDate: new Date("2026-02-10"),
        status: "active",
        createdAt: "2026-02-10T09:00:00.000Z",
        updatedAt: "2026-02-12T09:00:00.000Z",
      },
    ]);
    expect(db.queries("wounds")[0].filters).toEqual([
      { method: "eq", args: ["patient_id", PATIENT_ID] },
      { method: "order", args: ["status", { ascending: true }] },
      { method: "order", args: ["created_at", { ascending: false }] },
    ]);
  });

  it("returns nothing when the query fails", async () => {
    db.on("wounds", "select", { data: null, error: DB_ERROR });

    expect(await getWounds(PATIENT_ID)).toEqual([]);
    expect(console.error).toHaveBeenCalledWith(
      "Failed to fetch wounds:",
      DB_ERROR
    );
  });
});

describe("getWound", () => {
  it("returns null for unauthenticated callers without auditing", async () => {
    db.setUser(null);

    expect(await getWound(WOUND_ID)).toBeNull();
    expect(auditPhiAccess).not.toHaveBeenCalled();
    expect(db.queries()).toHaveLength(0);
  });

  it("returns the wound with patient, recent assessments and photos", async () => {
    const facility = { id: "facility-1", name: "Alpha Care" };
    db.on("wounds", "select", {
      data: woundRow({
        patient: {
          id: PATIENT_ID,
          first_name: "Ada",
          last_name: "Sample",
          mrn: "MRN-0001",
          dob: "1950-01-01",
          facility,
        },
      }),
    });
    db.on("assessments", "select", { data: [{ id: "assessment-1" }] });
    db.on("photos", "select", { data: [{ id: "photo-1" }] });

    expect(await getWound(WOUND_ID)).toEqual({
      id: WOUND_ID,
      patientId: PATIENT_ID,
      woundNumber: "W-1",
      location: "Left heel",
      woundType: "pressure_injury",
      onsetDate: new Date("2026-02-10"),
      status: "active",
      healingStatus: "improving",
      notes: "Synthetic note",
      createdAt: "2026-02-10T09:00:00.000Z",
      updatedAt: "2026-02-12T09:00:00.000Z",
      patient: {
        id: PATIENT_ID,
        firstName: "Ada",
        lastName: "Sample",
        mrn: "MRN-0001",
        dob: "1950-01-01",
        facility,
      },
      assessments: [{ id: "assessment-1" }],
      photos: [{ id: "photo-1" }],
    });

    expect(eqValue(db.queries("wounds")[0], "id")).toBe(WOUND_ID);
    expect(db.queries("assessments")[0].filters).toEqual([
      { method: "eq", args: ["wound_id", WOUND_ID] },
      { method: "order", args: ["created_at", { ascending: false }] },
      { method: "limit", args: [5] },
    ]);
    expect(db.queries("photos")[0].filters).toEqual([
      { method: "eq", args: ["wound_id", WOUND_ID] },
      { method: "order", args: ["uploaded_at", { ascending: false }] },
      { method: "limit", args: [10] },
    ]);
  });

  it("audits the PHI read", async () => {
    await getWound(WOUND_ID);

    expect(auditPhiAccess).toHaveBeenCalledExactlyOnceWith({
      action: "read",
      table: "wounds",
      recordId: WOUND_ID,
      recordType: "wound_record",
    });
  });

  it("returns null without loading related rows when the wound is missing", async () => {
    expect(await getWound(WOUND_ID)).toBeNull();
    expect(db.queries("assessments")).toHaveLength(0);
    expect(db.queries("photos")).toHaveLength(0);
  });
});

describe("getWoundAssessments", () => {
  const assessmentRow = {
    id: "assessment-1",
    visit_id: "visit-1",
    wound_id: WOUND_ID,
    wound_type: "pressure_injury",
    length: 2.5,
    width: 1.5,
    depth: 0.3,
    area: 3.75,
    wound_bed: "granulation",
    exudate_amount: "light",
    exudate_type: "serous",
    odor: "none",
    edges: "attached",
    periwound_condition: "intact",
    pain_level: 2,
    healing_status: "improving",
    assessment_notes: "Synthetic assessment",
    created_at: "2026-02-15T10:00:00.000Z",
    updated_at: "2026-02-15T11:00:00.000Z",
    visit: {
      id: "visit-1",
      visit_date: "2026-02-15",
      visit_type: "follow_up",
      patient: { id: PATIENT_ID, first_name: "Ada", last_name: "Sample" },
    },
    wound: { id: WOUND_ID, wound_number: "W-1", location: "Left heel" },
  };

  it("returns nothing for unauthenticated callers", async () => {
    db.setUser(null);

    expect(await getWoundAssessments(WOUND_ID)).toEqual([]);
    expect(db.queries()).toHaveLength(0);
  });

  it("maps assessments with their visit, wound and grouped photos", async () => {
    db.on("assessments", "select", { data: [assessmentRow] });
    db.on("photos", "select", {
      data: [
        {
          id: "photo-1",
          url: "https://storage.test/p1.jpg",
          file_name: "p1.jpg",
          caption: "Day 1",
          uploaded_at: "2026-02-15T10:05:00.000Z",
          assessment_id: "assessment-1",
        },
        {
          id: "photo-2",
          url: "https://storage.test/p2.jpg",
          file_name: "p2.jpg",
          caption: null,
          uploaded_at: "2026-02-15T10:06:00.000Z",
          assessment_id: "another-assessment",
        },
      ],
    });

    const [assessment] = await getWoundAssessments(WOUND_ID);

    expect(assessment).toEqual({
      id: "assessment-1",
      visitId: "visit-1",
      woundId: WOUND_ID,
      assessmentType: "pressure_injury",
      length: 2.5,
      width: 1.5,
      depth: 0.3,
      area: 3.75,
      woundBed: "granulation",
      exudateAmount: "light",
      exudateType: "serous",
      odor: "none",
      edges: "attached",
      periwoundSkin: "intact",
      pain: 2,
      healingStatus: "improving",
      notes: "Synthetic assessment",
      createdAt: "2026-02-15T10:00:00.000Z",
      updatedAt: "2026-02-15T11:00:00.000Z",
      visit: {
        id: "visit-1",
        visitDate: new Date("2026-02-15"),
        visitType: "follow_up",
        patient: { id: PATIENT_ID, firstName: "Ada", lastName: "Sample" },
      },
      wound: { id: WOUND_ID, woundNumber: "W-1", location: "Left heel" },
      photos: [
        {
          id: "photo-1",
          url: "https://storage.test/p1.jpg",
          filename: "p1.jpg",
          caption: "Day 1",
          uploadedAt: new Date("2026-02-15T10:05:00.000Z"),
        },
      ],
    });

    expect(db.queries("assessments")[0].filters).toEqual([
      { method: "eq", args: ["wound_id", WOUND_ID] },
      { method: "order", args: ["created_at", { ascending: false }] },
    ]);
    expect(filterValue(db.queries("photos")[0], "in", "assessment_id")).toEqual(
      ["assessment-1"]
    );
  });

  it("falls back to placeholders when the visit and wound are missing", async () => {
    db.on("assessments", "select", {
      data: [{ ...assessmentRow, visit: null, wound: null }],
    });

    const [assessment] = await getWoundAssessments(WOUND_ID);

    expect(assessment.visit).toEqual({
      id: "",
      visitDate: NOW,
      visitType: "regular",
      patient: { id: "", firstName: "Unknown", lastName: "Patient" },
    });
    expect(assessment.wound).toEqual({ id: "", woundNumber: "", location: "" });
    expect(assessment.photos).toEqual([]);
  });

  it("does not query photos when there are no assessments", async () => {
    db.on("assessments", "select", { data: [] });

    expect(await getWoundAssessments(WOUND_ID)).toEqual([]);
    expect(db.queries("photos")).toHaveLength(0);
  });

  it("returns nothing when the query fails", async () => {
    db.on("assessments", "select", { data: null, error: DB_ERROR });

    expect(await getWoundAssessments(WOUND_ID)).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// Mutations
// ---------------------------------------------------------------------------

describe("createWound", () => {
  function givenPatient() {
    db.on("patients", "select", { data: { id: PATIENT_ID } });
  }

  it("rejects unauthenticated callers", async () => {
    db.setUser(null);

    expect(await createWound(woundForm())).toEqual({ error: "Unauthorized" });
    expect(db.queries()).toHaveLength(0);
  });

  it("checks patient access and inserts the wound", async () => {
    givenPatient();

    expect(await createWound(woundForm({ status: "healed" }))).toEqual({
      success: true,
    });

    const [patientQuery] = db.queries("patients");
    expect(eqValue(patientQuery, "id")).toBe(PATIENT_ID);
    expect(patientQuery.maybeSingle).toBe(true);

    const [insert] = db.queries("wounds", "insert");
    expect(insert.payload).toEqual({
      patient_id: PATIENT_ID,
      wound_number: "W-1",
      location: "Left heel",
      wound_type: "pressure_injury",
      onset_date: "2026-02-10",
      status: "healed",
    });
    expect(revalidatedPaths()).toEqual([
      "/dashboard/patients",
      `/dashboard/patients/${PATIENT_ID}`,
    ]);
  });

  it("defaults the status to active", async () => {
    givenPatient();

    await createWound(woundForm({ status: undefined }));

    expect(db.queries("wounds", "insert")[0].payload).toMatchObject({
      status: "active",
    });
  });

  it.each([
    ["woundNumber", "Wound number is required"],
    ["location", "Location is required"],
    ["woundType", "Wound type is required"],
    ["onsetDate", "Onset date is required"],
  ])("requires %s", async (field, message) => {
    givenPatient();

    expect(await createWound(woundForm({ [field]: "" }))).toEqual({
      error: message,
    });
    expect(db.queries()).toHaveLength(0);
  });

  it("rejects a malformed patient id", async () => {
    expect(await createWound(woundForm({ patientId: "patient-1" }))).toEqual({
      error: "Invalid UUID",
    });
    expect(db.queries("wounds")).toHaveLength(0);
  });

  it("rejects an unknown wound status", async () => {
    givenPatient();

    const result = await createWound(woundForm({ status: "deleted" }));

    expect(result).toEqual({
      error: expect.stringContaining("Invalid option"),
    });
    expect(db.queries("wounds")).toHaveLength(0);
  });

  it("refuses patients the caller cannot see", async () => {
    expect(await createWound(woundForm())).toEqual({
      error: "Patient not found or access denied",
    });
    expect(db.queries("wounds")).toHaveLength(0);
  });

  it("refuses when the patient lookup errors", async () => {
    db.on("patients", "select", { data: null, error: DB_ERROR });

    expect(await createWound(woundForm())).toEqual({
      error: "Patient not found or access denied",
    });
    expect(db.queries("wounds")).toHaveLength(0);
  });

  it("reports a generic failure when the insert errors", async () => {
    givenPatient();
    db.on("wounds", "insert", { error: DB_ERROR });

    expect(await createWound(woundForm())).toEqual({
      error: "Failed to create wound",
    });
    expect(console.error).toHaveBeenCalledWith(
      "Failed to create wound:",
      DB_ERROR
    );
    expect(revalidatePath).not.toHaveBeenCalled();
  });
});

describe("updateWound", () => {
  it("rejects unauthenticated callers", async () => {
    db.setUser(null);

    expect(await updateWound(WOUND_ID, woundForm())).toEqual({
      error: "Unauthorized",
    });
    expect(db.queries()).toHaveLength(0);
  });

  it("updates the wound fields and revalidates its pages", async () => {
    givenExistingWound(OTHER_PATIENT_ID);

    expect(
      await updateWound(WOUND_ID, woundForm({ location: "Right heel" }))
    ).toEqual({ success: true });

    const [lookup] = db.queries("wounds", "select");
    expect(lookup.columns).toBe("id, patient_id");
    expect(eqValue(lookup, "id")).toBe(WOUND_ID);

    const [update] = db.queries("wounds", "update");
    expect(update.payload).toEqual({
      wound_number: "W-1",
      location: "Right heel",
      wound_type: "pressure_injury",
      onset_date: "2026-02-10",
      status: "active",
    });
    expect(eqValue(update, "id")).toBe(WOUND_ID);
    // Paths use the stored patient, not the patientId sent in the form.
    expect(revalidatedPaths()).toEqual([
      "/dashboard/patients",
      `/dashboard/patients/${OTHER_PATIENT_ID}`,
      `/dashboard/wounds/${WOUND_ID}`,
    ]);
  });

  it("validates the form before touching the database", async () => {
    expect(await updateWound(WOUND_ID, woundForm({ location: "" }))).toEqual({
      error: "Location is required",
    });
    expect(db.queries()).toHaveLength(0);
  });

  it("refuses wounds the caller cannot see", async () => {
    expect(await updateWound(WOUND_ID, woundForm())).toEqual({
      error: "Wound not found or access denied",
    });
    expect(db.queries("wounds", "update")).toHaveLength(0);
  });

  it("reports a generic failure when the update errors", async () => {
    givenExistingWound();
    db.on("wounds", "update", { error: DB_ERROR });

    expect(await updateWound(WOUND_ID, woundForm())).toEqual({
      error: "Failed to update wound",
    });
    expect(revalidatePath).not.toHaveBeenCalled();
  });
});

describe("deleteWound", () => {
  it("rejects unauthenticated callers", async () => {
    db.setUser(null);

    expect(await deleteWound(WOUND_ID)).toEqual({ error: "Unauthorized" });
    expect(db.queries()).toHaveLength(0);
  });

  it("deletes the wound and revalidates the patient pages", async () => {
    givenExistingWound();

    expect(await deleteWound(WOUND_ID)).toEqual({ success: true });

    const [del] = db.queries("wounds", "delete");
    expect(eqValue(del, "id")).toBe(WOUND_ID);
    expect(revalidatedPaths()).toEqual([
      "/dashboard/patients",
      `/dashboard/patients/${PATIENT_ID}`,
    ]);
  });

  it("refuses wounds the caller cannot see", async () => {
    expect(await deleteWound(WOUND_ID)).toEqual({
      error: "Wound not found or access denied",
    });
    expect(db.queries("wounds", "delete")).toHaveLength(0);
  });

  it("reports a generic failure when the delete errors", async () => {
    givenExistingWound();
    db.on("wounds", "delete", { error: DB_ERROR });

    expect(await deleteWound(WOUND_ID)).toEqual({
      error: "Failed to delete wound",
    });
    expect(revalidatePath).not.toHaveBeenCalled();
  });
});

describe("markWoundHealed", () => {
  it("rejects unauthenticated callers", async () => {
    db.setUser(null);

    expect(await markWoundHealed(WOUND_ID)).toEqual({ error: "Unauthorized" });
    expect(db.queries()).toHaveLength(0);
  });

  it("sets only the status to healed", async () => {
    givenExistingWound();

    expect(await markWoundHealed(WOUND_ID)).toEqual({ success: true });

    const [update] = db.queries("wounds", "update");
    expect(update.payload).toEqual({ status: "healed" });
    expect(eqValue(update, "id")).toBe(WOUND_ID);
    expect(revalidatedPaths()).toEqual([
      "/dashboard/patients",
      `/dashboard/patients/${PATIENT_ID}`,
      `/dashboard/wounds/${WOUND_ID}`,
    ]);
  });

  it("refuses wounds the caller cannot see", async () => {
    expect(await markWoundHealed(WOUND_ID)).toEqual({
      error: "Wound not found or access denied",
    });
    expect(db.queries("wounds", "update")).toHaveLength(0);
  });

  it("reports a generic failure when the update errors", async () => {
    givenExistingWound();
    db.on("wounds", "update", { error: DB_ERROR });

    expect(await markWoundHealed(WOUND_ID)).toEqual({
      error: "Failed to mark wound as healed",
    });
    expect(revalidatePath).not.toHaveBeenCalled();
  });
});
