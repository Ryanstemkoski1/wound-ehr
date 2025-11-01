"use server";

import { createClient } from "@/lib/supabase/server";

/**
 * Get comprehensive patient data for PDF generation
 * @param patientId - ID of the patient
 * @returns Complete patient data or error
 */
export async function getPatientDataForPDF(patientId: string) {
  try {
    const supabase = await createClient();

    // Fetch complete patient data
    const { data: patient, error: patientError } = await supabase
      .from("patients")
      .select(
        `
        *,
        facility:facilities!inner(
          name,
          address,
          city,
          state,
          zip,
          phone,
          email
        )
      `
      )
      .eq("id", patientId)
      .single();

    if (patientError || !patient) {
      return { success: false as const, error: "Patient not found" };
    }

    // Fetch all wounds
    const { data: wounds, error: woundsError } = await supabase
      .from("wounds")
      .select("*")
      .eq("patient_id", patientId)
      .order("onset_date", { ascending: false });

    if (woundsError) throw woundsError;

    // Fetch recent visits (last 10)
    const { data: visits, error: visitsError } = await supabase
      .from("visits")
      .select("*")
      .eq("patient_id", patientId)
      .order("visit_date", { ascending: false })
      .limit(10);

    if (visitsError) throw visitsError;

    // Fetch assessments for all wounds
    const woundsWithAssessments = await Promise.all(
      (wounds || []).map(async (wound) => {
        const { data: assessments } = await supabase
          .from("assessments")
          .select("*")
          .eq("wound_id", wound.id)
          .order("created_at", { ascending: false })
          .limit(5);

        // Get latest photo for each wound
        const { data: photos } = await supabase
          .from("photos")
          .select("url, uploaded_at")
          .eq("wound_id", wound.id)
          .order("uploaded_at", { ascending: false })
          .limit(1);

        return {
          ...wound,
          assessments: assessments || [],
          latestPhoto: photos && photos.length > 0 ? photos[0].url : null,
        };
      })
    );

    // Transform data to match PDF component props
    return {
      success: true as const,
      data: {
        patient: {
          id: patient.id,
          firstName: patient.first_name,
          lastName: patient.last_name,
          mrn: patient.mrn,
          dateOfBirth: patient.dob,
          gender: patient.gender,
          phone: patient.phone,
          email: patient.email,
          address: patient.address,
          city: patient.city,
          state: patient.state,
          zipCode: patient.zip,
          allergies: Array.isArray(patient.allergies)
            ? (patient.allergies as string[])
            : [],
          medicalHistory: Array.isArray(patient.medical_history)
            ? (patient.medical_history as string[])
            : [],
          insurancePrimary: patient.insurance_primary
            ? typeof patient.insurance_primary === "object"
              ? (patient.insurance_primary as Record<string, unknown>)
              : {}
            : null,
          insuranceSecondary: patient.insurance_secondary
            ? typeof patient.insurance_secondary === "object"
              ? (patient.insurance_secondary as Record<string, unknown>)
              : {}
            : null,
          emergencyContact: patient.emergency_contact
            ? typeof patient.emergency_contact === "object"
              ? (patient.emergency_contact as Record<string, unknown>)
              : {}
            : null,
        },
        facility: {
          name: patient.facility.name,
          address: patient.facility.address || "",
          city: patient.facility.city || "",
          state: patient.facility.state || "",
          zipCode: patient.facility.zip || "",
          phone: patient.facility.phone || "",
          email: patient.facility.email || "",
        },
        wounds: woundsWithAssessments.map((wound) => ({
          id: wound.id,
          location: wound.location,
          woundType: wound.wound_type,
          onsetDate: wound.onset_date,
          status: wound.status,
          woundNumber: wound.wound_number,
          latestPhoto: wound.latestPhoto,
          assessmentCount: wound.assessments.length,
          latestAssessment: wound.assessments[0]
            ? {
                createdAt: wound.assessments[0].created_at,
                length: wound.assessments[0].length
                  ? Number(wound.assessments[0].length)
                  : null,
                width: wound.assessments[0].width
                  ? Number(wound.assessments[0].width)
                  : null,
                depth: wound.assessments[0].depth
                  ? Number(wound.assessments[0].depth)
                  : null,
                healingStatus: wound.assessments[0].healing_status,
              }
            : null,
        })),
        recentVisits: (visits || []).map((visit) => ({
          id: visit.id,
          visitDate: visit.visit_date,
          visitType: visit.visit_type,
          status: visit.status,
          location: visit.location,
        })),
        summary: {
          totalWounds: wounds?.length || 0,
          activeWounds:
            wounds?.filter((w) => w.status === "active").length || 0,
          totalVisits: visits?.length || 0,
        },
      },
    };
  } catch (error) {
    console.error("Failed to get patient data:", error);
    return {
      success: false as const,
      error: error instanceof Error ? error.message : "Failed to load data",
    };
  }
}

