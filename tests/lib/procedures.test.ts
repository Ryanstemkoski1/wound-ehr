import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  canPerformProcedure,
  checkMultipleProcedures,
  filterAllowedCPTCodes,
  getAllowedProcedures,
  getAllowedProceduresByCategory,
  getAllProcedureScopes,
  getRestrictedProcedures,
  getRestrictionMessage,
  hasFullProcedureAccess,
  hasLimitedProcedureAccess,
  validateBillingCodes,
  type AllowedProcedure,
} from "@/lib/procedures";
import type { Credentials } from "@/lib/credentials";
import {
  filterValue,
  useFakeSupabase,
  type FakeSupabase,
} from "../helpers/supabase";
import { makeAuthUser } from "../helpers/fixtures";

let db: FakeSupabase;

beforeEach(() => {
  db = useFakeSupabase({ user: makeAuthUser() });
  vi.spyOn(console, "error").mockImplementation(() => {});
});

const DB_ERROR = { message: "permission denied for table procedure_scopes" };

const PROVIDERS: Credentials[] = ["MD", "DO", "PA", "NP"];

function scope(
  procedure_code: string,
  procedure_name: string,
  allowed_credentials: Credentials[],
  category: string | null = "debridement"
) {
  return { procedure_code, procedure_name, allowed_credentials, category };
}

/** Scopes as stored in procedure_scopes for the codes these tests use. */
const SHARP_DEBRIDEMENT = scope("11042", "Sharp debridement", PROVIDERS);
const SELECTIVE_DEBRIDEMENT = scope("97597", "Selective debridement", [
  ...PROVIDERS,
  "RN",
  "LVN",
]);
const NPWT = scope("97605", "NPWT", [...PROVIDERS, "RN"], "advanced_therapy");

function allowed(
  procedure_code: string,
  category: string | null
): AllowedProcedure {
  return {
    procedure_code,
    procedure_name: `Procedure ${procedure_code}`,
    category,
  };
}

describe("canPerformProcedure", () => {
  it("denies without credentials and without asking the database", async () => {
    expect(await canPerformProcedure(null, "11042")).toBe(false);
    expect(await canPerformProcedure(undefined, "11042")).toBe(false);
    expect(db.rpcCalls).toHaveLength(0);
  });

  it("asks the can_perform_procedure RPC with the credential and CPT code", async () => {
    db.onRpc("can_perform_procedure", { data: true });

    expect(await canPerformProcedure("NP", "11042")).toBe(true);
    expect(db.rpcCalls).toEqual([
      {
        fn: "can_perform_procedure",
        args: { user_credentials: "NP", cpt_code: "11042" },
      },
    ]);
  });

  it("allows only a strict boolean true from the RPC", async () => {
    for (const data of [false, null, "true", 1]) {
      db.onRpc("can_perform_procedure", { data });
      expect(await canPerformProcedure("RN", "11042")).toBe(false);
    }
  });

  it("fails closed when the RPC errors", async () => {
    db.onRpc("can_perform_procedure", { data: true, error: DB_ERROR });
    expect(await canPerformProcedure("MD", "11042")).toBe(false);
  });
});

describe("getAllowedProcedures", () => {
  it("returns nothing for missing credentials without querying", async () => {
    expect(await getAllowedProcedures(null)).toEqual([]);
    expect(db.queries()).toHaveLength(0);
  });

  it("selects scopes whose allowed_credentials contain the user's credential, ordered by category then code", async () => {
    const rows = [
      allowed("97597", "debridement"),
      allowed("97605", "advanced_therapy"),
    ];
    db.on("procedure_scopes", "select", { data: rows });

    expect(await getAllowedProcedures("RN")).toEqual(rows);

    const [query] = db.queries("procedure_scopes", "select");
    expect(query.columns).toBe("procedure_code, procedure_name, category");
    expect(filterValue(query, "contains", "allowed_credentials")).toEqual([
      "RN",
    ]);
    expect(query.filters.filter((f) => f.method === "order")).toEqual([
      { method: "order", args: ["category"] },
      { method: "order", args: ["procedure_code"] },
    ]);
  });

  it("returns an empty list when the query fails", async () => {
    db.on("procedure_scopes", "select", { data: null, error: DB_ERROR });
    expect(await getAllowedProcedures("MD")).toEqual([]);
  });
});

