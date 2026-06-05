"use client";

import { useMemo, useState, useTransition } from "react";
import { Loader2, Plus, Save, X } from "lucide-react";
import { toast } from "sonner";

import { updateVisitEmDocumentation } from "@/app/actions/visits";
import { Button } from "@/components/ui/button";
import { CollapsibleCard } from "@/components/ui/collapsible-card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

/**
 * Phase 3 — Rx Orders tab (per Dr. May's artifact).
 *
 * Captures three buckets of orders that get appended to today's note:
 *   • Medication orders — structured rows (medication / dose / route / duration)
 *   • Nursing / wound-care orders — free-text protocol/dressing instructions
 *   • Referrals / consults — free-text specialist/consult requests
 *
 * Persisted as a JSON-encoded sub-object under
 * `visits.em_documentation.rx_orders`. Sibling tabs own their own keys
 * inside `em_documentation`, so each tab writes only its slice.
 */

type MedicationOrder = {
  medication: string;
  dose: string;
  route: string;
  duration: string;
};

type RxOrdersState = {
  medications: MedicationOrder[];
  nursingOrders: string;
  referrals: string;
};

type RxOrdersTabProps = {
  visitId: string;
  initial: { rx_orders?: string } | null;
  readOnly?: boolean;
};

const EMPTY_MED: MedicationOrder = {
  medication: "",
  dose: "",
  route: "",
  duration: "",
};

function parseInitial(raw: string | undefined): RxOrdersState {
  if (!raw) {
    return { medications: [], nursingOrders: "", referrals: "" };
  }
  try {
    const parsed = JSON.parse(raw) as Partial<{
      medications: MedicationOrder[];
      nursingOrders: string;
      referrals: string;
    }>;
    return {
      medications: Array.isArray(parsed.medications)
        ? parsed.medications.map((m) => ({
            medication: typeof m?.medication === "string" ? m.medication : "",
            dose: typeof m?.dose === "string" ? m.dose : "",
            route: typeof m?.route === "string" ? m.route : "",
            duration: typeof m?.duration === "string" ? m.duration : "",
          }))
        : [],
      nursingOrders:
        typeof parsed.nursingOrders === "string" ? parsed.nursingOrders : "",
      referrals: typeof parsed.referrals === "string" ? parsed.referrals : "",
    };
  } catch {
    // Corrupt JSON — start fresh rather than blocking the clinician.
    return { medications: [], nursingOrders: "", referrals: "" };
  }
}

