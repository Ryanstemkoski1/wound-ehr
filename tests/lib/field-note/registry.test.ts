import { describe, expect, it } from "vitest";
import {
  SECTIONS,
  SECTION_MAP,
  WOUND_FIELDS,
  applicableSections,
  omittedSections,
  type FieldDef,
} from "@/lib/field-note/registry";

type ChipsField = Extract<FieldDef, { kind: "chips" }>;

const OMITTED_ON_FOLLOW_UP = [
  "functional_status",
  "nutrition_history",
  "ros",
  "pmh_meds_allergies",
];

const keysOf = (sections: { key: string }[]) => sections.map((s) => s.key);

/** Every field list in the registry: one per section, plus the per-wound card. */
const FIELD_GROUPS: [string, FieldDef[]][] = [
  ...SECTIONS.map((s): [string, FieldDef[]] => [s.key, s.fields]),
  ["wound card", WOUND_FIELDS.fields],
];

const CHIP_FIELDS: [string, ChipsField][] = FIELD_GROUPS.flatMap(
  ([group, fields]) =>
    fields
      .filter((f): f is ChipsField => f.kind === "chips")
      .map((f): [string, ChipsField] => [`${group}.${f.key}`, f])
);

function chipField(sectionKey: string, fieldKey: string): ChipsField {
  const field = SECTION_MAP[sectionKey]?.fields.find((f) => f.key === fieldKey);
  if (!field || field.kind !== "chips") {
    throw new Error(`No chips field ${sectionKey}.${fieldKey}`);
  }
  return field;
}

describe("section registry structure", () => {
  it("numbers sections 2-19 in paper order with no gaps", () => {
    expect(SECTIONS.map((s) => s.paperNumber)).toEqual(
      Array.from({ length: 18 }, (_, i) => i + 2)
    );
  });

  it("uses unique section keys and indexes each one in SECTION_MAP", () => {
    const keys = keysOf(SECTIONS);
    expect(new Set(keys).size).toBe(keys.length);
    for (const section of SECTIONS) {
      expect(SECTION_MAP[section.key]).toBe(section);
    }
    expect(Object.keys(SECTION_MAP)).toHaveLength(SECTIONS.length);
    expect(SECTION_MAP["not_a_section"]).toBeUndefined();
  });

  it("models the wound assessment as a per-wound card list", () => {
    const wounds = SECTIONS.filter((s) => s.kind === "wounds");
    expect(keysOf(wounds)).toEqual(["wound_assessment"]);
    expect(wounds[0].fields).toEqual([]);
    expect(WOUND_FIELDS.fields.length).toBeGreaterThan(0);
  });

  it("ends with the notes + signature block", () => {
    expect(SECTIONS.at(-1)).toMatchObject({
      key: "additional_notes",
      kind: "notes",
      paperNumber: 19,
    });
  });

  it("gives every field and detail input a unique key within its section", () => {
    const duplicates = FIELD_GROUPS.flatMap(([group, fields]) => {
      const keys = fields.flatMap((f) =>
        f.kind === "chips" && f.detail ? [f.key, f.detail.key] : [f.key]
      );
      return keys
        .filter((k, i) => keys.indexOf(k) !== i)
        .map((k) => `${group}.${k}`);
    });
    expect(duplicates).toEqual([]);
  });
});

describe("chip options", () => {
  it("gives every chips field at least one option", () => {
    const empty = CHIP_FIELDS.filter(([, f]) => f.options.length === 0);
    expect(empty.map(([name]) => name)).toEqual([]);
  });

  it("stores option values as unique snake_case slugs", () => {
    expect(CHIP_FIELDS.length).toBeGreaterThan(0);
    const problems = CHIP_FIELDS.flatMap(([name, field]) => {
      const values = field.options.map((o) => o.value);
      return values
        .filter(
          (v, i) =>
            values.indexOf(v) !== i || !/^[a-z0-9]+(_[a-z0-9]+)*$/.test(v)
        )
        .map((v) => `${name}: ${v}`);
    });
    expect(problems).toEqual([]);
  });

  it.each([
    ["hpi", "pain", "Mild (1-3)", "mild_1_3"],
    ["interval_history", "falls", "One, no injury", "one_no_injury"],
    [
      "interval_history",
      "antibiotic_therapy",
      "New — suspected infection",
      "new_suspected_infection",
    ],
    ["pmh_meds_allergies", "medications", "D/C'd", "d_c_d"],
    ["physical_exam", "mental_status", "A&O x3", "a_o_x3"],
  ])(
    "derives the stored value from the label (%s.%s %o -> %s)",
    (sectionKey, fieldKey, label, value) => {
      const option = chipField(sectionKey, fieldKey).options.find(
        (o) => o.label === label
      );
      expect(option?.value).toBe(value);
    }
  );

  it("only reveals detail inputs for option values that exist", () => {
    const withTriggers = CHIP_FIELDS.filter(([, f]) => f.detail?.when);
    expect(withTriggers.length).toBeGreaterThan(0);
    const dangling = withTriggers.flatMap(([name, field]) => {
      const values = field.options.map((o) => o.value);
      return (field.detail?.when ?? [])
        .filter((trigger) => !values.includes(trigger))
        .map((trigger) => `${name}: ${trigger}`);
    });
    expect(dangling).toEqual([]);
  });
});

