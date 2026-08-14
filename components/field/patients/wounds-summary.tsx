import { WOUND_FIELDS, type FieldDef } from "@/lib/field-note/registry";
import { fmtDate, type WoundSummary } from "./normalize";

const etiologyField = WOUND_FIELDS.fields.find(
  (f): f is Extract<FieldDef, { kind: "chips" }> => f.kind === "chips" && f.key === "etiology"
);

function etiologyLabel(value: string): string {
  return etiologyField?.options.find((o) => o.value === value)?.label ?? value;
}

function dim(v: number | null): string {
  return v === null ? "–" : `${v}`;
}

/**
 * Read-only wounds card from the most recent approved note's
 * wound_assessment section (location + L×W×D). Server component;
 * the chart page omits it entirely when the payload carries no wounds.
 */
export function WoundsSummary({ wounds, asOf }: { wounds: WoundSummary[]; asOf: string | null }) {
  return (
    <section className="rounded-lg border border-border bg-card">
      <div className="flex items-baseline justify-between gap-2 border-b border-border px-4 py-3">
        <h2 className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Wounds</h2>
        <span className="text-xs text-muted-foreground">L × W × D, cm</span>
      </div>
      <ul className="divide-y divide-border">
        {wounds.map((w, i) => {
          const hasDims = w.lengthCm !== null || w.widthCm !== null || w.depthCm !== null;
          const etiologies = w.etiology.map(etiologyLabel).join(", ");
          return (
            <li key={i} className="px-4 py-3">
              <p className="text-sm font-medium text-foreground">
                {w.location ?? `Wound ${i + 1}`}
              </p>
              <p className="mt-0.5 text-sm text-muted-foreground">
                <span className="tabular-nums">
                  {hasDims
                    ? `${dim(w.lengthCm)} × ${dim(w.widthCm)} × ${dim(w.depthCm)} cm`
                    : "No measurements recorded"}
                </span>
                {etiologies ? <span> · {etiologies}</span> : null}
              </p>
            </li>
          );
        })}
      </ul>
      <p className="border-t border-border px-4 py-2 text-xs text-muted-foreground">
        From the last approved note{asOf ? ` · ${fmtDate(asOf)}` : ""}
      </p>
    </section>
  );
}
