"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

// Calendar event type for React Big Calendar
export type CalendarEvent = {
  id: string;
  title: string;
  start: Date;
  end: Date;
  resource: {
    visitId: string;
    patientId: string;
    patientName: string;
    facilityId: string;
    facilityName: string;
    status: string;
    woundCount: number;
  };
};

// Validation schemas
const rescheduleVisitSchema = z.object({
  visitId: z.string().uuid(),
  visitDate: z.date(),
});

const createVisitFromCalendarSchema = z.object({
  patientId: z.string().uuid(),
  visitDate: z.date(),
  visitType: z.string().default("routine"),
  location: z.string().optional(),
  notes: z.string().optional(),
});

/**
 * Get calendar events for a date range
 * @param startDate - Start of date range
 * @param endDate - End of date range
 * @param patientId - Optional patient filter
 */
export async function getCalendarEvents(
  startDate: Date,
  endDate: Date,
  facilityId?: string,
  patientId?: string
): Promise<
  { success: true; events: CalendarEvent[] } | { success: false; error: string }
> {
  try {
    const supabase = await createClient();

    let query = supabase
      .from("visits")
      .select(
        `
        *,
        patient:patients(
          id,
          first_name,
          last_name,
          facility_id,
          facility:facilities(id, name)
  ),
  assessments:assessments(id)
      `
      )
      .gte("visit_date", startDate.toISOString())
      .lte("visit_date", endDate.toISOString())
      .order("visit_date", { ascending: true });

    if (patientId) {
      query = query.eq("patient_id", patientId);
    }

    const { data: visits, error } = await query;

    if (error) {
      throw error;
    }

    // Filter by facility if provided
    const filteredVisits = facilityId
      ? (visits || []).filter((v) => v.patient.facility_id === facilityId)
      : visits || [];

    const events: CalendarEvent[] = filteredVisits.map(
      (visit): CalendarEvent => {
        const duration = 60; // default 60 minutes
        const visitDate = new Date(visit.visit_date);
        const endDate = new Date(visitDate);
        endDate.setMinutes(endDate.getMinutes() + duration);

        return {
          id: visit.id,
          title: `${visit.patient.first_name} ${visit.patient.last_name}`,
          start: visitDate,
          end: endDate,
          resource: {
            visitId: visit.id,
            patientId: visit.patient.id,
            patientName: `${visit.patient.first_name} ${visit.patient.last_name}`,
            facilityId: visit.patient.facility?.id || null,
            facilityName: visit.patient.facility?.name || "No Facility",
            status: visit.status,
            woundCount: visit.assessments?.length || 0,
          },
        };
      }
    );

    return { success: true, events };
  } catch (error) {
    console.error("Failed to get calendar events:", error);
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "Failed to load calendar events",
    };
  }
}

/**
 * Create a new visit from calendar
 */
export async function createVisitFromCalendar(
  data: z.infer<typeof createVisitFromCalendarSchema>
) {
  try {
    const validated = createVisitFromCalendarSchema.parse(data);
    const supabase = await createClient();

    const { data: visit, error } = await supabase
      .from("visits")
      .insert({
        patient_id: validated.patientId,
        visit_date: validated.visitDate.toISOString(),
        visit_type: validated.visitType,
        location: validated.location,
        status: "incomplete",
        additional_notes: validated.notes,
      })
      .select(
        `
        *,
        patient:patients(
          first_name,
          last_name,
          facility:facilities(name)
        )
      `
      )
      .single();

    if (error) {
      throw error;
    }

    revalidatePath("/dashboard/calendar");
    revalidatePath("/dashboard/visits");

    return {
      success: true,
      visit: {
        id: visit.id,
        patientName: `${visit.patient.first_name} ${visit.patient.last_name}`,
        facilityName: visit.patient.facility?.name || "No Facility",
        visitDate: visit.visitDate,
      },
    };
  } catch (error) {
    console.error("Failed to create visit from calendar:", error);
    if (error instanceof z.ZodError) {
      return { success: false, error: error.issues[0].message };
    }
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to create visit",
    };
  }
}

/**
 * Reschedule a visit (drag-and-drop)
 */
export async function rescheduleVisit(
  data: z.infer<typeof rescheduleVisitSchema>
) {
  try {
    const validated = rescheduleVisitSchema.parse(data);
    const supabase = await createClient();

    const { data: visit, error } = await supabase
      .from("visits")
      .update({
        visit_date: validated.visitDate.toISOString(),
      })
      .eq("id", validated.visitId)
      .select(
        `
        *,
        patient:patients(first_name, last_name)
      `
      )
      .single();

    if (error) {
      throw error;
    }

    revalidatePath("/dashboard/calendar");
    revalidatePath("/dashboard/visits");

    return {
      success: true,
      visit: {
        id: visit.id,
        patientName: `${visit.patient.first_name} ${visit.patient.last_name}`,
        visitDate: new Date(visit.visit_date),
      },
    };
  } catch (error) {
    console.error("Failed to reschedule visit:", error);
    if (error instanceof z.ZodError) {
      return { success: false, error: error.issues[0].message };
    }
    return {
      success: false,
      error:
        error instanceof Error ? error.message : "Failed to reschedule visit",
    };
  }
}

/**
 * Get patients for dropdown (calendar filters)
 */
export async function getPatientsForCalendar(facilityId?: string) {
  try {
    const supabase = await createClient();

    let query = supabase
      .from("patients")
      .select("id, first_name, last_name, mrn")
      .order("last_name", { ascending: true });

    if (facilityId) {
      query = query.eq("facility_id", facilityId);
    }

    const { data: patients, error } = await query;

    if (error) {
      throw error;
    }

    return { success: true, patients: patients || [] };
  } catch (error) {
    console.error("Failed to get patients:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to load patients",
    };
  }
}

/**
 * Get facilities for dropdown (calendar filters)
 */
export async function getFacilitiesForCalendar() {
  try {
    const supabase = await createClient();

    const { data: facilities, error } = await supabase
      .from("facilities")
      .select("id, name")
      .order("name", { ascending: true });

    if (error) {
      throw error;
    }

    return { success: true, facilities: facilities || [] };
  } catch (error) {
    console.error("Failed to get facilities:", error);
    return {
      success: false,
      error:
        error instanceof Error ? error.message : "Failed to load facilities",
    };
  }
}

/**
 * Update visit status
 */
export async function updateVisitStatus(visitId: string, status: string) {
  try {
    const supabase = await createClient();

    const { error } = await supabase
      .from("visits")
      .update({
        status,
        updated_at: new Date().toISOString(),
      })
      .eq("id", visitId);

    if (error) {
      throw error;
    }

    revalidatePath("/dashboard/calendar");
    revalidatePath("/dashboard/patients");

    return { success: true };
  } catch (error) {
    console.error("Failed to update visit status:", error);
    return {
      success: false,
      error:
        error instanceof Error ? error.message : "Failed to update visit status",
    };
  }
}

/**
 * Delete visit
 */
export async function deleteVisit(visitId: string) {
  try {
    const supabase = await createClient();

    const { error } = await supabase
      .from("visits")
      .delete()
      .eq("id", visitId);

    if (error) {
      throw error;
    }

    revalidatePath("/dashboard/calendar");
    revalidatePath("/dashboard/patients");

    return { success: true };
  } catch (error) {
    console.error("Failed to delete visit:", error);
    return {
      success: false,
      error:
        error instanceof Error ? error.message : "Failed to delete visit",
    };
  }
}
