"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Plus } from "lucide-react";
import { toast } from "sonner";
import { createFieldPatient } from "@/app/actions/field-patients";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { FacilityOption } from "./normalize";

type ActionResult = { success?: boolean; error?: string } & Record<string, unknown>;

// The actions module is built concurrently — pin the call-site
// contract locally and read the result defensively.
const createPatientAction = createFieldPatient as unknown as (input: {
  firstName: string;
  lastName: string;
  dob: string;
  mrn?: string;
  facilityId: string;
}) => Promise<ActionResult>;

/**
 * "+ New patient" dialog. Rendered only for office admins (the page
 * checks getUserRole and simply doesn't mount this otherwise).
 */
export function NewPatientDialog({ facilities }: { facilities: FacilityOption[] }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();

  const defaultFacilityId = facilities.length === 1 ? facilities[0].id : "";
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [dob, setDob] = useState("");
  const [mrn, setMrn] = useState("");
  const [facilityId, setFacilityId] = useState(defaultFacilityId);

  const valid =
    firstName.trim().length > 0 && lastName.trim().length > 0 && dob.length > 0 && facilityId.length > 0;

  function resetForm() {
    setFirstName("");
    setLastName("");
    setDob("");
    setMrn("");
    setFacilityId(defaultFacilityId);
  }

  function handleOpenChange(next: boolean) {
    if (pending) return;
    setOpen(next);
    if (next) resetForm();
  }

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!valid || pending) return;
    startTransition(async () => {
      const res = await createPatientAction({
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        dob,
        mrn: mrn.trim() || undefined,
        facilityId,
      });
      if (!res || res.success !== true) {
        toast.error(
          res && typeof res.error === "string" ? res.error : "Failed to create patient"
        );
        return;
      }
      const warnings = Array.isArray(res.warnings)
        ? res.warnings.filter((w): w is string => typeof w === "string")
        : [];
      for (const w of warnings) toast.warning(w);
      toast.success("Patient created");
      setOpen(false);
      resetForm();

      const patientRec =
        res.patient && typeof res.patient === "object" && !Array.isArray(res.patient)
          ? (res.patient as Record<string, unknown>)
          : null;
      const patientId = [res.patientId, res.id, patientRec?.id].find(
        (v): v is string => typeof v === "string" && v.length > 0
      );
      if (patientId) router.push(`/patients/${patientId}`);
      else router.refresh();
    });
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button className="h-11">
          <Plus className="h-4 w-4" aria-hidden="true" />
          New patient
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>New patient</DialogTitle>
          <DialogDescription>
            Add a patient to the directory. Leave MRN blank to auto-generate one.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="np-first">First name</Label>
              <Input
                id="np-first"
                className="h-11"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                autoComplete="off"
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="np-last">Last name</Label>
              <Input
                id="np-last"
                className="h-11"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                autoComplete="off"
                required
              />
            </div>
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="np-dob">Date of birth</Label>
              <Input
                id="np-dob"
                type="date"
                className="h-11"
                value={dob}
                onChange={(e) => setDob(e.target.value)}
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="np-mrn">MRN</Label>
              <Input
                id="np-mrn"
                className="h-11"
                value={mrn}
                onChange={(e) => setMrn(e.target.value)}
                placeholder="Auto-generate"
                autoComplete="off"
              />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="np-facility">Facility</Label>
            <Select value={facilityId || undefined} onValueChange={setFacilityId}>
              <SelectTrigger id="np-facility" className="h-11 w-full">
                <SelectValue placeholder="Select a facility" />
              </SelectTrigger>
              <SelectContent>
                {facilities.map((f) => (
                  <SelectItem key={f.id} value={f.id}>
                    {f.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {facilities.length === 0 ? (
              <p className="text-xs text-muted-foreground">
                No facilities are available to your account.
              </p>
            ) : null}
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              className="h-11"
              onClick={() => setOpen(false)}
              disabled={pending}
            >
              Cancel
            </Button>
            <Button type="submit" className="h-11" disabled={!valid || pending}>
              {pending ? "Creating…" : "Create patient"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
