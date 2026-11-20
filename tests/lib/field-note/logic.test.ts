import { describe, expect, it } from "vitest";
import type { z } from "zod";
import {
  EDITABLE_VISIT_STATUSES,
  FIELD_PIPELINE_STATUSES,
  PDF_VISIBLE_STATUSES,
  SECTION_KEYS,
  SIGNABLE_VISIT_STATUSES,
  computeReviewFlags,
  finalizeBlockers,
  noteProgress,
  sectionSchema,
  sectionState,
  statusChip,
  summarizeSection,
  woundSchema,
  type NoteSections,
  type NoteSectionsMeta,
} from "@/lib/field-note/logic";
import { SECTIONS, applicableSections } from "@/lib/field-note/registry";

const TIME_IN = "2026-11-02T14:00:00.000Z";
const TIME_OUT = "2026-11-02T14:45:00.000Z";
const PREPPED_AT = "2026-11-01T18:30:00.000Z";

const STANDARD_SECTION_KEYS = SECTIONS.filter((s) => s.kind !== "wounds").map(
  (s) => s.key
);
const FOLLOW_UP_KEYS = applicableSections("follow_up").map((s) => s.key);

function schemaFor(sectionKey: string): z.ZodTypeAny {
  const schema = sectionSchema(sectionKey);
  if (!schema) throw new Error(`No schema for ${sectionKey}`);
  return schema;
}

function issuesOf(schema: z.ZodTypeAny, payload: unknown) {
  const result = schema.safeParse(payload);
  return result.success ? [] : result.error.issues;
}

/** Meta that marks the given sections "not assessed" (i.e. handled). */
function notAssessed(keys: string[]): NoteSectionsMeta {
  return Object.fromEntries(keys.map((k) => [k, { not_assessed: true }]));
}

describe("statusChip", () => {
  it.each([
    ["scheduled", null, "Scheduled", "neutral"],
    ["scheduled", "", "Scheduled", "neutral"],
    ["scheduled", PREPPED_AT, "Prepped", "info"],
    ["in-progress", null, "In Progress", "active"],
    ["in-progress", PREPPED_AT, "In Progress", "active"],
    ["submitted", null, "Pending Review", "review"],
    ["sent_to_office", null, "Pending Review", "review"],
    ["needs_correction", null, "Needs Correction", "warn"],
    ["approved", null, "Completed", "done"],
    ["cancelled", null, "Cancelled", "muted"],
    ["no-show", null, "No-show", "muted"],
  ])("%s (prepped %o) -> %s / %s", (status, preppedAt, label, tone) => {
    expect(statusChip(status, preppedAt)).toEqual({ label, tone });
  });

  it("shows an unknown legacy status verbatim with a neutral tone", () => {
    expect(statusChip("draft")).toEqual({ label: "draft", tone: "neutral" });
  });

  it("gives every pipeline status a human label", () => {
    for (const status of FIELD_PIPELINE_STATUSES) {
      expect(statusChip(status).label).not.toBe(status);
    }
  });
});

describe("visit status gates", () => {
  it("allows editing and signing only before submission or when sent back", () => {
    const open = ["scheduled", "in-progress", "needs_correction"];
    expect(EDITABLE_VISIT_STATUSES).toEqual(open);
    expect(SIGNABLE_VISIT_STATUSES).toEqual(open);
  });

  it("only generates PDFs for submitted notes, never for editable ones", () => {
    expect(PDF_VISIBLE_STATUSES).toEqual([
      "submitted",
      "sent_to_office",
      "approved",
    ]);
    for (const status of PDF_VISIBLE_STATUSES) {
      expect(EDITABLE_VISIT_STATUSES).not.toContain(status);
    }
  });
});

