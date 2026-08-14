"use client";

// Read-only field renderer for QA review mode. Renders every
// registry field with its label so Mary reads the section exactly
// as the paper form asks it — deliberately independent of the
// editor's input components.

import { WOUND_FIELDS, type FieldDef, type SectionDef } from "@/lib/field-note/registry";
import { cn } from "@/lib/utils";

type Payload = Record<string, unknown>;

interface SectionMetaLike {
  not_assessed?: boolean;
  attestation?: boolean;
}

function ChipValues({
  field,
  payload,
}: {
  field: Extract<FieldDef, { kind: "chips" }>;
  payload: Payload;
}) {
  const raw = payload[field.key];
  const values = Array.isArray(raw) ? raw.map(String) : [];
  const detailRaw = field.detail ? payload[field.detail.key] : undefined;
  const detailText = typeof detailRaw === "string" && detailRaw.trim() ? detailRaw.trim() : null;

  if (values.length === 0 && !detailText) {
    return <span className="text-muted-foreground">—</span>;
  }
  return (
    <div className="flex flex-col gap-1">
      {values.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {values.map((value) => (
            <span key={value} className="rounded-full border bg-muted/50 px-2 py-0.5 text-xs">
              {field.options.find((o) => o.value === value)?.label ?? value}
            </span>
          ))}
        </div>
      )}
      {detailText && field.detail && (
        <span className="text-sm">
          <span className="text-muted-foreground">{field.detail.label}: </span>
          {detailText}
        </span>
      )}
    </div>
  );
}

function FieldRow({ field, payload }: { field: FieldDef; payload: Payload }) {
  const value = payload[field.key];
  return (
    <div className={cn("space-y-1", field.kind === "textarea" && "sm:col-span-2")}>
      <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
        {field.label}
      </dt>
      <dd className="text-sm">
        {field.kind === "chips" ? (
          <ChipValues field={field} payload={payload} />
        ) : field.kind === "numeric" ? (
          typeof value === "number" ? (
            <span className="tabular-nums">
              {value}
              {field.unit ? ` ${field.unit}` : ""}
            </span>
          ) : (
            <span className="text-muted-foreground">—</span>
          )
        ) : typeof value === "string" && value.trim() ? (
          <span className="whitespace-pre-wrap">{value.trim()}</span>
        ) : (
          <span className="text-muted-foreground">—</span>
        )}
      </dd>
    </div>
  );
}

function FieldGrid({ fields, payload }: { fields: FieldDef[]; payload: Payload }) {
  return (
    <dl className="grid grid-cols-1 gap-x-6 gap-y-3 sm:grid-cols-2">
      {fields.map((field) => (
        <FieldRow key={field.key} field={field} payload={payload} />
      ))}
    </dl>
  );
}

export function SectionReadView({
  section,
  payload,
  meta,
}: {
  section: SectionDef;
  payload?: Payload;
  meta?: SectionMetaLike;
}) {
  if (meta?.not_assessed) {
    return <p className="text-sm text-muted-foreground">Not assessed this visit.</p>;
  }
  if (meta?.attestation) {
    return (
      <p className="text-sm">
        {section.attestationLabel ?? "No change since last visit"} — attested by the nurse.
      </p>
    );
  }

  const data = payload ?? {};

  if (section.kind === "wounds") {
    const wounds = Array.isArray(data.wounds) ? (data.wounds as Payload[]) : [];
    if (wounds.length === 0) {
      return <p className="text-sm text-muted-foreground">No wounds documented.</p>;
    }
    return (
      <div className="space-y-4">
        {wounds.map((wound, index) => (
          <div key={index} className="rounded-lg border p-4">
            <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Wound #{index + 1}
            </p>
            <FieldGrid fields={WOUND_FIELDS.fields} payload={wound} />
          </div>
        ))}
      </div>
    );
  }

  return <FieldGrid fields={section.fields} payload={data} />;
}
