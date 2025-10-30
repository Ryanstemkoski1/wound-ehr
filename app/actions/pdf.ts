"use server";

import prisma from "@/lib/prisma";

/**
 * Get complete visit data for PDF generation
 * @param visitId - ID of the visit
 * @returns Visit data or error
 */
export async function getVisitDataForPDF(visitId: string) {
  try {
    // Fetch complete visit data
    const visit = await prisma.visit.findUnique({
      where: { id: visitId },
      include: {
        patient: {
          select: {
            firstName: true,
            lastName: true,
            mrn: true,
            dob: true,
            facility: {
              select: {
                name: true,
                address: true,
                city: true,
                state: true,
                zip: true,
              },
            },
          },
        },
        assessments: {
          include: {
            wound: true,
          },
          orderBy: {
            createdAt: "desc",
          },
        },
        billings: true,
      },
    });

    if (!visit) {
      return { success: false as const, error: "Visit not found" };
    }

    // Transform data to match PDF component props
    return {
      success: true as const,
      data: {
        visit: {
          id: visit.id,
          visitDate: visit.visitDate,
          visitType: visit.visitType,
          status: visit.status,
          location: visit.location,
          notes: visit.additionalNotes,
        },
        patient: {
          firstName: visit.patient.firstName,
          lastName: visit.patient.lastName,
          dateOfBirth: visit.patient.dob,
          mrn: visit.patient.mrn,
          facility: {
            name: visit.patient.facility.name,
            address: visit.patient.facility.address || "",
            city: visit.patient.facility.city || "",
            state: visit.patient.facility.state || "",
            zipCode: visit.patient.facility.zip || "",
          },
        },
        assessments: visit.assessments.map(
          (assessment: (typeof visit.assessments)[number]) => ({
            id: assessment.id,
            wound: {
              location: assessment.wound.location,
              woundType: assessment.wound.woundType,
            },
            length: assessment.length ? Number(assessment.length) : null,
            width: assessment.width ? Number(assessment.width) : null,
            depth: assessment.depth ? Number(assessment.depth) : null,
            undermining: assessment.undermining,
            tunneling: assessment.tunneling,
            exudate: assessment.exudateAmount,
            odor: assessment.odor,
            painLevel: assessment.painLevel,
            healingStatus: assessment.healingStatus,
            treatmentplan: assessment.assessmentNotes,
          })
        ),
        billing:
          visit.billings && visit.billings.length > 0
            ? {
                cptCodes: Array.isArray(visit.billings[0].cptCodes)
                  ? (visit.billings[0].cptCodes as string[])
                  : [],
                icd10Codes: Array.isArray(visit.billings[0].icd10Codes)
                  ? (visit.billings[0].icd10Codes as string[])
                  : [],
                timeSpent: visit.billings[0].timeSpent ? 45 : null, // Convert boolean to minutes (45+ standard)
                modifiers:
                  visit.billings[0].modifiers &&
                  Array.isArray(visit.billings[0].modifiers)
                    ? (visit.billings[0].modifiers as string[])
                    : [],
              }
            : null,
      },
    };
  } catch (error) {
    console.error("Failed to get visit data:", error);
    return {
      success: false as const,
      error: error instanceof Error ? error.message : "Failed to load data",
    };
  }
}

/**
 * Get complete wound data for PDF generation
 * @param woundId - ID of the wound
 * @returns Wound data or error
 */