describe("sectionSchema", () => {
  it("returns null for an unknown section", () => {
    expect(sectionSchema("not_a_section")).toBeNull();
  });

  it("builds a schema for every registry section", () => {
    expect(SECTION_KEYS).toEqual(SECTIONS.map((s) => s.key));
    for (const key of SECTION_KEYS) {
      expect(sectionSchema(key)).not.toBeNull();
    }
  });

  it("accepts an empty payload for every standard section", () => {
    const rejected = STANDARD_SECTION_KEYS.filter(
      (key) => !schemaFor(key).safeParse({}).success
    );
    expect(STANDARD_SECTION_KEYS).toHaveLength(17);
    expect(rejected).toEqual([]);
  });

  it("rejects keys the section does not render instead of stripping them", () => {
    expect(issuesOf(schemaFor("vitals"), { pulse: 80 })).toEqual([
      expect.objectContaining({ code: "unrecognized_keys", keys: ["pulse"] }),
    ]);
  });

  it("rejects a field that belongs to a different section", () => {
    expect(issuesOf(schemaFor("hpi"), { temp: 98.6 })).toEqual([
      expect.objectContaining({ code: "unrecognized_keys", keys: ["temp"] }),
    ]);
  });

  describe("chips fields", () => {
    it("accepts known option values", () => {
      const result = schemaFor("hpi").safeParse({
        pain: ["denies"],
        concerns: ["slow_healing", "supply_access"],
      });
      expect(result.success).toBe(true);
    });

    it("rejects an unknown option with a field-specific message", () => {
      expect(issuesOf(schemaFor("hpi"), { pain: ["unbearable"] })).toEqual([
        expect.objectContaining({
          path: ["pain", 0],
          message: "Unknown option for pain",
        }),
      ]);
    });

    it("stores option values, not display labels", () => {
      expect(schemaFor("hpi").safeParse({ pain: ["Denies"] }).success).toBe(
        false
      );
    });

    it("limits a single-select field to one value", () => {
      const schema = schemaFor("interval_history");
      expect(schema.safeParse({ smoking_status: ["current"] }).success).toBe(
        true
      );
      expect(schema.safeParse({ smoking_status: [] }).success).toBe(true);
      expect(
        issuesOf(schema, { smoking_status: ["never", "current"] })
      ).toEqual([
        expect.objectContaining({
          code: "too_big",
          path: ["smoking_status"],
        }),
      ]);
    });

    it("caps a multi-select field at its number of options", () => {
      expect(
        issuesOf(schemaFor("hpi"), { new_wounds: ["none", "none"] })
      ).toEqual([
        expect.objectContaining({ code: "too_big", path: ["new_wounds"] }),
      ]);
    });

    it("accepts the free-text detail key and trims it", () => {
      const result = schemaFor("interval_history").safeParse({
        falls: ["one_no_injury"],
        falls_injury: "  bruised left knee  ",
      });
      expect(result.success && result.data).toEqual({
        falls: ["one_no_injury"],
        falls_injury: "bruised left knee",
      });
    });

    it("limits detail text to 2000 characters after trimming", () => {
      const schema = schemaFor("pmh_meds_allergies");
      expect(
        schema.safeParse({ pmh_other: `${"a".repeat(2000)}   ` }).success
      ).toBe(true);
      expect(schema.safeParse({ pmh_other: "a".repeat(2001) }).success).toBe(
        false
      );
    });
  });

  describe("numeric fields", () => {
    it.each([
      ["temp", 90, true],
      ["temp", 110, true],
      ["temp", 89.9, false],
      ["temp", 110.1, false],
      ["o2_sat", 100, true],
      ["o2_sat", 101, false],
      ["hr", 19, false],
      ["rr", 60, true],
    ])("vitals %s = %d -> valid %s", (key, value, valid) => {
      expect(schemaFor("vitals").safeParse({ [key]: value }).success).toBe(
        valid
      );
    });

    it("accepts null to clear a value", () => {
      expect(schemaFor("vitals").safeParse({ temp: null }).success).toBe(true);
    });

    it("rejects numbers sent as strings", () => {
      expect(schemaFor("vitals").safeParse({ temp: "98.6" }).success).toBe(
        false
      );
    });
  });

  describe("text fields", () => {
    it("accepts free-form short text without format checks", () => {
      const result = schemaFor("vitals").safeParse({ bp: " 128/76 " });
      expect(result.success && result.data).toEqual({ bp: "128/76" });
    });

    it("limits textarea fields to 10000 characters", () => {
      const schema = schemaFor("plan");
      expect(
        schema.safeParse({ supplies_needed: "x".repeat(10000) }).success
      ).toBe(true);
      expect(
        schema.safeParse({ supplies_needed: "x".repeat(10001) }).success
      ).toBe(false);
    });

    it("accepts additional notes but nothing else in the notes block", () => {
      const schema = schemaFor("additional_notes");
      expect(schema.safeParse({ notes: "Synthetic note." }).success).toBe(true);
      expect(schema.safeParse({ signature: "x" }).success).toBe(false);
    });
  });

  describe("wound assessment", () => {
    const wound = {
      location: "Synthetic site A",
      etiology: ["other"],
      etiology_other: "Synthetic etiology",
      length_cm: 2.5,
      width_cm: 1.5,
      depth_cm: 0.2,
      bed_granulation_pct: 80,
      bed_slough_pct: 20,
      drainage_amount: ["scant"],
      treatment_applied: "Synthetic dressing",
    };

    it("accepts a complete wound card", () => {
      expect(woundSchema.safeParse(wound).success).toBe(true);
    });

    it("rejects unknown wound keys", () => {
      expect(woundSchema.safeParse({ ...wound, stage: "2" }).success).toBe(
        false
      );
    });

    it.each([
      ["length_cm", 0, true],
      ["length_cm", -0.1, false],
      ["depth_cm", 30, true],
      ["depth_cm", 30.1, false],
      ["bed_slough_pct", 101, false],
    ])("%s = %d -> valid %s", (key, value, valid) => {
      expect(woundSchema.safeParse({ [key]: value }).success).toBe(valid);
    });

    it("limits single-select drainage amount to one value", () => {
      expect(
        woundSchema.safeParse({ drainage_amount: ["scant", "heavy"] }).success
      ).toBe(false);
    });

    it("wraps wound cards in a { wounds } payload of at most 20", () => {
      const schema = schemaFor("wound_assessment");
      expect(schema.safeParse({ wounds: [] }).success).toBe(true);
      expect(
        schema.safeParse({ wounds: Array.from({ length: 20 }, () => ({})) })
          .success
      ).toBe(true);
      expect(
        schema.safeParse({ wounds: Array.from({ length: 21 }, () => ({})) })
          .success
      ).toBe(false);
    });

    it("requires the wounds array and rejects other top-level keys", () => {
      const schema = schemaFor("wound_assessment");
      expect(schema.safeParse({}).success).toBe(false);
      expect(schema.safeParse({ wounds: [], location: "x" }).success).toBe(
        false
      );
    });

    it("reports the failing wound by index", () => {
      expect(
        issuesOf(schemaFor("wound_assessment"), {
          wounds: [wound, { ...wound, odor: ["putrid"] }],
        })
      ).toEqual([
        expect.objectContaining({
          path: ["wounds", 1, "odor", 0],
          message: "Unknown option for odor",
        }),
      ]);
    });
  });
});

