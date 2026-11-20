import { describe, expect, it } from "vitest";
import {
  CREDENTIALS_LABELS,
  getCredentialsLabel,
  hasFullClinicalAccess,
  requiresPatientSignature,
  type Credentials,
} from "@/lib/credentials";

const ALL_CREDENTIALS = Object.keys(CREDENTIALS_LABELS) as Credentials[];

describe("requiresPatientSignature", () => {
  it.each(["RN", "LVN"] as const)(
    "requires a patient signature for %s",
    (c) => {
      expect(requiresPatientSignature(c)).toBe(true);
    }
  );

  it.each(["MD", "DO", "PA", "NP", "CNA", "Admin"] as const)(
    "does not require a patient signature for %s",
    (c) => {
      expect(requiresPatientSignature(c)).toBe(false);
    }
  );

  it("treats missing credentials as not requiring a signature", () => {
    expect(requiresPatientSignature(null)).toBe(false);
    expect(requiresPatientSignature(undefined)).toBe(false);
  });
});

describe("hasFullClinicalAccess", () => {
  it("grants full access only to providers", () => {
    const full = ALL_CREDENTIALS.filter((c) => hasFullClinicalAccess(c));
    expect(full.sort()).toEqual(["DO", "MD", "NP", "PA"]);
  });

  it("denies access when credentials are missing", () => {
    expect(hasFullClinicalAccess(null)).toBe(false);
  });
});

describe("getCredentialsLabel", () => {
  it("returns the long label by default", () => {
    expect(getCredentialsLabel("LVN")).toBe("Licensed Vocational Nurse");
    expect(getCredentialsLabel("Admin")).toBe("Administrative Staff");
  });

  it("returns the short label when requested", () => {
    expect(getCredentialsLabel("NP", true)).toBe("NP");
  });

  it("labels missing credentials as Unknown", () => {
    expect(getCredentialsLabel(null)).toBe("Unknown");
    expect(getCredentialsLabel(undefined, true)).toBe("Unknown");
  });
});
