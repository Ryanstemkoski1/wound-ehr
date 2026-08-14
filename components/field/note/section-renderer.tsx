"use client";

// One registry SectionDef → one rendered document section.
// Standard sections map their FieldDefs straight through FieldRenderer;
// the wound section renders the per-wound card list; follow-up
// attestation sections (§12/§13) get the one-tap attestation toggle
// with the full field set underneath when not attested.

import { Fragment, useMemo } from "react";
import { format, parseISO } from "date-fns";
import { Check } from "lucide-react";
import type { FieldDef, NoteType, SectionDef } from "@/lib/field-note/registry";
import type { FieldNoteDTO } from "@/app/actions/field-notes";
import { FieldRenderer } from "@/components/field/form/field-renderer";
import { SectionShell } from "@/components/field/note/section-shell";
import { WoundSection } from "@/components/field/note/wound-section";
import { cn } from "@/lib/utils";

type MetaEntry = FieldNoteDTO["sectionsMeta"][string];

export interface SectionRendererProps {
  section: SectionDef;
  noteType: NoteType;
  payload: Record<string, unknown>;
  metaEntry: MetaEntry | undefined;
  nurseId: string | null;
  summary: string;
  collapsed: boolean;
  disabled: boolean;
  correction: string | null;
  onPatch: (patch: Record<string, unknown>) => void;
  onToggleCollapsed: () => void;
  onNotAssessed: (value: boolean) => void;
  onAttest: (value: boolean) => void;
  onInteract: () => void;
}

/** Consecutive numeric/text fields share a responsive grid; chips and textareas span full width. */
function groupFields(fields: FieldDef[]): { grid: boolean; fields: FieldDef[] }[] {
  const groups: { grid: boolean; fields: FieldDef[] }[] = [];
  for (const field of fields) {
    const grid = field.kind === "numeric" || field.kind === "text";
    const last = groups[groups.length - 1];
    if (last && last.grid === grid) last.fields.push(field);
    else groups.push({ grid, fields: [field] });
  }
  return groups;
}

export function SectionRenderer({
  section,
  noteType,
  payload,
  metaEntry,
  nurseId,
  summary,
  collapsed,
  disabled,
  correction,
  onPatch,
  onToggleCollapsed,
  onNotAssessed,
  onAttest,
  onInteract,
}: SectionRendererProps) {
  const groups = useMemo(() => groupFields(section.fields), [section]);

  const attribution =
    metaEntry?.last_edited_by_name && metaEntry.last_edited_at
      ? `${
          metaEntry.last_edited_by && nurseId && metaEntry.last_edited_by === nurseId
            ? "Edited"
            : "Pre-filled"
        } by ${metaEntry.last_edited_by_name} · ${format(parseISO(metaEntry.last_edited_at), "MMM d, h:mm a")}`
      : null;

  const attestationMode = noteType === "follow_up" && section.followUp === "attestation";
  const attested = !!metaEntry?.attestation;

  const fieldsBlock = (
    <div className="space-y-5">
      {groups.map((group, gi) =>
        group.grid ? (
          <div key={gi} className="grid grid-cols-2 gap-4 sm:grid-cols-3">
            {group.fields.map((field) => (
              <FieldRenderer
                key={field.key}
                field={field}
                payload={payload}
                disabled={disabled}
                onPatch={onPatch}
                idPrefix={section.key}
              />
            ))}
          </div>
        ) : (
          <Fragment key={gi}>
            {group.fields.map((field) => (
              <FieldRenderer
                key={field.key}
                field={field}
                payload={payload}
                disabled={disabled}
                onPatch={onPatch}
                idPrefix={section.key}
              />
            ))}
          </Fragment>
        )
      )}
    </div>
  );

  let body: React.ReactNode;
  if (section.kind === "wounds") {
    const wounds = Array.isArray(payload.wounds) ? (payload.wounds as Record<string, unknown>[]) : [];
    body = <WoundSection wounds={wounds} disabled={disabled} onChange={(next) => onPatch({ wounds: next })} />;
  } else if (attestationMode) {
    body = (
      <div className="space-y-4">
        <button
          type="button"
          disabled={disabled}
          aria-pressed={attested}
          onClick={() => onAttest(!attested)}
          className={cn(
            "flex min-h-14 w-full items-center gap-3 rounded-lg border-2 px-4 py-3 text-left text-sm font-medium transition-colors",
            attested
              ? "border-primary bg-primary/10 text-foreground"
              : "border-border bg-background hover:bg-muted",
            disabled && "pointer-events-none opacity-60"
          )}
        >
          <span
            className={cn(
              "grid size-6 shrink-0 place-items-center rounded-full border-2",
              attested ? "border-primary bg-primary text-primary-foreground" : "border-muted-foreground/40"
            )}
          >
            {attested && <Check className="size-4" />}
          </span>
          {section.attestationLabel}
        </button>
        {!attested && fieldsBlock}
      </div>
    );
  } else {
    body = fieldsBlock;
  }

  return (
    <SectionShell
      sectionKey={section.key}
      paperNumber={section.paperNumber}
      title={section.title}
      attribution={attribution}
      summary={summary}
      collapsed={collapsed}
      disabled={disabled}
      notAssessed={!!metaEntry?.not_assessed}
      showNotAssessed={section.kind !== "wounds"}
      correction={correction}
      onToggleCollapsed={onToggleCollapsed}
      onNotAssessedChange={onNotAssessed}
      onInteract={onInteract}
    >
      {body}
    </SectionShell>
  );
}