export async function getWoundDataForPDF(woundId: string) {
  try {
    // Fetch complete wound data with all assessments
    const wound = await prisma.wound.findUnique({
      where: { id: woundId },
      include: {
        patient: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            mrn: true,
            dob: true,
          },
        },
        assessments: {
          include: {
            photos: {
              select: {
                url: true,
                caption: true,
              },
              orderBy: {
                uploadedAt: "asc",
              },
              take: 2, // Limit to 2 photos per assessment for PDF
            },
          },
          orderBy: {
            createdAt: "desc",
          },
        },
      },
    });

    if (!wound) {
      return { success: false as const, error: "Wound not found" };
    }

    // Transform data to match PDF component props
    return {
      success: true as const,
      data: {
        wound: {
          id: wound.id,
          location: wound.location,
          woundType: wound.woundType,
          onsetDate: wound.onsetDate,
          status: wound.status,
          patient: {
            firstName: wound.patient.firstName,
            lastName: wound.patient.lastName,
            mrn: wound.patient.mrn,
            dateOfBirth: wound.patient.dob,
          },
        },
        assessments: wound.assessments.map(
          (assessment: (typeof wound.assessments)[number]) => ({
            id: assessment.id,
            createdAt: assessment.createdAt,
            length: assessment.length ? Number(assessment.length) : null,
            width: assessment.width ? Number(assessment.width) : null,
            depth: assessment.depth ? Number(assessment.depth) : null,
            area: assessment.area ? Number(assessment.area) : null,
            undermining: assessment.undermining,
            tunneling: assessment.tunneling,
            exudate: assessment.exudateAmount,
            odor: assessment.odor,
            painLevel: assessment.painLevel,
            healingStatus: assessment.healingStatus,
            treatmentplan: assessment.assessmentNotes,
            photos: assessment.photos.map(
              (photo: (typeof assessment.photos)[number]) => ({
                url: photo.url,
                caption: photo.caption,
              })
            ),
          })
        ),
      },
    };
  } catch (error) {
    console.error("Failed to get wound data:", error);
    return {
      success: false as const,
      error: error instanceof Error ? error.message : "Failed to load data",
    };
  }
}

/**
 * Generate CSV export for patient data
 * @param facilityId - Optional facility filter
 * @returns CSV string or error
 */
export async function generatePatientsCSV(
  facilityId?: string
): Promise<{ success: true; csv: string } | { success: false; error: string }> {
  try {
    const patients = await prisma.patient.findMany({
      where: facilityId ? { facilityId } : undefined,
      include: {
        facility: {
          select: {
            name: true,
          },
        },
        wounds: {
          select: {
            id: true,
            status: true,
          },
        },
      },
      orderBy: {
        lastName: "asc",
      },
    });

    // Build CSV header
    const headers = [
      "MRN",
      "First Name",
      "Last Name",
      "Date of Birth",
      "Gender",
      "Facility",
      "Active Wounds",
      "Total Wounds",
      "Status",
    ];

    // Build CSV rows
    const rows = patients.map((patient: (typeof patients)[number]) => {
      const activeWounds = patient.wounds.filter(
        (w: (typeof patient.wounds)[number]) => w.status === "active"
      ).length;
      return [
        patient.mrn,
        patient.firstName,
        patient.lastName,
        new Date(patient.dob).toLocaleDateString(),
        patient.gender || "",
        patient.facility.name,
        activeWounds.toString(),
        patient.wounds.length.toString(),
        patient.isActive ? "active" : "inactive",
      ].map((cell: string) => `"${cell}"`); // Wrap in quotes to handle commas
    });

    // Combine headers and rows
    const csv = [
      headers.join(","),
      ...rows.map((row: string[]) => row.join(",")),
    ].join("\n");

    return { success: true, csv };
  } catch (error) {
    console.error("Failed to generate patients CSV:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to generate CSV",
    };
  }
}

/**
 * Generate CSV export for wound data
 * @param patientId - Optional patient filter
 * @returns CSV string or error
 */
export async function generateWoundsCSV(
  patientId?: string
): Promise<{ success: true; csv: string } | { success: false; error: string }> {
  try {
    const wounds = await prisma.wound.findMany({
      where: patientId ? { patientId } : undefined,
      include: {
        patient: {
          select: {
            firstName: true,
            lastName: true,
            mrn: true,
          },
        },
        assessments: {
          select: {
            id: true,
          },
        },
      },
      orderBy: {
        onsetDate: "desc",
      },
    });

    // Build CSV header
    const headers = [
      "Wound ID",
      "Patient MRN",
      "Patient Name",
      "Location",
      "Wound Type",
      "Onset Date",
      "Status",
      "Total Assessments",
    ];

    // Build CSV rows
    const rows = wounds.map((wound: (typeof wounds)[number]) => {
      return [
        wound.id,
        wound.patient.mrn,
        `${wound.patient.firstName} ${wound.patient.lastName}`,
        wound.location,
        wound.woundType,
        new Date(wound.onsetDate).toLocaleDateString(),
        wound.status,
        wound.assessments.length.toString(),
      ].map((cell: string) => `"${cell}"`);
    });

    // Combine headers and rows
    const csv = [
      headers.join(","),
      ...rows.map((row: string[]) => row.join(",")),
    ].join("\n");

    return { success: true, csv };
  } catch (error) {
    console.error("Failed to generate wounds CSV:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to generate CSV",
    };
  }
}
