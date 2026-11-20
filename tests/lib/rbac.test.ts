import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  canDownloadVisitPDF,
  canPerformProcedure,
  canViewVisitDetails,
  getAccessibleFacilities,
  getAllowedProcedures,
  getUserFacilityIds,
  getUserRole,
  hasAccessToFacility,
  hasAdminEntitlement,
  isAdmin,
  isFacilityAdmin,
  isFacilityUser,
  isTenantAdmin,
  requireAdmin,
  requireCredentials,
  requireFacilityAccess,
  requireTenantAdmin,
  requiresPatientSignature,
} from "@/lib/rbac";
import {
  eqValue,
  filterValue,
  useFakeSupabase,
  type FakeSupabase,
} from "../helpers/supabase";
import {
  makeAuthUser,
  makeUserRole,
  OTHER_FACILITY_ID,
  TEST_FACILITY_ID,
  TEST_TENANT_ID,
  TEST_USER_ID,
} from "../helpers/fixtures";

let db: FakeSupabase;

beforeEach(() => {
  db = useFakeSupabase({ user: makeAuthUser() });
  vi.spyOn(console, "error").mockImplementation(() => {});
});

function givenRole(role: ReturnType<typeof makeUserRole> | null) {
  db.onRpc("get_user_role_info", { data: role ? [role] : [] });
}

function givenCredentials(credentials: string | null) {
  db.on("users", "select", {
    data: credentials ? { credentials } : null,
    error: credentials ? null : { message: "not found" },
  });
}

describe("getUserRole", () => {
  it("returns null without querying roles when nobody is signed in", async () => {
    db.setUser(null);
    expect(await getUserRole()).toBeNull();
    expect(db.rpcCalls).toHaveLength(0);
  });

  it("looks up the signed-in user's role through the RPC", async () => {
    const role = makeUserRole({ role: "facility_admin" });
    givenRole(role);

    expect(await getUserRole()).toEqual(role);
    expect(db.rpcCalls).toEqual([
      { fn: "get_user_role_info", args: { user_uuid: TEST_USER_ID } },
    ]);
  });

  it("returns the first role when the user has several assignments", async () => {
    const first = makeUserRole({ id: "role-a", role: "tenant_admin" });
    const second = makeUserRole({ id: "role-b", role: "user" });
    db.onRpc("get_user_role_info", { data: [first, second] });

    expect((await getUserRole())?.id).toBe("role-a");
  });

  it("returns null when the user has no role", async () => {
    givenRole(null);
    expect(await getUserRole()).toBeNull();
  });

  it("returns null when the RPC fails", async () => {
    db.onRpc("get_user_role_info", {
      data: null,
      error: { message: "boom" },
    });
    expect(await getUserRole()).toBeNull();
  });
});

describe("role checks", () => {
  it.each([
    ["tenant_admin", true, false, true],
    ["facility_admin", false, true, true],
    ["user", false, false, false],
  ] as const)(
    "%s -> tenant admin %s, facility admin %s, admin %s",
    async (role, tenant, facility, admin) => {
      givenRole(makeUserRole({ role }));
      expect(await isTenantAdmin()).toBe(tenant);
      expect(await isFacilityAdmin()).toBe(facility);
      expect(await isAdmin()).toBe(admin);
    }
  );

  it("treats a user without a role as not an admin", async () => {
    givenRole(null);
    expect(await isAdmin()).toBe(false);
    await expect(requireAdmin()).rejects.toThrow("Admin role required");
  });

  it("requireTenantAdmin rejects facility admins", async () => {
    givenRole(makeUserRole({ role: "facility_admin" }));
    await expect(requireTenantAdmin()).rejects.toThrow(
      "Unauthorized: Tenant admin role required"
    );
  });

  it("requireTenantAdmin and requireAdmin pass for a tenant admin", async () => {
    givenRole(makeUserRole({ role: "tenant_admin" }));
    await expect(requireTenantAdmin()).resolves.toBeUndefined();
    await expect(requireAdmin()).resolves.toBeUndefined();
  });
});