describe("getRestrictedProcedures", () => {
  it("selects scopes that do NOT contain the credential and exposes them as required_credentials", async () => {
    db.on("procedure_scopes", "select", { data: [SHARP_DEBRIDEMENT] });

    expect(await getRestrictedProcedures("LVN")).toEqual([
      {
        procedure_code: "11042",
        procedure_name: "Sharp debridement",
        category: "debridement",
        required_credentials: PROVIDERS,
      },
    ]);

    const [query] = db.queries("procedure_scopes", "select");
    expect(query.filters).toContainEqual({
      method: "not",
      args: ["allowed_credentials", "cs", "{LVN}"],
    });
  });

  it("returns nothing for missing credentials or a failed query", async () => {
    expect(await getRestrictedProcedures(undefined)).toEqual([]);

    db.on("procedure_scopes", "select", { data: null, error: DB_ERROR });
    expect(await getRestrictedProcedures("RN")).toEqual([]);
  });
});

describe("getAllowedProceduresByCategory", () => {
  it("groups procedures by category, keeping query order and filing uncategorised ones under 'other'", async () => {
    db.on("procedure_scopes", "select", {
      data: [
        allowed("11042", "debridement"),
        allowed("97597", "debridement"),
        allowed("99999", null),
        allowed("97605", "advanced_therapy"),
      ],
    });

    const grouped = await getAllowedProceduresByCategory("MD");

    expect(Object.keys(grouped)).toEqual([
      "debridement",
      "other",
      "advanced_therapy",
    ]);
    expect(grouped.debridement.map((p) => p.procedure_code)).toEqual([
      "11042",
      "97597",
    ]);
    expect(grouped.other.map((p) => p.procedure_code)).toEqual(["99999"]);
  });

  it("is empty for a user without credentials", async () => {
    expect(await getAllowedProceduresByCategory(null)).toEqual({});
  });
});

describe("getAllProcedureScopes", () => {
  it("returns every scope ordered by category and code ascending", async () => {
    db.on("procedure_scopes", "select", { data: [SHARP_DEBRIDEMENT, NPWT] });

    expect(await getAllProcedureScopes()).toEqual([SHARP_DEBRIDEMENT, NPWT]);
    const [query] = db.queries("procedure_scopes", "select");
    expect(query.columns).toBe("*");
    expect(query.filters).toEqual([
      { method: "order", args: ["category", { ascending: true }] },
      { method: "order", args: ["procedure_code", { ascending: true }] },
    ]);
  });

  it("returns an empty list when the query fails", async () => {
    db.on("procedure_scopes", "select", { data: null, error: DB_ERROR });
    expect(await getAllProcedureScopes()).toEqual([]);
  });
});

describe("filterAllowedCPTCodes", () => {
  it("keeps only codes on the credential's allowed list, in the caller's order", async () => {
    db.on("procedure_scopes", "select", {
      data: [
        allowed("97597", "debridement"),
        allowed("97605", "advanced_therapy"),
      ],
    });

    expect(
      await filterAllowedCPTCodes("RN", ["97605", "11042", "97597", "99213"])
    ).toEqual(["97605", "97597"]);
  });

  it("returns nothing, without querying, for missing credentials or no codes", async () => {
    expect(await filterAllowedCPTCodes(null, ["97597"])).toEqual([]);
    expect(await filterAllowedCPTCodes("MD", [])).toEqual([]);
    expect(db.queries()).toHaveLength(0);
  });
});

