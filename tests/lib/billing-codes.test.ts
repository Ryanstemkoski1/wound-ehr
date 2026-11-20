// lib/billing-codes.ts is reference data (no selection logic). The billing
// forms look entries up by `code` with `Array.find` and render them as keyed
// dropdown options, so these tests guard the integrity rules the UI relies on.

import { describe, expect, it } from "vitest";
import {
  COMMON_CPT_CODES,
  COMMON_ICD10_CODES,
  COMMON_MODIFIERS,
} from "@/lib/billing-codes";

const CATALOGUES = [
  ["CPT", COMMON_CPT_CODES],
  ["ICD-10", COMMON_ICD10_CODES],
  ["modifier", COMMON_MODIFIERS],
] as const;

function duplicates(codes: string[]): string[] {
  return codes.filter((code, i) => codes.indexOf(code) !== i);
}

describe("billing code catalogues", () => {
  it.each(CATALOGUES)(
    "has no duplicate %s codes and a description for each",
    (_name, entries) => {
      expect(duplicates(entries.map((e) => e.code))).toEqual([]);
      for (const entry of entries) {
        expect(entry.description.trim(), entry.code).not.toBe("");
      }
    }
  );

  it("uses five-digit CPT codes", () => {
    const malformed = COMMON_CPT_CODES.filter((c) => !/^\d{5}$/.test(c.code));
    expect(malformed).toEqual([]);
  });

  it("uses well-formed ICD-10-CM codes (letter, two digits, optional dotted suffix)", () => {
    const malformed = COMMON_ICD10_CODES.filter(
      (c) => !/^[A-Z]\d{2}(\.[0-9A-Z]{1,4})?$/.test(c.code)
    );
    expect(malformed).toEqual([]);
  });

  it("uses two-character uppercase modifiers", () => {
    const malformed = COMMON_MODIFIERS.filter(
      (m) => !/^[0-9A-Z]{2}$/.test(m.code)
    );
    expect(malformed).toEqual([]);
  });

  it("offers every 'each additional' add-on code together with its primary code", () => {
    const primaryFor: Record<string, string> = {
      "11045": "11042",
      "11046": "11043",
      "11047": "11044",
      "97598": "97597",
      "15272": "15271",
    };
    const codes = COMMON_CPT_CODES.map((c) => c.code);
    const addOns = COMMON_CPT_CODES.filter((c) =>
      /each additional/i.test(c.description)
    ).map((c) => c.code);

    expect(addOns.sort()).toEqual(Object.keys(primaryFor).sort());
    for (const addOn of addOns) {
      expect(codes, `primary for ${addOn}`).toContain(primaryFor[addOn]);
    }
  });
});
