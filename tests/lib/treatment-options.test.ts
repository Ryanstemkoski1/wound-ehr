import { describe, expect, it } from "vitest";
import {
  buildCompressionOrder,
  buildCustomOrder,
  buildEscharOrder,
  buildGraftTxOrder,
  buildOrderText,
  buildRashOrder,
  buildSkinMoistureOrder,
  buildTopicalOrder,
  EMPTY_TREATMENT_ORDER,
  migrateLegacyTab,
  TREATMENT_TAB_LABELS,
  TREATMENT_TABS,
  type TreatmentOrderData,
  type TreatmentTab,
} from "@/lib/treatment-options";

type Tabs = Omit<TreatmentOrderData, "activeTab" | "specialInstructions">;

function openWound(overrides: Partial<Tabs["openWound"]> = {}) {
  return { ...EMPTY_TREATMENT_ORDER.openWound, ...overrides };
}
function compression(overrides: Partial<Tabs["compressionNpwt"]> = {}) {
  return { ...EMPTY_TREATMENT_ORDER.compressionNpwt, ...overrides };
}
function skin(overrides: Partial<Tabs["skinMoisture"]> = {}) {
  return { ...EMPTY_TREATMENT_ORDER.skinMoisture, ...overrides };
}
function rash(overrides: Partial<Tabs["rashDermatitis"]> = {}) {
  return { ...EMPTY_TREATMENT_ORDER.rashDermatitis, ...overrides };
}

const CLEANSE_AND_DRY =
  "Cleanse the wound and periwound with normal saline or sterile water and pat dry.";

describe("migrateLegacyTab", () => {
  it("maps the legacy 'topical' tab to 'open_wound' and keeps current keys", () => {
    expect(migrateLegacyTab("topical")).toBe("open_wound");
    for (const { value } of TREATMENT_TABS) {
      expect(migrateLegacyTab(value)).toBe(value);
    }
  });
});

describe("tab metadata", () => {
  it("uses the same label for each tab in the tab list and the pill map", () => {
    const fromList = Object.fromEntries(
      TREATMENT_TABS.map((t) => [t.value, t.label])
    );
    expect(fromList).toEqual(TREATMENT_TAB_LABELS);
  });
});

describe("buildTopicalOrder (open wound)", () => {
  it("produces no order until a primary treatment is chosen", () => {
    expect(buildTopicalOrder(openWound())).toBe("");
  });

  it("builds the default daily + PRN order", () => {
    expect(buildTopicalOrder(openWound({ primaryTreatment: "xeroform" }))).toBe(
      "Cleanse wound with Saline or Sterile Water and pat dry and then loosely apply Xeroform to wound bed and cover with dry clean dressing every day and PRN."
    );
  });

  it("uses each selected option's label and appends type-box detail", () => {
    expect(
      buildTopicalOrder(
        openWound({
          cleansingAction: "irrigate",
          cleanser: "dakins_quarter",
          applicationMethod: "pack_wound",
          primaryTreatment: "iodoform_packing",
          primaryTreatmentType: "12 in.",
          coverage: "superabsorbant",
          frequency: "2",
          prn: false,
        })
      )
    ).toBe(
      "Irrigate wound with ¼ Strength Dakin's and pat dry and then pack wound bed with Iodoform Packing Tape (12 in.) to wound bed and cover with superabsorbant dressing every 2 days."
    );
  });

  it("phrases day counts, every-shift and PRN frequencies", () => {
    const phrase = (frequency: string, prn: boolean) =>
      buildTopicalOrder(
        openWound({ primaryTreatment: "santyl", frequency, prn })
      ).replace(/^.* to wound bed and cover with dry clean dressing /, "");

    expect(phrase("1", true)).toBe("every day and PRN.");
    expect(phrase("3", true)).toBe("every 3 days and PRN.");
    expect(phrase("shift", true)).toBe("every shift and PRN.");
    expect(phrase("shift", false)).toBe("every shift.");
  });

  it("appends a secondary treatment sentence with its type", () => {
    const order = buildTopicalOrder(
      openWound({
        primaryTreatment: "santyl",
        secondaryTreatment: "alginate_ag",
        secondaryTreatmentType: "rope",
      })
    );
    expect(order).toMatch(
      /every day and PRN\. Then apply Alginate Ag \(rope\) to wound bed\.$/
    );
  });

  it("falls back to the raw value for options it does not recognise", () => {
    const order = buildTopicalOrder(
      openWound({ primaryTreatment: "legacy_foam_x" })
    );
    expect(order).toContain("loosely apply legacy_foam_x to wound bed");
  });
});

