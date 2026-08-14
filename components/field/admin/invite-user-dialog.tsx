"use client";

// Invite dialog: two access presets as big radio cards, an RN/LVN
// sub-select for nurses, and a facility picker. Submits through the
// EXISTING inviteUser action (app/actions/admin.ts), whose FormData
// contract is email + role + credentials + a single facilityId — so
// the first selected facility rides on the invite as the home
// facility. For nurses, additional facilities are provisioned
// automatically by createFieldVisit the first time a visit is
// scheduled there (user_facilities is inserted by the scheduler).

import { useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Briefcase, Check, Loader2, Stethoscope, UserPlus } from "lucide-react";
import { inviteUser } from "@/app/actions/admin";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import type { FacilityOption, ViewerRole } from "./types";

type Preset = "office" | "nurse";
type NurseCredential = "RN" | "LVN";

function PresetCard({
  selected,
  disabled,
  onSelect,
  icon,
  title,
  description,
  footnote,
}: {
  selected: boolean;
  disabled?: boolean;
  onSelect: () => void;
  icon: ReactNode;
  title: string;
  description: string;
  footnote: string;
}) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={selected}
      disabled={disabled}
      onClick={onSelect}
      className={cn(
        "min-h-11 rounded-lg border p-4 text-left transition-colors",
        selected
          ? "border-primary bg-primary/5 ring-1 ring-primary"
          : "border-border bg-background hover:border-primary/40",
        disabled && "cursor-not-allowed opacity-50 hover:border-border"
      )}
    >
      <span className="flex items-center gap-2">
        <span className={cn("text-muted-foreground", selected && "text-primary")}>{icon}</span>
        <span className="font-semibold text-foreground">{title}</span>
        {selected && <Check className="ml-auto size-4 shrink-0 text-primary" />}
      </span>
      <span className="mt-1.5 block text-sm leading-snug text-muted-foreground">{description}</span>
      <span className="mt-2 block text-xs font-medium uppercase tracking-wide text-muted-foreground/80">
        {footnote}
      </span>
    </button>
  );
}

function Chip({
  selected,
  onClick,
  ariaRole,
  children,
}: {
  selected: boolean;
  onClick: () => void;
  ariaRole: "radio" | "checkbox";
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      role={ariaRole}
      aria-checked={selected}
      onClick={onClick}
      className={cn(
        "min-h-11 rounded-full border px-3 py-2 text-sm transition-colors",
        selected
          ? "border-primary bg-primary text-primary-foreground"
          : "border-border bg-background text-foreground hover:bg-accent"
      )}
    >
      {children}
    </button>
  );
}