/**
 * Get complete visit data for PDF generation
 * @param visitId - ID of the visit
 * @returns Visit data or error
 */
export async function getVisitDataForPDF(visitId: string) {
  try {
    const supabase = await createClient();

    // Fetch complete visit data
    const { data: visit, error: visitError } = await supabase
      .from("visits")
      .select(
        `
        *,
        patient:patients!inner(
          first_name,
          last_name,
          mrn,
          dob,
          facility:facilities!inner(
            name,
            address,
            city,
            state,
            zip
          )
        )
      `
      )
      .eq("id", visitId)
      .single();

    if (visitError || !visit) {
      return { success: false as const, error: "Visit not found" };
    }

    // Fetch assessments with wounds
    const { data: assessments, error: assessmentsError } = await supabase
      .from("assessments")
      .select(
        `
        *,
        wound:wounds!inner(location, wound_type)
      `
      )
      .eq("visit_id", visitId)
      .order("created_at", { ascending: false });

    if (assessmentsError) throw assessmentsError;

    // Fetch billing
    const { data: billings, error: billingsError } = await supabase
      .from("billings")
      .select("*")
      .eq("visit_id", visitId);

    if (billingsError) throw billingsError;

    // Transform data to match PDF component props
    return {
      success: true as const,
      data: {
        visit: {
          id: visit.id,
          visitDate: visit.visit_date,
          visitType: visit.visit_type,
          status: visit.status,
          location: visit.location,
          notes: visit.additional_notes,
        },
        patient: {
          firstName: visit.patient.first_name,
          lastName: visit.patient.last_name,
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
        assessments:
          assessments?.map((assessment) => ({
            id: assessment.id,
            wound: {
              location: assessment.wound.location,
              woundType: assessment.wound.wound_type,
            },
            length: assessment.length ? Number(assessment.length) : null,
            width: assessment.width ? Number(assessment.width) : null,
            depth: assessment.depth ? Number(assessment.depth) : null,
            undermining: assessment.undermining,
            tunneling: assessment.tunneling,
            exudate: assessment.exudate_amount,
            odor: assessment.odor,
            painLevel: assessment.pain_level,
            healingStatus: assessment.healing_status,
            treatmentplan: assessment.assessment_notes,
          })) || [],
        billing:
          billings && billings.length > 0
            ? {
                cptCodes: Array.isArray(billings[0].cpt_codes)
                  ? (billings[0].cpt_codes as string[])
                  : [],
                icd10Codes: Array.isArray(billings[0].icd10_codes)
                  ? (billings[0].icd10_codes as string[])
                  : [],
                timeSpent: billings[0].time_spent ? 45 : null,
                modifiers:
                  billings[0].modifiers && Array.isArray(billings[0].modifiers)
                    ? (billings[0].modifiers as string[])
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
    const supabase = await createClient();

    // Fetch complete wound data
    const { data: wound, error: woundError } = await supabase
      .from("wounds")
      .select(
        `
        *,
        patient:patients!inner(
          id,
          first_name,
          last_name,
          mrn,
          dob
        )
      `
      )
      .eq("id", woundId)
      .single();

    if (woundError || !wound) {
      return { success: false as const, error: "Wound not found" };
    }

    // Fetch assessments for this wound
    const { data: assessments, error: assessmentsError } = await supabase
      .from("assessments")
      .select("*")
      .eq("wound_id", woundId)
      .order("created_at", { ascending: false });

    if (assessmentsError) throw assessmentsError;

    // Fetch photos for each assessment (limit 2 per assessment)
    const assessmentsWithPhotos = await Promise.all(
      (assessments || []).map(async (assessment) => {
        const { data: photos } = await supabase
          .from("photos")
          .select("url, caption")
          .eq("assessment_id", assessment.id)
          .order("uploaded_at", { ascending: true })
          .limit(2);

        return {
          ...assessment,
          photos: photos || [],
        };
      })
    );

    // Transform data to match PDF component props
    return {
      success: true as const,
      data: {
        wound: {
          id: wound.id,
          location: wound.location,
          woundType: wound.wound_type,
          onsetDate: wound.onset_date,
          status: wound.status,
          patient: {
            firstName: wound.patient.first_name,
            lastName: wound.patient.last_name,
            mrn: wound.patient.mrn,
            dateOfBirth: wound.patient.dob,
          },
        },
        assessments: assessmentsWithPhotos.map((assessment) => ({
          id: assessment.id,
          createdAt: assessment.created_at,
          length: assessment.length ? Number(assessment.length) : null,
          width: assessment.width ? Number(assessment.width) : null,
          depth: assessment.depth ? Number(assessment.depth) : null,
          area: assessment.area ? Number(assessment.area) : null,
          undermining: assessment.undermining,
          tunneling: assessment.tunneling,
          exudate: assessment.exudate_amount,
          odor: assessment.odor,
          painLevel: assessment.pain_level,
          healingStatus: assessment.healing_status,
          treatmentplan: assessment.assessment_notes,
          photos: assessment.photos.map(
            (photo: { url: string; caption: string | null }) => ({
              url: photo.url,
              caption: photo.caption,
            })
          ),
        })),
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
    const supabase = await createClient();

    // Fetch patients
    let query = supabase
      .from("patients")
      .select(
        `
        mrn,
        first_name,
        last_name,
        dob,
        gender,
        is_active,
        facility:facilities!inner(name)
      `
      )
      .order("last_name", { ascending: true });

    if (facilityId) {
      query = query.eq("facility_id", facilityId);
    }

    const { data: patients, error: patientsError } = await query;
    if (patientsError) throw patientsError;

    // Fetch wound counts for each patient
    const patientsWithWounds = await Promise.all(
      (patients || []).map(async (patient) => {
        const { data: wounds } = await supabase
          .from("wounds")
          .select("id, status")
          .eq("patient_id", patient.mrn);

        const activeWounds =
          wounds?.filter((w) => w.status === "active").length || 0;
        const totalWounds = wounds?.length || 0;

        return {
          ...patient,
          activeWounds,
          totalWounds,
        };
      })
    );

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
    const rows = patientsWithWounds.map((patient) => {
      return [
        patient.mrn,
        patient.first_name,
        patient.last_name,
        new Date(patient.dob).toLocaleDateString(),
        patient.gender || "",
        Array.isArray(patient.facility) ? patient.facility[0]?.name || "" : "",
        patient.activeWounds.toString(),
        patient.totalWounds.toString(),
        patient.is_active ? "active" : "inactive",
      ].map((cell: string) => `"${cell}"`);
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
    const supabase = await createClient();

    // Fetch wounds
    let query = supabase
      .from("wounds")
      .select(
        `
        id,
        location,
        wound_type,
        onset_date,
        status,
        patient:patients!inner(first_name, last_name, mrn)
      `
      )
      .order("onset_date", { ascending: false });

    if (patientId) {
      query = query.eq("patient_id", patientId);
    }

    const { data: wounds, error: woundsError } = await query;
    if (woundsError) throw woundsError;

    // Fetch assessment counts
    const woundsWithCounts = await Promise.all(
      (wounds || []).map(async (wound) => {
        const { data: assessments } = await supabase
          .from("assessments")
          .select("id")
          .eq("wound_id", wound.id);

        return {
          ...wound,
          assessmentCount: assessments?.length || 0,
        };
      })
    );

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
    const rows = woundsWithCounts.map((wound) => {
      const patient = Array.isArray(wound.patient)
        ? wound.patient[0]
        : wound.patient;
      return [
        wound.id,
        patient?.mrn || "",
        `${patient?.first_name || ""} ${patient?.last_name || ""}`,
        wound.location,
        wound.wound_type,
        new Date(wound.onset_date).toLocaleDateString(),
        wound.status,
        wound.assessmentCount.toString(),
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
