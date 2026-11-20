import { describe, expect, it } from "vitest";
import type { Credentials } from "@/lib/credentials";
import {
  canEditDemographics,
  canEditInsurance,
  canEditVisit,
  canUploadDocuments,
  getPatientFieldPermissions,
  getReadOnlyReason,
  getVisitFieldPermissions,
  type PatientFieldCategory,
} from "@/lib/field-permissions";
import type { UserRole } from "@/lib/rbac";

const CLINICAL_CREDENTIALS: Credentials[] = [
  "RN",
  "LVN",
  "MD",
  "DO",
  "PA",
  "NP",
  "CNA",
];
const ADMIN_ROLES: UserRole[] = ["tenant_admin", "facility_admin"];

const OWNER_ID = "00000000-0000-4000-8000-00000000c001";
const OTHER_CLINICIAN_ID = "00000000-0000-4000-8000-00000000c002";

const ALL_PATIENT_EDIT = {
  demographics: "edit",
  contact: "edit",
  insurance: "edit",
  emergency_contact: "edit",
  medical_history: "edit",
  allergies: "edit",
  wounds: "edit",
  documents: "edit",
};

const ALL_PATIENT_VIEW = {
  demographics: "view",
  contact: "view",
  insurance: "view",
  emergency_contact: "view",
  medical_history: "view",
  allergies: "view",
  wounds: "view",
  documents: "view",
};

const ALL_VISIT_EDIT = {
  visit_details: "edit",
  assessments: "edit",
  treatments: "edit",
  visit_notes: "edit",
  signatures: "edit",
  billing: "edit",
};

const ALL_VISIT_VIEW = {
  visit_details: "view",
  assessments: "view",
  treatments: "view",
  visit_notes: "view",
  signatures: "view",
  billing: "view",
};

describe("getPatientFieldPermissions", () => {
  it.each(
    ADMIN_ROLES.flatMap((role) =>
      ([null, "RN", "Admin"] as const).map(
        (credentials) => [role, credentials] as const
      )
    )
  )(
    "gives %s full edit access regardless of credentials (%s)",
    (role, credentials) => {
      expect(getPatientFieldPermissions(credentials, role)).toEqual(
        ALL_PATIENT_EDIT
      );
    }
  );

  it.each([["user"], [null]] as const)(
    "lets Admin staff (role %s) edit demographics but only view clinical data",
    (role) => {
      expect(getPatientFieldPermissions("Admin", role)).toEqual({
        demographics: "edit",
        contact: "edit",
        insurance: "edit",
        emergency_contact: "edit",
        medical_history: "view",
        allergies: "view",
        wounds: "view",
        documents: "edit",
      });
    }
  );

  it.each(CLINICAL_CREDENTIALS)(
    "lets %s edit clinical data but only view demographics and insurance",
    (credentials) => {
      expect(getPatientFieldPermissions(credentials, "user")).toEqual({
        demographics: "view",
        contact: "view",
        insurance: "view",
        emergency_contact: "view",
        medical_history: "edit",
        allergies: "edit",
        wounds: "edit",
        documents: "view",
      });
    }
  );

  it("applies clinician permissions when the role is unknown", () => {
    expect(getPatientFieldPermissions("NP", null).wounds).toBe("edit");
    expect(getPatientFieldPermissions("NP", null).demographics).toBe("view");
  });

  it.each([["user"], [null]] as const)(
    "falls back to view-only without credentials (role %s)",
    (role) => {
      expect(getPatientFieldPermissions(null, role)).toEqual(ALL_PATIENT_VIEW);
    }
  );
});

describe("getVisitFieldPermissions", () => {
  it.each(ADMIN_ROLES)(
    "lets %s edit every part of any clinician's visit",
    (role) => {
      expect(
        getVisitFieldPermissions("RN", role, OTHER_CLINICIAN_ID, OWNER_ID)
      ).toEqual(ALL_VISIT_EDIT);
      expect(getVisitFieldPermissions(null, role)).toEqual(ALL_VISIT_EDIT);
    }
  );

  it("lets Admin staff edit visit details and billing but not clinical content", () => {
    expect(
      getVisitFieldPermissions("Admin", "user", OTHER_CLINICIAN_ID, OWNER_ID)
    ).toEqual({
      visit_details: "edit",
      assessments: "view",
      treatments: "view",
      visit_notes: "view",
      signatures: "view",
      billing: "edit",
    });
  });

  it.each(CLINICAL_CREDENTIALS)(
    "lets %s edit their own visit but hides billing",
    (credentials) => {
      expect(
        getVisitFieldPermissions(credentials, "user", OWNER_ID, OWNER_ID)
      ).toEqual({
        visit_details: "edit",
        assessments: "edit",
        treatments: "edit",
        visit_notes: "edit",
        signatures: "edit",
        billing: "none",
      });
    }
  );

  it("makes another clinician's visit read-only", () => {
    const permissions = getVisitFieldPermissions(
      "RN",
      "user",
      OTHER_CLINICIAN_ID,
      OWNER_ID
    );
    expect({
      visit_details: permissions.visit_details,
      assessments: permissions.assessments,
      treatments: permissions.treatments,
      visit_notes: permissions.visit_notes,
      signatures: permissions.signatures,
    }).toEqual({
      visit_details: "view",
      assessments: "view",
      treatments: "view",
      visit_notes: "view",
      signatures: "view",
    });
    expect(permissions.billing).not.toBe("edit");
  });

  it.each([
    [undefined, OWNER_ID],
    [OWNER_ID, undefined],
    ["", ""],
  ])(
    "does not treat a visit with unknown ownership (%o / %o) as the clinician's own",
    (visitUserId, currentUserId) => {
      expect(
        getVisitFieldPermissions("MD", "user", visitUserId, currentUserId)
      ).toEqual(ALL_VISIT_VIEW);
    }
  );

  it("keeps users without credentials read-only even on their own visit", () => {
    expect(getVisitFieldPermissions(null, "user", OWNER_ID, OWNER_ID)).toEqual(
      ALL_VISIT_VIEW
    );
  });
});

