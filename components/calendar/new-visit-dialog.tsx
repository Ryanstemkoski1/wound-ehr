"use client";

import { useState, useEffect } from "react";
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
import { toast } from "sonner";
import { format } from "date-fns";

const newVisitSchema = z.object({
  patientId: z.string().min(1, "Patient is required"),
  facilityId: z.string().min(1, "Facility is required"),
  visitDate: z.string(),
  visitTime: z.string(),
  visitType: z.string(),
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
      location: "",
      notes: "",
    },
  });

  // Reset form when dialog opens
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

  // Load patients when facility changes
  useEffect(() => {
    async function loadPatients() {
      const facilityId = form.watch("facilityId");
      if (facilityId) {
        const result = await getPatientsForCalendar(facilityId);
        if (result.success && result.patients) {
          setPatients(result.patients);
        }
      } else {
        setPatients([]);
      }
    }
    loadPatients();
  }, [form.watch("facilityId")]); // eslint-disable-line react-hooks/exhaustive-deps

  const onSubmit = async (data: NewVisitFormData) => {
    setIsSubmitting(true);
    try {
      // Combine date and time
      const visitDateTime = new Date(`${data.visitDate}T${data.visitTime}`);

      const result = await createVisitFromCalendar({
        patientId: data.patientId,
        visitDate: visitDateTime,
        visitType: data.visitType,
        location: data.location,
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
      <DialogContent className="max-w-2xl">
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
                    disabled={!form.watch("facilityId")}
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

            {/* Date and Time */}
            <div className="grid grid-cols-2 gap-4">
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
            </div>

            {/* Visit Type */}
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

            {/* Location */}
            <FormField
              control={form.control}
              name="location"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Location (optional)</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g., Room 101" {...field} />
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
