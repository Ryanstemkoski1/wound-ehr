"use client";

import { useState, useEffect, useCallback } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import {
  getPatientsForCalendar,
  createVisitFromCalendar,
} from "@/app/actions/calendar";
import { getUserFacilities } from "@/app/actions/facilities";
import { listServiceLocations } from "@/app/actions/service-locations";
import { getAvailableClinicians } from "@/app/actions/patient-clinicians";
import { toast } from "sonner";
import { format } from "date-fns";

const NONE_VALUE = "__none__";

const newVisitSchema = z.object({
  patientId: z.string().min(1, "Patient is required"),
  facilityId: z.string().min(1, "Facility is required"),
  visitDate: z.string(),
  visitTime: z.string(),
  visitType: z.string(),
  serviceLocationId: z.string().optional(),
  clinicianId: z.string().optional(),
  durationMinutes: z.number().int().min(5).max(480),
  location: z.string().optional(),
  notes: z.string().optional(),
});

type NewVisitFormData = z.infer<typeof newVisitSchema>;

type NewVisitDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialDate?: Date;
  onSuccess?: () => void;
};

type ServiceLocationOpt = { id: string; name: string };
type ClinicianOpt = {
  id: string;
  name: string | null;
  credentials: string | null;
};

export default function NewVisitDialog({
  open,
  onOpenChange,
  initialDate,
  onSuccess,
}: NewVisitDialogProps) {
  const [facilities, setFacilities] = useState<
    Array<{ id: string; name: string }>
  >([]);
  const [patients, setPatients] = useState<
    Array<{ id: string; first_name: string; last_name: string; mrn: string }>
  >([]);
  const [serviceLocations, setServiceLocations] = useState<
    ServiceLocationOpt[]
  >([]);
  const [clinicians, setClinicians] = useState<ClinicianOpt[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<NewVisitFormData>({
    resolver: zodResolver(newVisitSchema),
    defaultValues: {
      patientId: "",
      facilityId: "",
      visitDate: initialDate
        ? format(initialDate, "yyyy-MM-dd")
        : format(new Date(), "yyyy-MM-dd"),
      visitTime: initialDate ? format(initialDate, "HH:mm") : "09:00",
      visitType: "in_person",
      serviceLocationId: NONE_VALUE,
      clinicianId: NONE_VALUE,
      durationMinutes: 30,
      location: "",
      notes: "",
    },
  });

  // Reset form when dialog opens with a new initial date
  useEffect(() => {
    if (open && initialDate) {
      form.setValue("visitDate", format(initialDate, "yyyy-MM-dd"));
      form.setValue("visitTime", format(initialDate, "HH:mm"));
    }
  }, [open, initialDate, form]);

  // Load facilities
  useEffect(() => {
    async function loadFacilities() {
      const facilities = await getUserFacilities(true);
      setFacilities(facilities);
    }
    loadFacilities();
  }, []);

  const facilityId = form.watch("facilityId");

  // Load patients, service locations, and clinicians whenever facility changes
  const loadFacilityScopedData = useCallback(
    async (fid: string) => {
      if (!fid) {
        setPatients([]);
        setServiceLocations([]);
        setClinicians([]);
        return;
      }
      const [patientsRes, locationsRes, cliniciansRes] = await Promise.all([
        getPatientsForCalendar(fid),
        listServiceLocations(fid),
        getAvailableClinicians(fid),
      ]);

      if (patientsRes.success && patientsRes.patients) {
        setPatients(patientsRes.patients);
      } else {
        setPatients([]);
      }

      setServiceLocations(
        locationsRes.success && locationsRes.data
          ? locationsRes.data.map((l) => ({ id: l.id, name: l.name }))
          : []
      );

      setClinicians(
        cliniciansRes.success && cliniciansRes.data
          ? cliniciansRes.data.map((c) => ({
              id: c.id,
              name: c.name ?? null,
              credentials:
                (c as { credentials?: string | null }).credentials ?? null,
            }))
          : []
      );

      // Reset facility-scoped selections so we don't keep a stale id
      form.setValue("serviceLocationId", NONE_VALUE);
      form.setValue("clinicianId", NONE_VALUE);
      form.setValue("patientId", "");
    },
    [form]
  );

  useEffect(() => {
    loadFacilityScopedData(facilityId);
  }, [facilityId, loadFacilityScopedData]);

  const onSubmit = async (data: NewVisitFormData) => {
    setIsSubmitting(true);
    try {
      const visitDateTime = new Date(`${data.visitDate}T${data.visitTime}`);

      const result = await createVisitFromCalendar({
        patientId: data.patientId,
        visitDate: visitDateTime,
        visitType: data.visitType,
        location: data.location,
        serviceLocationId:
          data.serviceLocationId && data.serviceLocationId !== NONE_VALUE
            ? data.serviceLocationId
            : null,
        clinicianId:
          data.clinicianId && data.clinicianId !== NONE_VALUE
            ? data.clinicianId
            : null,
        durationMinutes: data.durationMinutes,
        notes: data.notes,
      });

      if (result.success) {
        toast.success("Visit created successfully");
        form.reset();
        onOpenChange(false);
        onSuccess?.();
      } else {
        toast.error(result.error || "Failed to create visit");
      }
    } catch (error) {
      console.error("Exception during visit creation:", error);
      toast.error(
        error instanceof Error ? error.message : "Failed to create visit"
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Schedule New Visit</DialogTitle>
          <DialogDescription>
            Create a new patient visit on the calendar.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            {/* Facility */}
            <FormField
              control={form.control}
              name="facilityId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Facility</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select facility" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {facilities.map((facility) => (
                        <SelectItem key={facility.id} value={facility.id}>
                          {facility.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Patient */}
            <FormField
              control={form.control}
              name="patientId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Patient</FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    value={field.value}
                    disabled={!facilityId}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select patient" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {patients.map((patient) => (
                        <SelectItem key={patient.id} value={patient.id}>
                          {patient.last_name}, {patient.first_name} (MRN:{" "}
                          {patient.mrn})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Clinician */}
            <FormField
              control={form.control}
              name="clinicianId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Clinician (optional)</FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    value={field.value || NONE_VALUE}
                    disabled={!facilityId}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select clinician" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value={NONE_VALUE}>Unassigned</SelectItem>
                      {clinicians.map((c) => (
                        <SelectItem key={c.id} value={c.id}>
                          {c.name || c.id}
                          {c.credentials ? ` (${c.credentials})` : ""}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Date / Time / Duration */}
            <div className="grid grid-cols-3 gap-4">
              <FormField
                control={form.control}
                name="visitDate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Date</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="visitTime"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Time</FormLabel>
                    <FormControl>
                      <Input type="time" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="durationMinutes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Duration (min)</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        min={5}
                        max={480}
                        step={5}
                        value={field.value ?? 30}
                        onChange={(e) =>
                          field.onChange(
                            e.target.value === "" ? 0 : Number(e.target.value)
                          )
                        }
                        onBlur={field.onBlur}
                        name={field.name}
                        ref={field.ref}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Visit Type + Service Location */}
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="visitType"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Visit Type</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select visit type" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="in_person">In-Person</SelectItem>
                        <SelectItem value="telemed">Telemedicine</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="serviceLocationId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Service Location</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      value={field.value || NONE_VALUE}
                      disabled={!facilityId || serviceLocations.length === 0}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue
                            placeholder={
                              serviceLocations.length === 0
                                ? "No locations configured"
                                : "Select location"
                            }
                          />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value={NONE_VALUE}>
                          Not specified
                        </SelectItem>
                        {serviceLocations.map((sl) => (
                          <SelectItem key={sl.id} value={sl.id}>
                            {sl.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Free-text location (legacy / additional detail) */}
            <FormField
              control={form.control}
              name="location"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Location detail (optional)</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g., Room 101, Bed 3" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Notes */}
            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Notes (optional)</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Any additional notes..."
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex justify-end gap-3">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? "Creating..." : "Create Visit"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