describe("sectionState", () => {
  it("is untouched when the section has no payload", () => {
    expect(sectionState("vitals", {}, {})).toBe("untouched");
  });

  it("is untouched when only blanks were saved", () => {
    const sections: NoteSections = {
      vitals: { bp: "   ", temp: null, hr: undefined },
      hpi: { pain: [], new_wounds_detail: "" },
      wound_assessment: { wounds: [{ location: " ", etiology: [] }] },
    };
    expect(sectionState("vitals", sections, {})).toBe("untouched");
    expect(sectionState("hpi", sections, {})).toBe("untouched");
    expect(sectionState("wound_assessment", sections, {})).toBe("untouched");
  });

  it.each<[string, string, NoteSections]>([
    ["a selected chip", "hpi", { hpi: { pain: ["denies"] } }],
    ["detail text", "hpi", { hpi: { new_wounds_detail: "Synthetic site" } }],
    [
      "a zero reading",
      "time_documentation",
      { time_documentation: { total_minutes: 0 } },
    ],
    [
      "one wound with content",
      "wound_assessment",
      { wound_assessment: { wounds: [{}, { length_cm: 1 }] } },
    ],
  ])("is started once it holds %s (%s)", (_case, key, sections) => {
    expect(sectionState(key, sections, {})).toBe("started");
  });

  it("is not_assessed when marked so, even with content", () => {
    expect(
      sectionState(
        "vitals",
        { vitals: { temp: 98.6 } },
        { vitals: { not_assessed: true } }
      )
    ).toBe("not_assessed");
  });

  it("is attested when the follow-up attestation is set", () => {
    expect(
      sectionState(
        "nutrition_lab",
        {},
        { nutrition_lab: { attestation: true } }
      )
    ).toBe("attested");
  });

  it("prefers not_assessed over attestation", () => {
    expect(
      sectionState(
        "nutrition_lab",
        {},
        { nutrition_lab: { attestation: true, not_assessed: true } }
      )
    ).toBe("not_assessed");
  });

  it("ignores edit metadata that carries no state", () => {
    expect(
      sectionState(
        "vitals",
        {},
        { vitals: { last_edited_by_name: "Test Nurse", attestation: false } }
      )
    ).toBe("untouched");
  });
});