describe("buildCompressionOrder", () => {
  it("produces no order without a recognised compression type", () => {
    expect(buildCompressionOrder(compression())).toBe("");
    expect(buildCompressionOrder(compression({ selectedType: "cast" }))).toBe(
      ""
    );
  });

  it("lists the selected compression garments, or generic therapy when none is picked", () => {
    expect(
      buildCompressionOrder(
        compression({
          selectedType: "compression_therapy",
          compressionItems: ["ace_wraps", "tubi_grips"],
        })
      )
    ).toBe(
      "Apply ACE Wraps, Tubi-Grips on every AM, off at HS. Remove and reapply if complaint of discomfort."
    );
    expect(
      buildCompressionOrder(
        compression({ selectedType: "compression_therapy" })
      )
    ).toBe(
      "Apply compression therapy on every AM, off at HS. Remove and reapply if complaint of discomfort."
    );
  });

  it.each([
    ["unna_boot", "UNNA boot"],
    ["layered_compression", "layered compression dressing"],
  ])(
    "describes %s application toe-to-knee with its frequency",
    (type, name) => {
      const order = buildCompressionOrder(
        compression({ selectedType: type, frequency: "3", prn: true })
      );
      expect(order.startsWith(CLEANSE_AND_DRY)).toBe(true);
      expect(order).toContain(
        `Apply ${name} from 1 inch above the toes to 1 inch below the knee in an upward direction.`
      );
      expect(order).toContain("every 3 days and PRN");
      expect(order.endsWith("Monitor daily.")).toBe(true);
    }
  );

  it("notes when the provider applied the wrap", () => {
    const order = buildCompressionOrder(
      compression({ selectedType: "unna_boot", dressingByProvider: true })
    );
    expect(
      order.endsWith("Monitor daily. Dressing applied by the provider.")
    ).toBe(true);
  });

  it("builds an NPWT order with pressure and schedule", () => {
    expect(
      buildCompressionOrder(
        compression({
          selectedType: "npwt",
          npwtPressure: "150",
          npwtSchedule: "tts",
          dressingByProvider: true,
        })
      )
    ).toBe(
      `${CLEANSE_AND_DRY} Apply negative pressure wound therapy at 150 mmHg continuous suction every Tu-Th-Sat. Dressing applied by the provider.`
    );
  });

  it("defaults NPWT to 125 mmHg and uses a free-text 'other' schedule", () => {
    const order = buildCompressionOrder(
      compression({
        selectedType: "npwt",
        npwtPressure: "",
        npwtSchedule: "other",
        npwtScheduleOther: "Monday and Thursday",
      })
    );
    expect(order).toContain(
      "at 125 mmHg continuous suction every Monday and Thursday."
    );
  });
});

describe("buildSkinMoistureOrder", () => {
  it("produces no order until a treatment is chosen", () => {
    expect(buildSkinMoistureOrder(skin())).toBe("");
  });

  it("builds a barrier-cream order with the brand/type", () => {
    expect(
      buildSkinMoistureOrder(
        skin({
          cleanser: "wound_cleanser",
          treatment: "skin_barrier_cream",
          treatmentType: "Brand A",
          frequency: "shift",
        })
      )
    ).toBe(
      "Cleanse wound with Wound Cleanser and pat dry and apply Skin Barrier Cream / Ointment (Brand A) to wound bed every shift and PRN."
    );
  });

  it("adds manufacturer change instructions for hydrocolloid and film dressings", () => {
    for (const treatment of ["hydrocolloid", "adhesive_film"]) {
      expect(buildSkinMoistureOrder(skin({ treatment }))).toMatch(
        /every day and PRN\. Follow manufacturer's recommendations\. Change as indicated and PRN\.$/
      );
    }
    expect(
      buildSkinMoistureOrder(skin({ treatment: "zinc_barrier_cream" }))
    ).not.toContain("manufacturer");
  });
});