describe("checkMultipleProcedures", () => {
  it("allows scoped codes that list the credential and blocks those that do not", async () => {
    db.on("procedure_scopes", "select", {
      data: [SHARP_DEBRIDEMENT, SELECTIVE_DEBRIDEMENT],
    });

    expect(await checkMultipleProcedures("LVN", ["11042", "97597"])).toEqual([
      { code: "11042", allowed: false, name: "Sharp debridement" },
      { code: "97597", allowed: true, name: "Selective debridement" },
    ]);
    const [query] = db.queries("procedure_scopes", "select");
    expect(filterValue(query, "in", "procedure_code")).toEqual([
      "11042",
      "97597",
    ]);
  });

  it("allows codes that have no scope row (unrestricted by default)", async () => {
    db.on("procedure_scopes", "select", { data: [SHARP_DEBRIDEMENT] });

    expect(await checkMultipleProcedures("RN", ["99213"])).toEqual([
      { code: "99213", allowed: true },
    ]);
  });

  it("blocks every code when the scope lookup fails", async () => {
    db.on("procedure_scopes", "select", { data: null, error: DB_ERROR });

    expect(await checkMultipleProcedures("MD", ["11042", "99213"])).toEqual([
      { code: "11042", allowed: false },
      { code: "99213", allowed: false },
    ]);
  });

  it("returns nothing for missing credentials or no codes", async () => {
    expect(await checkMultipleProcedures(null, ["11042"])).toEqual([]);
    expect(await checkMultipleProcedures("RN", [])).toEqual([]);
    expect(db.queries()).toHaveLength(0);
  });
});

describe("validateBillingCodes", () => {
  it("rejects a save when the user's credentials are unknown", async () => {
    expect(await validateBillingCodes(null, ["99213"])).toEqual({
      valid: false,
      errors: ["User credentials not found"],
    });
  });

  it("accepts an empty code list without querying", async () => {
    expect(await validateBillingCodes("CNA", [])).toEqual({
      valid: true,
      errors: [],
    });
    expect(db.queries()).toHaveLength(0);
  });

  it("names each restricted procedure the user tried to bill", async () => {
    db.on("procedure_scopes", "select", {
      data: [SHARP_DEBRIDEMENT, SELECTIVE_DEBRIDEMENT, NPWT],
    });

    expect(
      await validateBillingCodes("LVN", ["11042", "97597", "97605", "99213"])
    ).toEqual({
      valid: false,
      errors: [
        "Cannot document CPT 11042 (Sharp debridement): Requires MD/DO/PA/NP credentials",
        "Cannot document CPT 97605 (NPWT): Requires MD/DO/PA/NP credentials",
      ],
    });
  });

  it("passes when every code is within the user's scope", async () => {
    db.on("procedure_scopes", "select", {
      data: [SHARP_DEBRIDEMENT, NPWT],
    });

    expect(await validateBillingCodes("PA", ["11042", "97605"])).toEqual({
      valid: true,
      errors: [],
    });
  });

  it("fails closed, without procedure names, when the scope lookup errors", async () => {
    db.on("procedure_scopes", "select", { data: null, error: DB_ERROR });

    expect(await validateBillingCodes("MD", ["99213"])).toEqual({
      valid: false,
      errors: ["Cannot document CPT 99213: Requires MD/DO/PA/NP credentials"],
    });
  });
});

describe("getRestrictionMessage", () => {
  it("lists the required credentials", () => {
    expect(getRestrictionMessage("11042", ["MD", "DO", "PA", "NP"])).toBe(
      "CPT 11042 requires MD, DO, PA, NP credentials"
    );
  });
});

describe("procedure access tiers", () => {
  it("gives providers (MD/DO/PA/NP) full, unrestricted access", () => {
    for (const c of PROVIDERS) {
      expect(hasFullProcedureAccess(c)).toBe(true);
      expect(hasLimitedProcedureAccess(c)).toBe(false);
    }
  });

  it("limits nursing credentials (RN/LVN/CNA)", () => {
    for (const c of ["RN", "LVN", "CNA"] as const) {
      expect(hasFullProcedureAccess(c)).toBe(false);
      expect(hasLimitedProcedureAccess(c)).toBe(true);
    }
  });

  it("puts Admin staff in neither tier but treats missing credentials as limited", () => {
    expect(hasFullProcedureAccess("Admin")).toBe(false);
    expect(hasLimitedProcedureAccess("Admin")).toBe(false);

    expect(hasFullProcedureAccess(null)).toBe(false);
    expect(hasLimitedProcedureAccess(null)).toBe(true);
    expect(hasLimitedProcedureAccess(undefined)).toBe(true);
  });
});