describe("noteProgress", () => {
  it("counts every section of a blank initial evaluation as untouched", () => {
    expect(noteProgress("initial_evaluation", {}, {})).toEqual({
      total: 18,
      done: 0,
      untouchedKeys: SECTION_KEYS,
    });
  });

  it("only counts follow-up sections on a follow-up", () => {
    expect(noteProgress("follow_up", {}, {})).toEqual({
      total: 14,
      done: 0,
      untouchedKeys: FOLLOW_UP_KEYS,
    });
  });

  it("includes sections added to a follow-up", () => {
    const progress = noteProgress("follow_up", {}, {}, ["ros"]);
    expect(progress.total).toBe(15);
    expect(progress.untouchedKeys).toContain("ros");
  });

  it("counts started, not-assessed and attested sections as done", () => {
    const progress = noteProgress(
      "follow_up",
      { vitals: { hr: 72 } },
      {
        hpi: { not_assessed: true },
        nutrition_lab: { attestation: true },
      }
    );
    expect(progress.total).toBe(14);
    expect(progress.done).toBe(3);
    expect(progress.untouchedKeys).toEqual(
      FOLLOW_UP_KEYS.filter(
        (k) => !["vitals", "hpi", "nutrition_lab"].includes(k)
      )
    );
  });

  it("ignores content in a section the follow-up does not include", () => {
    expect(
      noteProgress("follow_up", { ros: { skin: ["new_redness"] } }, {}).done
    ).toBe(0);
  });
});

