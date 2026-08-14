"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Pencil } from "lucide-react";
import { toast } from "sonner";
import { updatePatientDemographics } from "@/app/actions/field-patients";
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
import type { DirectoryPatient, FacilityOption } from "./normalize";

type ActionResult = { success?: boolean; error?: string } & Record<string, unknown>;

// The actions module is built concurrently — pin the call-site
// contract locally and read the result defensively.
const updateDemographicsAction = updatePatientDemographics as unknown as (
  patientId: string,
  patch: {
    firstName?: string;
    lastName?: string;
    dob?: string;
    mrn?: string;
  }
) => Promise<ActionResult>;

function splitNameFallback(patient: DirectoryPatient): { first: string; last: string } {
  if (patient.firstName || patient.lastName) {
    return { first: patient.firstName, last: patient.lastName };
  }
  const parts = patient.name.trim().split(/\s+/);
  return { first: parts[0] ?? "", last: parts.slice(1).join(" ") };
}

/**
 * Admin-gated edit-demographics dialog on the patient chart header.
 * The page checks getUserRole and only mounts this for office admins.
 */
export function EditDemographicsDialog({
  patient,
  facilities,
}: {
  patient: DirectoryPatient;
  facilities: FacilityOption[];
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();

  const initialName = splitNameFallback(patient);
  const [firstName, setFirstName] = useState(initialName.first);
  const [lastName, setLastName] = useState(initialName.last);
  const [dob, setDob] = useState(patient.dob ? patient.dob.slice(0, 10) : "");
  const [mrn, setMrn] = useState(patient.mrn ?? "");
  const [facilityId, setFacilityId] = useState(patient.facilityId ?? "");

  const valid = firstName.trim().length > 0 && lastName.trim().length > 0;

  function handleOpenChange(next: boolean) {
    if (pending) return;
    setOpen(next);
    if (next) {
      // Re-seed from the freshest server props each time the dialog opens.
      const name = splitNameFallback(patient);
      setFirstName(name.first);
      setLastName(name.last);
      setDob(patient.dob ? patient.dob.slice(0, 10) : "");
      setMrn(patient.mrn ?? "");
      setFacilityId(patient.facilityId ?? "");
    }
  }

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!valid || pending) return;
    startTransition(async () => {
      const patch: Parameters<typeof updateDemographicsAction>[1] = {
        firstName: firstName.trim(),
        lastName: lastName.trim(),
      };
      if (mrn.trim()) patch.mrn = mrn.trim();
      if (dob) patch.dob = dob;
      // Facility transfers are not part of updatePatientDemographics —
      // the select below is disabled and shown for reference only.
      void facilityId;

      const res = await updateDemographicsAction(patient.id, patch);
      if (!res || res.success !== true) {
        toast.error(
          res && typeof res.error === "string" ? res.error : "Failed to update demographics"
        );
        return;
      }
      toast.success("Demographics updated");
      setOpen(false);
      router.refresh();
    });
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button variant="outline" className="h-11">
          <Pencil className="h-4 w-4" aria-hidden="true" />
          Edit
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit demographics</DialogTitle>
          <DialogDescription>
            Changes apply to the chart and to future notes; finalized notes are unaffected.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="ed-first">First name</Label>
              <Input
                id="ed-first"
                className="h-11"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                autoComplete="off"
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="ed-last">Last name</Label>
              <Input
                id="ed-last"
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
              <Label htmlFor="ed-dob">Date of birth</Label>
              <Input
                id="ed-dob"
                type="date"
                className="h-11"
                value={dob}
                onChange={(e) => setDob(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="ed-mrn">MRN</Label>
              <Input
                id="ed-mrn"
                className="h-11"
                value={mrn}
                onChange={(e) => setMrn(e.target.value)}
                autoComplete="off"
              />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="ed-facility">Facility (transfers handled by admin)</Label>
            <Select value={facilityId || undefined} onValueChange={setFacilityId} disabled>
              <SelectTrigger id="ed-facility" className="h-11 w-full">
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
              {pending ? "Saving…" : "Save changes"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