describe("numeric fields", () => {
  it("bounds every numeric field with min <= max", () => {
    const numeric = FIELD_GROUPS.flatMap(([, fields]) =>
      fields.filter((f) => f.kind === "numeric")
    );
    expect(numeric.length).toBeGreaterThan(0);
    const unbounded = FIELD_GROUPS.flatMap(([group, fields]) =>
      fields
        .filter(
          (f) =>
            f.kind === "numeric" &&
            !(
              typeof f.min === "number" &&
              typeof f.max === "number" &&
              f.min <= f.max
            )
        )
        .map((f) => `${group}.${f.key}`)
    );
    expect(unbounded).toEqual([]);
  });

  it("bounds wound bed percentages to 0-100", () => {
    const bed = WOUND_FIELDS.fields.filter((f) => f.key.startsWith("bed_"));
    expect(bed.map((f) => f.key)).toEqual([
      "bed_granulation_pct",
      "bed_slough_pct",
      "bed_eschar_pct",
    ]);
    for (const field of bed) {
      expect(field).toMatchObject({ kind: "numeric", min: 0, max: 100 });
    }
  });
});

describe("follow-up policy", () => {
  it("omits sections 4-7 on follow-up notes", () => {
    const omitted = SECTIONS.filter((s) => s.followUp === "omitted");
    expect(keysOf(omitted)).toEqual(OMITTED_ON_FOLLOW_UP);
    expect(omitted.map((s) => s.paperNumber)).toEqual([4, 5, 6, 7]);
  });

  it("offers a one-tap attestation for labs and vascular sections", () => {
    const attested = SECTIONS.filter((s) => s.followUp === "attestation");
    expect(
      attested.map((s) => [s.key, s.paperNumber, s.attestationLabel])
    ).toEqual([
      ["nutrition_lab", 12, "No new labs since last visit"],
      ["vascular_diabetic", 13, "No change since last visit"],
    ]);
  });
});

describe("applicableSections", () => {
  it("includes every section on an initial evaluation", () => {
    expect(applicableSections("initial_evaluation")).toEqual(SECTIONS);
    expect(applicableSections("initial_evaluation", ["ros"])).toEqual(SECTIONS);
  });

  it("drops the omitted sections on a follow-up but keeps paper numbering", () => {
    const sections = applicableSections("follow_up");
    expect(sections).toHaveLength(14);
    for (const key of OMITTED_ON_FOLLOW_UP) {
      expect(keysOf(sections)).not.toContain(key);
    }
    expect(sections.map((s) => s.paperNumber).slice(0, 4)).toEqual([
      2, 3, 8, 9,
    ]);
    expect(sections.find((s) => s.key === "vitals")?.paperNumber).toBe(8);
  });

  it("re-includes an omitted section the clinician added, in paper order", () => {
    const keys = keysOf(applicableSections("follow_up", ["ros"]));
    expect(keys).toHaveLength(15);
    expect(keys.slice(0, 4)).toEqual([
      "hpi",
      "interval_history",
      "ros",
      "vitals",
    ]);
  });

  it("ignores added keys that are unknown or already applicable", () => {
    expect(
      applicableSections("follow_up", ["vitals", "not_a_section"])
    ).toEqual(applicableSections("follow_up"));
  });
});

describe("omittedSections", () => {
  it("is empty for an initial evaluation", () => {
    expect(omittedSections("initial_evaluation")).toEqual([]);
    expect(omittedSections("initial_evaluation", ["ros"])).toEqual([]);
  });

  it("lists the follow-up omissions that can still be added", () => {
    expect(keysOf(omittedSections("follow_up"))).toEqual(OMITTED_ON_FOLLOW_UP);
    expect(
      keysOf(omittedSections("follow_up", ["ros", "functional_status"]))
    ).toEqual(["nutrition_history", "pmh_meds_allergies"]);
  });

  it("partitions the registry together with applicableSections", () => {
    const added = ["nutrition_history"];
    const applicable = keysOf(applicableSections("follow_up", added));
    const omitted = keysOf(omittedSections("follow_up", added));
    expect(applicable.filter((k) => omitted.includes(k))).toEqual([]);
    expect([...applicable, ...omitted].sort()).toEqual(keysOf(SECTIONS).sort());
  });
});