export function RxOrdersTab({
  visitId,
  initial,
  readOnly = false,
}: RxOrdersTabProps) {
  const initialState = useMemo(
    () => parseInitial(initial?.rx_orders),
    [initial?.rx_orders]
  );

  const [state, setState] = useState<RxOrdersState>(initialState);
  const [draftMed, setDraftMed] = useState<MedicationOrder>(EMPTY_MED);
  const [dirty, setDirty] = useState(false);
  const [saving, startSave] = useTransition();

  const hasContent =
    state.medications.length > 0 ||
    state.nursingOrders.trim().length > 0 ||
    state.referrals.trim().length > 0;

  const handleAddMedication = () => {
    const trimmed: MedicationOrder = {
      medication: draftMed.medication.trim(),
      dose: draftMed.dose.trim(),
      route: draftMed.route.trim(),
      duration: draftMed.duration.trim(),
    };
    // Require at least a medication name — dose/route/duration are
    // commonly filled but not strictly required (e.g., "continue current").
    if (!trimmed.medication) {
      toast.error("Medication name is required");
      return;
    }
    setState((prev) => ({
      ...prev,
      medications: [...prev.medications, trimmed],
    }));
    setDraftMed(EMPTY_MED);
    setDirty(true);
  };

  const handleRemoveMedication = (index: number) => {
    setState((prev) => ({
      ...prev,
      medications: prev.medications.filter((_, i) => i !== index),
    }));
    setDirty(true);
  };

  const handleNursingChange = (value: string) => {
    setState((prev) => ({ ...prev, nursingOrders: value }));
    setDirty(true);
  };

  const handleReferralsChange = (value: string) => {
    setState((prev) => ({ ...prev, referrals: value }));
    setDirty(true);
  };

  const handleSave = () => {
    startSave(async () => {
      // The action's Zod schema is the source of truth for which keys
      // are persisted under `em_documentation`. `rx_orders` is one of
      // its accepted JSON-string fields; we serialize before sending.
      const payload = { rx_orders: JSON.stringify(state) } as Parameters<
        typeof updateVisitEmDocumentation
      >[1];
      const res = await updateVisitEmDocumentation(visitId, payload);
      if (res.error) {
        toast.error(res.error);
        return;
      }
      toast.success("Rx orders saved");
      setDirty(false);
    });
  };

  return (
    <CollapsibleCard
      title="Rx Orders"
      description="Medications, nursing/wound-care orders, and referrals for today's encounter."
      defaultOpen={hasContent}
    >
      <div className="space-y-6">
        {/* ────────────── Medication Orders ────────────── */}
        <section className="space-y-3">
          <div>
            <h3 className="text-sm font-semibold">Medication Orders</h3>
            <p className="text-muted-foreground text-xs">
              Add each medication with its dose, route, and duration.
            </p>
          </div>

          {state.medications.length > 0 ? (
            <ul className="space-y-2">
              {state.medications.map((med, idx) => (
                <li
                  key={`${med.medication}-${idx}`}
                  className="bg-muted/40 flex flex-wrap items-center gap-2 rounded-md border px-3 py-2 text-sm"
                >
                  <span className="font-medium">{med.medication}</span>
                  {med.dose && (
                    <span className="bg-background rounded-full border px-2 py-0.5 text-xs">
                      {med.dose}
                    </span>
                  )}
                  {med.route && (
                    <span className="bg-background rounded-full border px-2 py-0.5 text-xs">
                      {med.route}
                    </span>
                  )}
                  {med.duration && (
                    <span className="bg-background rounded-full border px-2 py-0.5 text-xs">
                      {med.duration}
                    </span>
                  )}
                  {!readOnly && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="ml-auto h-7 w-7"
                      onClick={() => handleRemoveMedication(idx)}
                      disabled={saving}
                      aria-label={`Remove ${med.medication}`}
                    >
                      <X className="h-3.5 w-3.5" />
                    </Button>
                  )}
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-muted-foreground text-xs italic">
              No medication orders yet.
            </p>
          )}

          {!readOnly && (
            <div className="grid gap-2 sm:grid-cols-[1.4fr_1fr_1fr_1fr_auto]">
              <div className="space-y-1">
                <Label htmlFor="rx-med-name" className="sr-only">
                  Medication
                </Label>
                <Input
                  id="rx-med-name"
                  placeholder="Medication"
                  value={draftMed.medication}
                  onChange={(e) =>
                    setDraftMed((p) => ({ ...p, medication: e.target.value }))
                  }
                  disabled={saving}
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="rx-med-dose" className="sr-only">
                  Dose
                </Label>
                <Input
                  id="rx-med-dose"
                  placeholder="Dose"
                  value={draftMed.dose}
                  onChange={(e) =>
                    setDraftMed((p) => ({ ...p, dose: e.target.value }))
                  }
                  disabled={saving}
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="rx-med-route" className="sr-only">
                  Route
                </Label>
                <Input
                  id="rx-med-route"
                  placeholder="Route"
                  value={draftMed.route}
                  onChange={(e) =>
                    setDraftMed((p) => ({ ...p, route: e.target.value }))
                  }
                  disabled={saving}
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="rx-med-duration" className="sr-only">
                  Duration
                </Label>
                <Input
                  id="rx-med-duration"
                  placeholder="Duration"
                  value={draftMed.duration}
                  onChange={(e) =>
                    setDraftMed((p) => ({ ...p, duration: e.target.value }))
                  }
                  disabled={saving}
                />
              </div>
              <Button
                type="button"
                size="sm"
                variant="secondary"
                onClick={handleAddMedication}
                disabled={saving || !draftMed.medication.trim()}
                className="gap-1 sm:self-end"
              >
                <Plus className="h-4 w-4" />
                Add
              </Button>
            </div>
          )}
        </section>

        {/* ────────────── Nursing / Wound Care Orders ────────────── */}
        <section className="space-y-2">
          <Label htmlFor="rx-nursing" className="text-sm font-semibold">
            Nursing / Wound Care Orders
          </Label>
          <Textarea
            id="rx-nursing"
            rows={4}
            placeholder="Dressing instructions, protocol..."
            value={state.nursingOrders}
            onChange={(e) => handleNursingChange(e.target.value)}
            disabled={readOnly || saving}
          />
        </section>

        {/* ────────────── Referrals / Consults ────────────── */}
        <section className="space-y-2">
          <Label htmlFor="rx-referrals" className="text-sm font-semibold">
            Referrals / Consults
          </Label>
          <Textarea
            id="rx-referrals"
            rows={4}
            placeholder="Specialist consults, vascular surgery, nutrition, etc."
            value={state.referrals}
            onChange={(e) => handleReferralsChange(e.target.value)}
            disabled={readOnly || saving}
          />
        </section>

        {!readOnly && (
          <div className="flex justify-end">
            <Button
              type="button"
              size="sm"
              onClick={handleSave}
              disabled={!dirty || saving}
              className="gap-2"
            >
              {saving ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Save className="h-4 w-4" />
              )}
              Save Rx Orders
            </Button>
          </div>
        )}
      </div>
    </CollapsibleCard>
  );
}
