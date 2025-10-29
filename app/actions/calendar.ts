"use server";

import prisma from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { z } from "zod";

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
    const visits = await prisma.visit.findMany({
      where: {
        visitDate: {
          gte: startDate,
          lte: endDate,
        },
        ...(patientId && { patientId }),
      },
      include: {
        patient: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            facilityId: true,
            facility: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
        assessments: {
          select: {
            id: true,
          },
        },
      },
      orderBy: {
        visitDate: "asc",
      },
    });

    // Filter by facility if provided
    const filteredVisits = facilityId
      ? visits.filter(
          (v: (typeof visits)[number]) => v.patient.facilityId === facilityId
        )
      : visits;

    const events: CalendarEvent[] = filteredVisits.map(
      (visit: (typeof visits)[number]): CalendarEvent => {
        const duration = 60; // default 60 minutes
        const endDate = new Date(visit.visitDate);
        endDate.setMinutes(endDate.getMinutes() + duration);

        return {
          id: visit.id,
          title: `${visit.patient.firstName} ${visit.patient.lastName}`,
          start: visit.visitDate,
          end: endDate,
          resource: {
            visitId: visit.id,
            patientId: visit.patient.id,
            patientName: `${visit.patient.firstName} ${visit.patient.lastName}`,
            facilityId: visit.patient.facility.id,
            facilityName: visit.patient.facility.name,
            status: visit.status,
            woundCount: visit.assessments.length,
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

    const visit = await prisma.visit.create({
      data: {
        patientId: validated.patientId,
        visitDate: validated.visitDate,
        visitType: validated.visitType,
        location: validated.location,
        status: "incomplete",
        additionalNotes: validated.notes,
      },
      include: {
        patient: {
          select: {
            firstName: true,
            lastName: true,
            facility: {
              select: {
                name: true,
              },
            },
          },
        },
      },
    });

    revalidatePath("/dashboard/calendar");
    revalidatePath("/dashboard/visits");

    return {
      success: true,
      visit: {
        id: visit.id,
        patientName: `${visit.patient.firstName} ${visit.patient.lastName}`,
        facilityName: visit.patient.facility.name,
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

    const visit = await prisma.visit.update({
      where: { id: validated.visitId },
      data: {
        visitDate: validated.visitDate,
      },
      include: {
        patient: {
          select: {
            firstName: true,
            lastName: true,
          },
        },
      },
    });

    revalidatePath("/dashboard/calendar");
    revalidatePath("/dashboard/visits");

    return {
      success: true,
      visit: {
        id: visit.id,
        patientName: `${visit.patient.firstName} ${visit.patient.lastName}`,
        visitDate: visit.visitDate,
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
    const patients = await prisma.patient.findMany({
      where: {
        ...(facilityId && { facilityId }),
      },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        mrn: true,
      },
      orderBy: {
        lastName: "asc",
      },
    });

    return { success: true, patients };
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
    const facilities = await prisma.facility.findMany({
      select: {
        id: true,
        name: true,
      },
      orderBy: {
        name: "asc",
      },
    });

    return { success: true, facilities };
  } catch (error) {
    console.error("Failed to get facilities:", error);
    return {
      success: false,
      error:
        error instanceof Error ? error.message : "Failed to load facilities",
    };
  }
}