export function InviteUserDialog({
  facilities,
  viewerRole,
}: {
  facilities: FacilityOption[];
  viewerRole: ViewerRole;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [preset, setPreset] = useState<Preset | null>(null);
  const [nurseCredential, setNurseCredential] = useState<NurseCredential>("RN");
  const [email, setEmail] = useState("");
  const [facilityIds, setFacilityIds] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);

  // inviteUser requires tenant_admin to grant the facility_admin role.
  const officeAllowed = viewerRole === "tenant_admin";

  function reset() {
    setPreset(null);
    setNurseCredential("RN");
    setEmail("");
    setFacilityIds([]);
  }

  function choosePreset(next: Preset) {
    if (next === "office" && !officeAllowed) return;
    setPreset(next);
    // Office / QA accounts belong to exactly one facility.
    if (next === "office") setFacilityIds((ids) => ids.slice(0, 1));
  }

  function toggleFacility(id: string) {
    setFacilityIds((ids) => {
      if (ids.includes(id)) return ids.filter((f) => f !== id);
      if (preset === "office") return [id];
      return [...ids, id];
    });
  }

  const emailValid = /\S+@\S+\.\S+/.test(email.trim());
  const canSubmit = preset !== null && emailValid && facilityIds.length > 0 && !submitting;
  const homeFacilityName = facilities.find((f) => f.id === facilityIds[0])?.name ?? "The first selection";

  async function handleSubmit() {
    if (!canSubmit || preset === null) return;
    setSubmitting(true);
    try {
      const formData = new FormData();
      formData.set("email", email.trim());
      formData.set("role", preset === "office" ? "facility_admin" : "user");
      formData.set("credentials", preset === "office" ? "Admin" : nurseCredential);
      formData.set("facilityId", facilityIds[0]);
      const result = await inviteUser(formData);
      if ("error" in result) {
        toast.error(result.error ?? "Failed to send the invitation");
        return;
      }
      toast.success(`Invitation sent to ${email.trim()}`);
      setOpen(false);
      reset();
      router.refresh();
    } catch {
      toast.error("Failed to send the invitation");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) reset();
      }}
    >
      <DialogTrigger asChild>
        <Button className="min-h-11">
          <UserPlus />
          Invite user
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Invite a user</DialogTitle>
          <DialogDescription>
            They receive an email link to set up their account with the right access.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5">
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Access preset
            </p>
            <div role="radiogroup" aria-label="Access preset" className="mt-2 grid gap-3 sm:grid-cols-2">
              <PresetCard
                selected={preset === "office"}
                disabled={!officeAllowed}
                onSelect={() => choosePreset("office")}
                icon={<Briefcase className="size-5" />}
                title="Office / QA"
                description="Schedules visits, preps notes, reviews and approves."
                footnote={officeAllowed ? "Office admin · Admin" : "Org admins only"}
              />
              <PresetCard
                selected={preset === "nurse"}
                onSelect={() => choosePreset("nurse")}
                icon={<Stethoscope className="size-5" />}
                title="Field Nurse"
                description="Sees their own schedule, completes and signs notes."
                footnote="Field · RN or LVN"
              />
            </div>
          </div>

          {preset === "nurse" && (
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Credential
              </p>
              <div role="radiogroup" aria-label="Nurse credential" className="mt-2 flex gap-2">
                {(["RN", "LVN"] as const).map((cred) => (
                  <Chip
                    key={cred}
                    ariaRole="radio"
                    selected={nurseCredential === cred}
                    onClick={() => setNurseCredential(cred)}
                  >
                    {cred}
                  </Chip>
                ))}
              </div>
            </div>
          )}

          <div>
            <Label htmlFor="invite-email">Email</Label>
            <Input
              id="invite-email"
              type="email"
              inputMode="email"
              autoComplete="email"
              placeholder="name@example.com"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              className="mt-2 h-11"
            />
          </div>

          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              {preset === "office" ? "Facility" : "Facilities"}
            </p>
            {facilities.length === 0 ? (
              <p className="mt-2 text-sm text-muted-foreground">
                No facilities available — add a facility before inviting users.
              </p>
            ) : (
              <div className="mt-2 flex flex-wrap gap-2">
                {facilities.map((facility) => (
                  <Chip
                    key={facility.id}
                    ariaRole={preset === "office" ? "radio" : "checkbox"}
                    selected={facilityIds.includes(facility.id)}
                    onClick={() => toggleFacility(facility.id)}
                  >
                    {facility.name}
                  </Chip>
                ))}
              </div>
            )}
            {preset === "nurse" && facilityIds.length > 1 && (
              <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
                {homeFacilityName} goes on the invite as the home facility. The others are granted
                automatically the first time a visit is scheduled for this nurse there.
              </p>
            )}
            {preset === "office" && (
              <p className="mt-2 text-xs text-muted-foreground">
                Office / QA accounts belong to one facility.
              </p>
            )}
          </div>
        </div>

        <DialogFooter className="mt-2">
          <Button
            variant="outline"
            className="min-h-11"
            onClick={() => setOpen(false)}
            disabled={submitting}
          >
            Cancel
          </Button>
          <Button className="min-h-11" onClick={handleSubmit} disabled={!canSubmit}>
            {submitting ? <Loader2 className="animate-spin" /> : <UserPlus />}
            Send invite
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