describe("summarizeSection", () => {
  it("returns an empty string for an unknown section or missing payload", () => {
    expect(summarizeSection("not_a_section", {}, {})).toBe("");
    expect(summarizeSection("hpi", {}, {})).toBe("");
  });

  it("summarises a not-assessed section regardless of content", () => {
    expect(
      summarizeSection(
        "hpi",
        { hpi: { pain: ["denies"] } },
        { hpi: { not_assessed: true } }
      )
    ).toBe("Not assessed this visit");
  });

  it.each([
    ["nutrition_lab", "No new labs since last visit"],
    ["vascular_diabetic", "No change since last visit"],
    ["vitals", "No change since last visit"],
  ])("uses the attestation label for %s", (key, label) => {
    expect(summarizeSection(key, {}, { [key]: { attestation: true } })).toBe(
      label
    );
  });

  it("lists chip answers by label in registry order", () => {
    expect(
      summarizeSection(
        "hpi",
        { hpi: { odor: ["none"], pain: ["denies"], drainage: ["none"] } },
        {}
      )
    ).toBe("Pain: Denies · Drainage: None · Odor: None");
  });

  it("joins multiple chip answers and falls back to the raw value", () => {
    expect(
      summarizeSection(
        "hpi",
        { hpi: { concerns: ["slow_healing", "legacy_value"], pain: [] } },
        {}
      )
    ).toBe("Pt/Caregiver concerns: Slow healing, legacy_value");
  });

  it("formats numbers with their unit and text with its label", () => {
    expect(
      summarizeSection(
        "vitals",
        { vitals: { temp: 98.6, bp: "  118/74 ", o2_sat: 97, hr: null } },
        {}
      )
    ).toBe("Temp 98.6°F · BP: 118/74 · O2 Sat 97%");
  });

  it("truncates long text to 60 characters and skips blank text", () => {
    expect(
      summarizeSection(
        "plan",
        { plan: { next_follow_up: `  ${"x".repeat(80)}`, frequency: "  " } },
        {}
      )
    ).toBe(`Next follow-up: ${"x".repeat(60)}`);
  });

  it("caps the summary at six answers", () => {
    const summary = summarizeSection(
      "hpi",
      {
        hpi: {
          wound_status: ["improved"],
          new_wounds: ["none"],
          pain: ["denies"],
          drainage: ["none"],
          odor: ["none"],
          bleeding: ["none"],
          concerns: ["none"],
        },
      },
      {}
    );
    expect(summary.split(" · ")).toHaveLength(6);
    expect(summary).not.toContain("Pt/Caregiver concerns");
  });

  it("summarises each wound as location and L×W×D", () => {
    expect(
      summarizeSection(
        "wound_assessment",
        {
          wound_assessment: {
            wounds: [
              {
                location: "Synthetic site A",
                length_cm: 2,
                width_cm: 1.5,
                depth_cm: 0.3,
              },
              { location: "", length_cm: 1 },
            ],
          },
        },
        {}
      )
    ).toBe("Synthetic site A 2×1.5×0.3 cm · Wound #2 1×–×– cm");
  });

  it("returns an empty string when no wounds were recorded", () => {
    expect(
      summarizeSection(
        "wound_assessment",
        { wound_assessment: { wounds: [] } },
        {}
      )
    ).toBe("");
  });
});