describe("hasAdminEntitlement", () => {
  it("is granted to admin roles regardless of credentials", async () => {
    givenRole(makeUserRole({ role: "facility_admin" }));
    givenCredentials("RN");
    expect(await hasAdminEntitlement()).toBe(true);
  });

  it("is granted to plain users holding the Admin credential", async () => {
    givenRole(makeUserRole({ role: "user" }));
    givenCredentials("Admin");
    expect(await hasAdminEntitlement()).toBe(true);
  });

  it("is denied to clinicians without an admin role", async () => {
    givenRole(makeUserRole({ role: "user" }));
    givenCredentials("MD");
    expect(await hasAdminEntitlement()).toBe(false);
  });
});

describe("facility access", () => {
  it("collects assigned facility ids and skips tenant-wide rows", async () => {
    db.on("user_roles", "select", {
      data: [
        makeUserRole({ facility_id: TEST_FACILITY_ID }),
        makeUserRole({ facility_id: null }),
        makeUserRole({ facility_id: OTHER_FACILITY_ID }),
      ],
    });

    expect(await getUserFacilityIds()).toEqual([
      TEST_FACILITY_ID,
      OTHER_FACILITY_ID,
    ]);
    expect(eqValue(db.queries("user_roles")[0], "user_id")).toBe(TEST_USER_ID);
  });

  it("returns no facility ids when the role lookup fails", async () => {
    db.on("user_roles", "select", { data: null, error: { message: "x" } });
    expect(await getUserFacilityIds()).toEqual([]);
  });

  it("lets a tenant admin into any facility of their own tenant", async () => {
    givenRole(makeUserRole({ role: "tenant_admin", facility_id: null }));
    db.on("facilities", "select", { data: { tenant_id: TEST_TENANT_ID } });

    expect(await hasAccessToFacility(OTHER_FACILITY_ID)).toBe(true);
    expect(eqValue(db.queries("facilities")[0], "id")).toBe(OTHER_FACILITY_ID);
    expect(db.queries("user_roles")).toHaveLength(0);
  });

  it("keeps a tenant admin out of another tenant's facility", async () => {
    givenRole(makeUserRole({ role: "tenant_admin" }));
    db.on("facilities", "select", { data: { tenant_id: "another-tenant" } });

    expect(await hasAccessToFacility(TEST_FACILITY_ID)).toBe(false);
  });

  it("limits facility admins and users to their assigned facilities", async () => {
    givenRole(makeUserRole({ role: "facility_admin" }));
    db.on("user_roles", "select", {
      data: [makeUserRole({ facility_id: TEST_FACILITY_ID })],
    });

    expect(await hasAccessToFacility(TEST_FACILITY_ID)).toBe(true);
    expect(await hasAccessToFacility(OTHER_FACILITY_ID)).toBe(false);
  });

  it("denies access when the user has no role", async () => {
    givenRole(null);
    expect(await hasAccessToFacility(TEST_FACILITY_ID)).toBe(false);
    await expect(requireFacilityAccess(TEST_FACILITY_ID)).rejects.toThrow(
      "No access to this facility"
    );
  });
});

describe("getAccessibleFacilities", () => {
  it("lists every active facility of the tenant for tenant admins", async () => {
    givenRole(makeUserRole({ role: "tenant_admin" }));
    const facilities = [{ id: TEST_FACILITY_ID, name: "Alpha Care" }];
    db.on("facilities", "select", { data: facilities });

    expect(await getAccessibleFacilities()).toEqual(facilities);
    const [query] = db.queries("facilities");
    expect(eqValue(query, "tenant_id")).toBe(TEST_TENANT_ID);
    expect(eqValue(query, "is_active")).toBe(true);
  });

  it("lists only assigned active facilities for other users", async () => {
    givenRole(makeUserRole({ role: "user" }));
    db.on("user_roles", "select", {
      data: [makeUserRole({ facility_id: TEST_FACILITY_ID })],
    });
    db.on("facilities", "select", { data: [{ id: TEST_FACILITY_ID }] });

    await getAccessibleFacilities();
    const [query] = db.queries("facilities");
    expect(filterValue(query, "in", "id")).toEqual([TEST_FACILITY_ID]);
    expect(eqValue(query, "is_active")).toBe(true);
  });

  it("returns nothing without querying facilities when none are assigned", async () => {
    givenRole(makeUserRole({ role: "user", facility_id: null }));
    db.on("user_roles", "select", { data: [] });

    expect(await getAccessibleFacilities()).toEqual([]);
    expect(db.queries("facilities")).toHaveLength(0);
  });

  it("returns nothing for users without a role", async () => {
    givenRole(null);
    expect(await getAccessibleFacilities()).toEqual([]);
  });
});

