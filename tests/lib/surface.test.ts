import { describe, expect, it } from "vitest";
import type { Credentials } from "@/lib/credentials";
import type { UserRole } from "@/lib/rbac";
import {
  canSwitchSurface,
  getDefaultSurface,
  getSurfaceEntitlements,
  type Surface,
} from "@/lib/surface";

const CLINICAL_CREDENTIALS: Credentials[] = [
  "MD",
  "DO",
  "PA",
  "NP",
  "RN",
  "LVN",
  "CNA",
];

describe("getSurfaceEntitlements", () => {
  it.each<[UserRole | null, Credentials | null, Surface[]]>([
    ["tenant_admin", null, ["admin", "clinical"]],
    ["tenant_admin", "Admin", ["admin", "clinical"]],
    ["tenant_admin", "RN", ["admin", "clinical"]],
    ["facility_admin", null, ["admin"]],
    ["facility_admin", "Admin", ["admin"]],
    ["facility_admin", "MD", ["admin", "clinical"]],
    ["user", "Admin", ["admin"]],
    [null, "Admin", ["admin"]],
    ["user", null, []],
    [null, null, []],
  ])("role %s with credentials %s -> %o", (role, credentials, expected) => {
    expect(getSurfaceEntitlements(role, credentials)).toEqual(expected);
  });

  it.each(CLINICAL_CREDENTIALS)(
    "gives a %s with a plain user role the clinical surface only",
    (credentials) => {
      expect(getSurfaceEntitlements("user", credentials)).toEqual(["clinical"]);
    }
  );

  it("grants the clinical surface from credentials even without a role", () => {
    expect(getSurfaceEntitlements(null, "CNA")).toEqual(["clinical"]);
  });
});

describe("getDefaultSurface", () => {
  it("returns null for a user entitled to no surface", () => {
    expect(getDefaultSurface("user", null)).toBeNull();
    expect(getDefaultSurface(null, null)).toBeNull();
  });

  it.each<[UserRole | null, Credentials | null]>([
    ["facility_admin", null],
    ["facility_admin", "Admin"],
    ["user", "Admin"],
  ])("lands admin-only users (%s, %s) on admin", (role, credentials) => {
    expect(getDefaultSurface(role, credentials)).toBe("admin");
  });

  it.each(CLINICAL_CREDENTIALS)(
    "lands a clinical-only %s on clinical",
    (credentials) => {
      expect(getDefaultSurface("user", credentials)).toBe("clinical");
    }
  );

  it.each<[UserRole, Credentials]>([
    ["tenant_admin", "MD"],
    ["facility_admin", "RN"],
  ])("lands dual-surface %s holding %s on clinical", (role, credentials) => {
    expect(getDefaultSurface(role, credentials)).toBe("clinical");
  });

  it.each([null, "Admin"] as const)(
    "lands a tenant admin without a clinical credential (%s) on admin",
    (credentials) => {
      expect(getDefaultSurface("tenant_admin", credentials)).toBe("admin");
    }
  );
});

describe("canSwitchSurface", () => {
  it.each<[Surface[], boolean]>([
    [[], false],
    [["admin"], false],
    [["clinical"], false],
    [["admin", "clinical"], true],
  ])("%o -> %s", (entitlements, expected) => {
    expect(canSwitchSurface(entitlements)).toBe(expected);
  });

  it("offers the switcher to every tenant admin", () => {
    expect(canSwitchSurface(getSurfaceEntitlements("tenant_admin", null))).toBe(
      true
    );
  });

  it("does not offer the switcher to a facility admin without a clinical credential", () => {
    expect(
      canSwitchSurface(getSurfaceEntitlements("facility_admin", "Admin"))
    ).toBe(false);
  });
});