describe("buildRashOrder", () => {
  it("produces no order until a treatment is chosen", () => {
    expect(buildRashOrder(rash())).toBe("");
  });

  it("builds the default open-to-air order", () => {
    expect(buildRashOrder(rash({ treatment: "nystatin_powder" }))).toBe(
      "To clean dry skin in the area of involvement, apply Nystatin Powder to wound bed and leave open to air every day and PRN."
    );
  });

  it("uses the free-text treatment for 'other', or the 'Other' label when blank", () => {
    expect(
      buildRashOrder(rash({ treatment: "other", treatmentOther: "Cream B" }))
    ).toContain("apply Cream B to wound bed");
    expect(
      buildRashOrder(rash({ treatment: "other", treatmentOther: "" }))
    ).toContain("apply Other to wound bed");
  });

  it("appends secondary and tertiary overlays in order", () => {
    expect(
      buildRashOrder(
        rash({
          treatment: "clotrimazole",
          coverage: "dry_clean_dressing",
          frequency: "shift",
          prn: false,
          hasSecondaryDressing: true,
          secondaryDressing: "ad_ointment",
          hasTertiaryDressing: true,
          tertiaryDressing: "miconazole_powder",
        })
      )
    ).toBe(
      "To clean dry skin in the area of involvement, apply Clotrimazole 1% Cream to wound bed and cover with dry clean dressing every shift. " +
        "Then overlay with A+D Ointment to wound bed and leave open to air. " +
        "Then overlay with Miconazole 1% Powder to wound bed and leave open to air."
    );
  });

  it("ignores an overlay unless it is both enabled and chosen", () => {
    const base = buildRashOrder(rash({ treatment: "hydrocortisone" }));
    expect(
      buildRashOrder(
        rash({
          treatment: "hydrocortisone",
          hasSecondaryDressing: true,
          secondaryDressing: "",
          hasTertiaryDressing: false,
          tertiaryDressing: "ad_ointment",
        })
      )
    ).toBe(base);
  });
});

describe("buildEscharOrder", () => {
  it("produces no order without a selection", () => {
    expect(buildEscharOrder(EMPTY_TREATMENT_ORDER.eschar)).toBe("");
  });

  it("paints betadine and leaves open to air unless a dry dressing is chosen", () => {
    expect(buildEscharOrder({ selectedOption: "paint_betadine" })).toBe(
      "Paint wound bed with betadine, allow to air dry and leave open to air daily and PRN."
    );
    expect(
      buildEscharOrder({
        selectedOption: "paint_betadine",
        paintBetadineCover: "dry_dressing",
      })
    ).toBe(
      "Paint wound bed with betadine, allow to air dry and cover with dry clean dressing daily and PRN."
    );
  });

  it("builds the keep-dry order", () => {
    expect(buildEscharOrder({ selectedOption: "keep_dry" })).toBe(
      "Keep eschar clean, dry, and intact. Monitor for signs of infection or instability daily and PRN."
    );
  });

  it("returns trimmed free text for 'other' (empty when none)", () => {
    expect(
      buildEscharOrder({
        selectedOption: "other",
        otherText: "  Offload heel. ",
      })
    ).toBe("Offload heel.");
    expect(buildEscharOrder({ selectedOption: "other" })).toBe("");
  });
});