describe("computeReviewFlags", () => {
  const allHandled = notAssessed(SECTION_KEYS);

  it("raises no flags for a complete note with a time out", () => {
    expect(
      computeReviewFlags("initial_evaluation", {}, allHandled, [], TIME_OUT)
    ).toEqual([]);
  });

  it("flags blank sections and a missing time out", () => {
    expect(computeReviewFlags("initial_evaluation", {}, {})).toEqual([
      "18 sections blank",
      "No time out recorded",
    ]);
    expect(computeReviewFlags("follow_up", {}, {}, [], TIME_OUT)).toEqual([
      "14 sections blank",
    ]);
  });

  it("uses the singular for a single blank section", () => {
    const meta = notAssessed(SECTION_KEYS.filter((k) => k !== "plan"));
    expect(
      computeReviewFlags("initial_evaluation", {}, meta, [], TIME_OUT)
    ).toEqual(["1 section blank"]);
  });

  it.each([
    [{ graft_lot: "LOT-0001", graft_exp: "2027-01" }],
    [{ graft_product: "Synthetic graft", graft_exp: "2027-01" }],
    [{ graft_product: "Synthetic graft", graft_lot: "LOT-0001" }],
    [{ graft_product: "", graft_lot: "LOT-0001", graft_exp: "2027-01" }],
  ])("flags a performed graft missing product/lot/exp: %o", (details) => {
    expect(
      computeReviewFlags(
        "initial_evaluation",
        { procedures: { graft: ["performed"], ...details } },
        allHandled,
        [],
        TIME_OUT
      )
    ).toEqual(["Graft — verify product/lot/exp"]);
  });

  it("does not flag a fully documented or not-performed graft", () => {
    const flags = (procedures: Record<string, unknown>) =>
      computeReviewFlags(
        "initial_evaluation",
        { procedures },
        allHandled,
        [],
        TIME_OUT
      );
    expect(
      flags({
        graft: ["performed"],
        graft_product: "Synthetic graft",
        graft_lot: "LOT-0001",
        graft_exp: "2027-01",
      })
    ).toEqual([]);
    expect(flags({ graft: ["n_a"] })).toEqual([]);
  });

  it.each([
    [[{ bed_granulation_pct: 60, bed_slough_pct: 30 }], "Wound #1 bed % ≠ 100"],
    [
      [
        { bed_granulation_pct: 100 },
        { bed_slough_pct: 50, bed_eschar_pct: 60 },
      ],
      "Wound #2 bed % ≠ 100",
    ],
  ])("flags a wound bed that does not total 100%%", (wounds, flag) => {
    expect(
      computeReviewFlags(
        "initial_evaluation",
        { wound_assessment: { wounds } },
        allHandled,
        [],
        TIME_OUT
      )
    ).toEqual([flag]);
  });

  it("flags only the first wound with a bad bed total", () => {
    expect(
      computeReviewFlags(
        "initial_evaluation",
        {
          wound_assessment: {
            wounds: [{ bed_slough_pct: 10 }, { bed_eschar_pct: 10 }],
          },
        },
        allHandled,
        [],
        TIME_OUT
      )
    ).toEqual(["Wound #1 bed % ≠ 100"]);
  });

  it("does not flag wounds whose bed composition is complete or not recorded", () => {
    expect(
      computeReviewFlags(
        "initial_evaluation",
        {
          wound_assessment: {
            wounds: [
              {
                bed_granulation_pct: 50,
                bed_slough_pct: 25,
                bed_eschar_pct: 25,
              },
              { location: "Synthetic site B", bed_slough_pct: null },
            ],
          },
        },
        allHandled,
        [],
        TIME_OUT
      )
    ).toEqual([]);
  });

  it("orders flags: blank sections, graft, time out, wound bed", () => {
    const flags = computeReviewFlags(
      "follow_up",
      {
        procedures: { graft: ["performed"] },
        wound_assessment: { wounds: [{ bed_granulation_pct: 40 }] },
      },
      {}
    );
    expect(flags).toEqual([
      "12 sections blank",
      "Graft — verify product/lot/exp",
      "No time out recorded",
      "Wound #1 bed % ≠ 100",
    ]);
  });
});

describe("finalizeBlockers", () => {
  const withWound: NoteSections = {
    wound_assessment: { wounds: [{ location: "Synthetic site A" }] },
  };

  it("blocks when times and wounds are all missing", () => {
    expect(finalizeBlockers({})).toEqual({
      missingTimeIn: true,
      missingTimeOut: true,
      missingWound: true,
    });
  });

  it("clears every blocker for a timed note with a documented wound", () => {
    expect(finalizeBlockers(withWound, TIME_IN, TIME_OUT)).toEqual({
      missingTimeIn: false,
      missingTimeOut: false,
      missingWound: false,
    });
  });

  it("treats empty or null times as missing", () => {
    expect(finalizeBlockers(withWound, "", null)).toMatchObject({
      missingTimeIn: true,
      missingTimeOut: true,
    });
  });

  it("does not count blank wound cards as a documented wound", () => {
    expect(
      finalizeBlockers(
        {
          wound_assessment: {
            wounds: [{}, { location: "  ", length_cm: null, etiology: [] }],
          },
        },
        TIME_IN,
        TIME_OUT
      ).missingWound
    ).toBe(true);
  });

  it("accepts a wound documented only by a measurement", () => {
    expect(
      finalizeBlockers(
        { wound_assessment: { wounds: [{}, { width_cm: 0.5 }] } },
        TIME_IN,
        TIME_OUT
      ).missingWound
    ).toBe(false);
  });
});