describe("canEditDemographics / canEditInsurance", () => {
  it.each([
    [null, "tenant_admin", true],
    ["MD", "facility_admin", true],
    ["Admin", "user", true],
    ["Admin", null, true],
    ["RN", "user", false],
    ["MD", null, false],
    [null, "user", false],
    [null, null, false],
  ] as const)(
    "credentials %s with role %s -> %s",
    (credentials, role, expected) => {
      expect(canEditDemographics(credentials, role)).toBe(expected);
      expect(canEditInsurance(credentials, role)).toBe(expected);
    }
  );
});

describe("canEditVisit", () => {
  it.each([
    ["admin role on someone else's visit", "RN", "facility_admin", false, true],
    ["Admin staff on someone else's visit", "Admin", "user", false, true],
    ["clinician on own visit", "LVN", "user", true, true],
    ["clinician on another clinician's visit", "LVN", "user", false, false],
    ["user without credentials on own visit", null, "user", true, false],
  ] as const)("%s", (_case, credentials, role, ownVisit, expected) => {
    expect(
      canEditVisit(
        credentials,
        role,
        ownVisit ? OWNER_ID : OTHER_CLINICIAN_ID,
        OWNER_ID
      )
    ).toBe(expected);
  });
});

describe("canUploadDocuments", () => {
  const adminOnlyTypes = ["insurance_card", "face_sheet", "id_verification"];

  it.each([
    [null, "tenant_admin"],
    ["RN", "facility_admin"],
    ["Admin", "user"],
  ] as const)(
    "lets admins (credentials %s, role %s) upload any document type",
    (credentials, role) => {
      for (const type of [...adminOnlyTypes, "lab_results", undefined]) {
        expect(canUploadDocuments(credentials, role, type)).toBe(true);
      }
    }
  );

  it.each(adminOnlyTypes)(
    "blocks clinicians from uploading the admin-only %s type",
    (type) => {
      expect(canUploadDocuments("MD", "user", type)).toBe(false);
    }
  );

  it("blocks users without credentials from uploading anything", () => {
    expect(canUploadDocuments(null, "user")).toBe(false);
    expect(canUploadDocuments(null, null, "lab_results")).toBe(false);
  });
});

describe("getReadOnlyReason", () => {
  it("returns null for fields the user may edit", () => {
    expect(getReadOnlyReason("demographics", null, "tenant_admin")).toBeNull();
    expect(getReadOnlyReason("wounds", "RN", "user")).toBeNull();
    expect(getReadOnlyReason("insurance", "Admin", "user")).toBeNull();
  });

  it.each([
    "demographics",
    "contact",
    "insurance",
    "emergency_contact",
  ] as const)("points clinicians to an administrator for %s", (category) => {
    expect(getReadOnlyReason(category, "RN", "user")).toBe(
      "Contact an administrator to update this information"
    );
  });

  it("explains that only administrators upload identification documents", () => {
    expect(getReadOnlyReason("documents", "PA", "user")).toBe(
      "Only administrators can upload insurance and identification documents"
    );
  });

  it.each(["medical_history", "allergies", "wounds"] as const)(
    "gives Admin staff a generic reason for clinical field %s",
    (category: PatientFieldCategory) => {
      expect(getReadOnlyReason(category, "Admin", "user")).toBe(
        "You do not have permission to edit this field"
      );
    }
  );

  it("explains read-only fields to users without credentials", () => {
    expect(getReadOnlyReason("wounds", null, "user")).toBe(
      "You do not have permission to edit this field"
    );
    expect(getReadOnlyReason("contact", null, null)).toBe(
      "Contact an administrator to update this information"
    );
  });
});