describe("credential-based permissions", () => {
  it("requires patient signatures for nurses", async () => {
    givenCredentials("LVN");
    expect(await requiresPatientSignature()).toBe(true);
  });

  it("does not require patient signatures when credentials are unknown", async () => {
    givenCredentials(null);
    expect(await requiresPatientSignature()).toBe(false);
  });

  it("lists procedures whose scope includes the user's credentials", async () => {
    givenCredentials("RN");
    db.on("procedure_scopes", "select", {
      data: [{ procedure_code: "97597" }, { procedure_code: "11042" }],
    });

    expect(await getAllowedProcedures()).toEqual(["97597", "11042"]);
    expect(
      filterValue(
        db.queries("procedure_scopes")[0],
        "contains",
        "allowed_credentials"
      )
    ).toEqual(["RN"]);
  });

  it("allows no procedures when credentials are unknown", async () => {
    givenCredentials(null);
    expect(await getAllowedProcedures()).toEqual([]);
    expect(db.queries("procedure_scopes")).toHaveLength(0);
  });

  describe("canPerformProcedure", () => {
    it("allows a procedure whose scope includes the credentials", async () => {
      givenCredentials("NP");
      db.on("procedure_scopes", "select", {
        data: { allowed_credentials: ["MD", "NP"] },
      });
      expect(await canPerformProcedure("11042")).toBe(true);
      expect(eqValue(db.queries("procedure_scopes")[0], "procedure_code")).toBe(
        "11042"
      );
    });

    it("blocks a procedure whose scope excludes the credentials", async () => {
      givenCredentials("CNA");
      db.on("procedure_scopes", "select", {
        data: { allowed_credentials: ["MD", "NP"] },
      });
      expect(await canPerformProcedure("11042")).toBe(false);
    });

    it("allows procedures that have no scope restriction", async () => {
      givenCredentials("RN");
      db.on("procedure_scopes", "select", { data: null });
      expect(await canPerformProcedure("97597")).toBe(true);
    });

    it("fails closed when the scope lookup errors", async () => {
      givenCredentials("MD");
      db.on("procedure_scopes", "select", {
        data: null,
        error: { message: "timeout" },
      });
      expect(await canPerformProcedure("11042")).toBe(false);
    });

    it("denies everything when credentials are unknown", async () => {
      givenCredentials(null);
      expect(await canPerformProcedure("97597")).toBe(false);
    });
  });

  it("requireCredentials accepts listed credentials and rejects others", async () => {
    givenCredentials("PA");
    await expect(requireCredentials(["MD", "PA"])).resolves.toBeUndefined();
    await expect(requireCredentials(["MD", "DO"])).rejects.toThrow(
      "Unauthorized: Requires credentials: MD, DO"
    );
  });
});

describe("visit visibility", () => {
  it("never treats admins as facility users", () => {
    expect(isFacilityUser("tenant_admin", null)).toBe(false);
    expect(isFacilityUser("facility_admin", "Admin")).toBe(false);
  });

  it("treats users with clinical credentials as clinicians", () => {
    for (const credentials of [
      "MD",
      "DO",
      "PA",
      "NP",
      "RN",
      "LVN",
      "CNA",
    ] as const) {
      expect(isFacilityUser("user", credentials)).toBe(false);
    }
  });

  it("treats non-clinical users as facility users", () => {
    expect(isFacilityUser("user", "Admin")).toBe(true);
    expect(isFacilityUser("user", null)).toBe(true);
  });

  it("does not classify someone without a role", () => {
    expect(isFacilityUser(null, null)).toBe(false);
  });

  it("shows facility users only approved visits", () => {
    expect(canViewVisitDetails("user", null, "approved")).toBe(true);
    for (const status of [
      "draft",
      "signed",
      "sent_to_office",
      "being_corrected",
    ]) {
      expect(canViewVisitDetails("user", "Admin", status)).toBe(false);
      expect(canDownloadVisitPDF("user", "Admin", status)).toBe(false);
    }
  });

  it("shows clinicians and admins visits in any status", () => {
    expect(canViewVisitDetails("user", "RN", "draft")).toBe(true);
    expect(canDownloadVisitPDF("facility_admin", null, "sent_to_office")).toBe(
      true
    );
  });
});