describe("buildGraftTxOrder", () => {
  it("produces no order until an application frequency is chosen", () => {
    expect(
      buildGraftTxOrder({
        dressingChangeInterval: "7_days",
        ifSoiledDislodged: "remove_secondary",
      })
    ).toBe("");
  });

  it("phrases weekly, biweekly and as-indicated application frequencies", () => {
    const sentence = (phrase: string) =>
      `Wound evaluation, prep and membrane application by MD ${phrase} to facilitate wound healing.`;
    expect(buildGraftTxOrder({ frequency: "weekly" })).toBe(sentence("weekly"));
    expect(buildGraftTxOrder({ frequency: "biweekly" })).toBe(
      sentence("every 2 weeks")
    );
    expect(buildGraftTxOrder({ frequency: "as_indicated" })).toBe(
      sentence("as indicated")
    );
  });

  it("adds the 7-day dressing change and remove-and-notify instructions", () => {
    expect(
      buildGraftTxOrder({
        frequency: "weekly",
        dressingChangeInterval: "7_days",
        ifSoiledDislodged: "remove_secondary",
      })
    ).toBe(
      "Wound evaluation, prep and membrane application by MD weekly to facilitate wound healing. " +
        "Change dressing in 7 days. " +
        "If dressing becomes soiled or dislodged, remove secondary dressing and notify provider."
    );
  });

  it("uses a trimmed custom interval and the named re-dressing", () => {
    expect(
      buildGraftTxOrder({
        frequency: "biweekly",
        dressingChangeInterval: "custom",
        customInterval: " 5 days ",
        ifSoiledDislodged: "cleanse_apply",
        ifSoiledDressing: " foam border ",
      })
    ).toBe(
      "Wound evaluation, prep and membrane application by MD every 2 weeks to facilitate wound healing. " +
        "Change dressing in 5 days. " +
        "If dressing becomes soiled or dislodged, cleanse with normal saline and apply foam border."
    );
  });

  it("omits a blank custom interval and defaults the re-dressing to a secondary dressing", () => {
    expect(
      buildGraftTxOrder({
        frequency: "as_indicated",
        dressingChangeInterval: "custom",
        customInterval: "   ",
        ifSoiledDislodged: "cleanse_apply",
        ifSoiledDressing: "",
      })
    ).toBe(
      "Wound evaluation, prep and membrane application by MD as indicated to facilitate wound healing. " +
        "If dressing becomes soiled or dislodged, cleanse with normal saline and apply secondary dressing."
    );
  });
});

describe("buildCustomOrder", () => {
  it("returns the trimmed free-form text, or empty when missing", () => {
    expect(buildCustomOrder({ orderText: "\n  Elevate legs.  " })).toBe(
      "Elevate legs."
    );
    expect(buildCustomOrder({})).toBe("");
  });
});

describe("buildOrderText", () => {
  const filled: TreatmentOrderData = {
    ...EMPTY_TREATMENT_ORDER,
    openWound: openWound({ primaryTreatment: "hydrofiber" }),
    eschar: { selectedOption: "keep_dry" },
    compressionNpwt: compression({ selectedType: "npwt" }),
    skinMoisture: skin({ treatment: "hydrocolloid" }),
    rashDermatitis: rash({ treatment: "clobetasol" }),
    graftTx: { frequency: "weekly" },
    custom: { orderText: "Custom text" },
  };

  it("renders only the active tab's order, ignoring data on other tabs", () => {
    const expected: Record<TreatmentTab, string> = {
      open_wound: buildTopicalOrder(filled.openWound),
      eschar: buildEscharOrder(filled.eschar),
      compression_npwt: buildCompressionOrder(filled.compressionNpwt),
      skin_moisture: buildSkinMoistureOrder(filled.skinMoisture),
      rash_dermatitis: buildRashOrder(filled.rashDermatitis),
      graft_tx: buildGraftTxOrder(filled.graftTx),
      custom: buildCustomOrder(filled.custom),
    };
    // Every tab produces a distinct, non-empty order, so a wrong dispatch
    // would be caught.
    expect(new Set(Object.values(expected)).size).toBe(7);

    for (const { value: activeTab } of TREATMENT_TABS) {
      expect(buildOrderText({ ...filled, activeTab })).toBe(
        expected[activeTab]
      );
    }
  });

  it("returns an empty order for a fresh form or an unknown tab", () => {
    expect(buildOrderText(EMPTY_TREATMENT_ORDER)).toBe("");
    expect(
      buildOrderText({ ...filled, activeTab: "topical" as TreatmentTab })
    ).toBe("");
  });
});
