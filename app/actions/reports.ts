"use server";

/**
 * Server Actions for Reporting by Criteria
 * Phase 10.2.2 - Advanced reporting with multiple filter criteria
 */

import { createClient } from "@/lib/supabase/server";

// ============================================================================
// TYPES
// ============================================================================

export type VisitLogFilters = {
  startDate: string; // ISO date string (required)
  endDate: string; // ISO date string (required)
  clinicianIds?: string[]; // Multi-select clinician filter
  facilityIds?: string[]; // Multi-select facility filter
  patientId?: string; // Single patient filter
  statuses?: string[]; // Visit status filter
  page?: number; // Pagination
  limit?: number; // Items per page
};

export type VisitLogResult = {
  id: string;
  visit_date: string;
  visit_type: string;
  status: string;
  patient: {
    id: string;
    first_name: string;
    last_name: string;
    mrn: string;
  };
  clinician: {
    id: string;
    first_name: string;
    last_name: string;
    credentials: string | null;
  } | null;
  facility: {
    id: string;
    name: string;
  };
  wound_count: number;
  assessment_count: number;
};

export type ClinicianActivityResult = {
  clinician: {
    id: string;
    first_name: string;
    last_name: string;
    credentials: string | null;
  };
  totalVisits: number;
  facilitiesBreakdown: Array<{
    facilityId: string;
    facilityName: string;
    visitCount: number;
  }>;
  statusBreakdown: Array<{
    status: string;
    count: number;
  }>;
  visitsPerWeek: Array<{
    weekStart: string;
    count: number;
  }>;
  totalWoundsAssessed: number;
};

export type FacilitySummaryResult = {
  facility: {
    id: string;
    name: string;
    address: string | null;
  };
  totalPatients: number;
  totalVisits: number;
  cliniciansBreakdown: Array<{
    clinicianId: string;
    clinicianName: string;
    credentials: string | null;
    visitCount: number;
  }>;
  avgWoundsPerVisit: number;
  statusBreakdown: Array<{
    status: string;
    count: number;
  }>;
};

// ============================================================================
// VISIT LOG REPORT
// ============================================================================

export async function getVisitLog(filters: VisitLogFilters) {
  try {
    const supabase = await createClient();
    const page = filters.page || 1;
    const limit = filters.limit || 50;
    const offset = (page - 1) * limit;

    // Build query
    let query = supabase
      .from("visits")
      .select(
        `
        id,
        visit_date,
        visit_type,
        status,
        patient:patients!inner (
          id,
          first_name,
          last_name,
          mrn,
          facility:facilities!inner (
            id,
            name
          )
        )
      `,
        { count: "exact" }
      )
      .gte("visit_date", filters.startDate)
      .lte("visit_date", filters.endDate)
      .order("visit_date", { ascending: false });

    // Apply clinician filter
    if (filters.clinicianIds && filters.clinicianIds.length > 0) {
      query = query.in("clinician_id", filters.clinicianIds);
    }

    // Apply facility filter
    if (filters.facilityIds && filters.facilityIds.length > 0) {
      query = query.in("patient.facility.id", filters.facilityIds);
    }

    // Apply patient filter
    if (filters.patientId) {
      query = query.eq("patient_id", filters.patientId);
    }

    // Apply status filter
    if (filters.statuses && filters.statuses.length > 0) {
      query = query.in("status", filters.statuses);
    }

    // Apply pagination
    query = query.range(offset, offset + limit - 1);

    const { data: visits, error, count } = await query;

    if (error) throw error;

    // Get clinician info separately (to avoid complex joins)
    const visitIds = visits?.map((v) => v.id) || [];
    const { data: clinicians } = await supabase
      .from("visits")
      .select("id, clinician_id")
      .in("id", visitIds);

    const clinicianIds =
      clinicians
        ?.map((c) => c.clinician_id)
        .filter((id): id is string => id !== null) || [];

    const { data: users } = await supabase
      .from("users")
      .select("id, first_name, last_name, credentials")
      .in("id", clinicianIds);

    // Get wound and assessment counts for each visit
    const { data: woundCounts } = await supabase
      .from("assessments")
      .select("visit_id, wound_id")
      .in("visit_id", visitIds);

    // Map results
    const results: VisitLogResult[] =
      visits?.map((visit) => {
        const clinicianId = clinicians?.find(
          (c) => c.id === visit.id
        )?.clinician_id;
        const clinician = users?.find((u) => u.id === clinicianId) || null;
        const visitWounds =
          woundCounts?.filter((wc) => wc.visit_id === visit.id) || [];
        const uniqueWounds = new Set(visitWounds.map((w) => w.wound_id));

        const patient = visit.patient as unknown as {
          id: string;
          first_name: string;
          last_name: string;
          mrn: string;
          facility: { id: string; name: string };
        };
        const facility = patient?.facility;

        return {
          id: visit.id,
          visit_date: visit.visit_date,
          visit_type: visit.visit_type,
          status: visit.status,
          patient: {
            id: patient?.id || "",
            first_name: patient?.first_name || "",
            last_name: patient?.last_name || "",
            mrn: patient?.mrn || "",
          },
          clinician: clinician
            ? {
                id: clinician.id,
                first_name: clinician.first_name,
                last_name: clinician.last_name,
                credentials: clinician.credentials,
              }
            : null,
          facility: {
            id: facility?.id || "",
            name: facility?.name || "",
          },
          wound_count: uniqueWounds.size,
          assessment_count: visitWounds.length,
        };
      }) || [];

    return {
      success: true,
      data: results,
      pagination: {
        page,
        limit,
        total: count || 0,
        totalPages: Math.ceil((count || 0) / limit),
      },
    };
  } catch (error: unknown) {
    console.error("Error fetching visit log:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

// ============================================================================
// CLINICIAN ACTIVITY REPORT
// ============================================================================

export async function getClinicianActivity(
  clinicianId: string,
  startDate: string,
  endDate: string
) {
  try {
    const supabase = await createClient();

    // Get clinician info
    const { data: clinician, error: clinicianError } = await supabase
      .from("users")
      .select("id, first_name, last_name, credentials")
      .eq("id", clinicianId)
      .single();

    if (clinicianError) throw clinicianError;

    // Get all visits for this clinician in date range
    const { data: visits, error: visitsError } = await supabase
      .from("visits")
      .select(
        `
        id,
        visit_date,
        status,
        patient:patients!inner (
          facility:facilities!inner (
            id,
            name
          )
        )
      `
      )
      .eq("clinician_id", clinicianId)
      .gte("visit_date", startDate)
      .lte("visit_date", endDate);

    if (visitsError) throw visitsError;

    // Calculate total visits
    const totalVisits = visits?.length || 0;

    // Facilities breakdown
    const facilitiesMap = new Map<string, { name: string; count: number }>();
    visits?.forEach((visit) => {
      const patient = visit.patient as unknown as {
        facility: { id: string; name: string };
      };
      const facility = patient?.facility;
      const facilityId = facility?.id;
      const facilityName = facility?.name;
      const existing = facilitiesMap.get(facilityId);
      if (existing) {
        existing.count++;
      } else {
        facilitiesMap.set(facilityId, { name: facilityName, count: 1 });
      }
    });

    const facilitiesBreakdown = Array.from(facilitiesMap).map(
      ([facilityId, data]) => ({
        facilityId,
        facilityName: data.name,
        visitCount: data.count,
      })
    );

    // Status breakdown
    const statusMap = new Map<string, number>();
    visits?.forEach((visit) => {
      const status = visit.status;
      statusMap.set(status, (statusMap.get(status) || 0) + 1);
    });

    const statusBreakdown = Array.from(statusMap).map(([status, count]) => ({
      status,
      count,
    }));

    // Visits per week
    const weeksMap = new Map<string, number>();
    visits?.forEach((visit) => {
      const date = new Date(visit.visit_date);
      // Get Monday of the week
      const dayOfWeek = date.getDay();
      const diff = date.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1);
      const monday = new Date(date.setDate(diff));
      const weekStart = monday.toISOString().split("T")[0];
      weeksMap.set(weekStart, (weeksMap.get(weekStart) || 0) + 1);
    });

    const visitsPerWeek = Array.from(weeksMap)
      .map(([weekStart, count]) => ({
        weekStart,
        count,
      }))
      .sort((a, b) => a.weekStart.localeCompare(b.weekStart));

    // Total wounds assessed
    const visitIds = visits?.map((v) => v.id) || [];
    const { data: assessments } = await supabase
      .from("assessments")
      .select("wound_id")
      .in("visit_id", visitIds);

    const uniqueWounds = new Set(assessments?.map((a) => a.wound_id) || []);
    const totalWoundsAssessed = uniqueWounds.size;

    const result: ClinicianActivityResult = {
      clinician: {
        id: clinician.id,
        first_name: clinician.first_name,
        last_name: clinician.last_name,
        credentials: clinician.credentials,
      },
      totalVisits,
      facilitiesBreakdown,
      statusBreakdown,
      visitsPerWeek,
      totalWoundsAssessed,
    };

    return { success: true, data: result };
  } catch (error: unknown) {
    console.error("Error fetching clinician activity:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

// ============================================================================
// FACILITY SUMMARY REPORT
// ============================================================================

export async function getFacilitySummary(
  facilityId: string,
  startDate: string,
  endDate: string
) {
  try {
    const supabase = await createClient();

    // Get facility info
    const { data: facility, error: facilityError } = await supabase
      .from("facilities")
      .select("id, name, address")
      .eq("id", facilityId)
      .single();

    if (facilityError) throw facilityError;

    // Get all patients for this facility
    const { data: patients } = await supabase
      .from("patients")
      .select("id")
      .eq("facility_id", facilityId);

    const patientIds = patients?.map((p) => p.id) || [];

    // Get all visits for these patients in date range
    const { data: visits, error: visitsError } = await supabase
      .from("visits")
      .select("id, visit_date, status, patient_id, clinician_id")
      .in("patient_id", patientIds)
      .gte("visit_date", startDate)
      .lte("visit_date", endDate);

    if (visitsError) throw visitsError;

    // Calculate total patients seen (unique patients with visits)
    const patientsSeen = new Set(visits?.map((v) => v.patient_id) || []);
    const totalPatients = patientsSeen.size;

    // Total visits
    const totalVisits = visits?.length || 0;

    // Get clinician info
    const clinicianIds =
      visits
        ?.map((v) => v.clinician_id)
        .filter((id): id is string => id !== null) || [];
    const uniqueClinicianIds = [...new Set(clinicianIds)];

    const { data: clinicians } = await supabase
      .from("users")
      .select("id, first_name, last_name, credentials")
      .in("id", uniqueClinicianIds);

    // Clinicians breakdown
    const cliniciansMap = new Map<string, number>();
    visits?.forEach((visit) => {
      if (visit.clinician_id) {
        cliniciansMap.set(
          visit.clinician_id,
          (cliniciansMap.get(visit.clinician_id) || 0) + 1
        );
      }
    });

    const cliniciansBreakdown = Array.from(cliniciansMap).map(
      ([clinicianId, visitCount]) => {
        const clinician = clinicians?.find((c) => c.id === clinicianId);
        return {
          clinicianId,
          clinicianName: clinician
            ? `${clinician.first_name} ${clinician.last_name}`
            : "Unknown",
          credentials: clinician?.credentials || null,
          visitCount,
        };
      }
    );

    // Status breakdown
    const statusMap = new Map<string, number>();
    visits?.forEach((visit) => {
      const status = visit.status;
      statusMap.set(status, (statusMap.get(status) || 0) + 1);
    });

    const statusBreakdown = Array.from(statusMap).map(([status, count]) => ({
      status,
      count,
    }));

    // Average wounds per visit
    const visitIds = visits?.map((v) => v.id) || [];
    const { data: assessments } = await supabase
      .from("assessments")
      .select("visit_id, wound_id")
      .in("visit_id", visitIds);

    const woundsPerVisit = new Map<string, Set<string>>();
    assessments?.forEach((a) => {
      if (!woundsPerVisit.has(a.visit_id)) {
        woundsPerVisit.set(a.visit_id, new Set());
      }
      woundsPerVisit.get(a.visit_id)?.add(a.wound_id);
    });

    const totalWounds = Array.from(woundsPerVisit.values()).reduce(
      (sum, wounds) => sum + wounds.size,
      0
    );
    const avgWoundsPerVisit = totalVisits > 0 ? totalWounds / totalVisits : 0;

    const result: FacilitySummaryResult = {
      facility: {
        id: facility.id,
        name: facility.name,
        address: facility.address,
      },
      totalPatients,
      totalVisits,
      cliniciansBreakdown,
      avgWoundsPerVisit: Math.round(avgWoundsPerVisit * 10) / 10, // Round to 1 decimal
      statusBreakdown,
    };

    return { success: true, data: result };
  } catch (error: unknown) {
    console.error("Error fetching facility summary:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

// ============================================================================
// MEDICAL RECORDS REQUEST (Single Patient)
// ============================================================================

export async function getPatientRecords(
  patientId: string,
  startDate?: string,
  endDate?: string
) {
  try {
    const supabase = await createClient();

    // Get patient info
    const { data: patient, error: patientError } = await supabase
      .from("patients")
      .select(
        `
        id,
        first_name,
        last_name,
        mrn,
        date_of_birth,
        facility:facilities (
          id,
          name
        )
      `
      )
      .eq("id", patientId)
      .single();

    if (patientError) throw patientError;

    // Build visits query
    let query = supabase
      .from("visits")
      .select(
        `
        id,
        visit_date,
        visit_type,
        status,
        visit_notes
      `
      )
      .eq("patient_id", patientId)
      .order("visit_date", { ascending: true });

    // Apply date filters if provided
    if (startDate) {
      query = query.gte("visit_date", startDate);
    }
    if (endDate) {
      query = query.lte("visit_date", endDate);
    }

    const { data: visits, error: visitsError } = await query;

    if (visitsError) throw visitsError;

    // Get assessments and wounds for each visit
    const visitIds = visits?.map((v) => v.id) || [];

    const { data: assessments } = await supabase
      .from("assessments")
      .select(
        `
        id,
        visit_id,
        wound:wounds (
          id,
          location,
          wound_type
        )
      `
      )
      .in("visit_id", visitIds);

    // Get clinicians
    const { data: visitClinicians } = await supabase
      .from("visits")
      .select("id, clinician_id")
      .in("id", visitIds);

    const clinicianIds =
      visitClinicians
        ?.map((vc) => vc.clinician_id)
        .filter((id): id is string => id !== null) || [];

    const { data: clinicians } = await supabase
      .from("users")
      .select("id, first_name, last_name, credentials")
      .in("id", clinicianIds);

    // Combine data
    const records =
      visits?.map((visit) => {
        const visitAssessments =
          assessments?.filter((a) => a.visit_id === visit.id) || [];
        const clinicianId = visitClinicians?.find(
          (vc) => vc.id === visit.id
        )?.clinician_id;
        const clinician = clinicians?.find((c) => c.id === clinicianId);

        return {
          ...visit,
          assessments: visitAssessments.map((a) => ({
            id: a.id,
            wound: a.wound,
          })),
          clinician: clinician
            ? {
                id: clinician.id,
                name: `${clinician.first_name} ${clinician.last_name}`,
                credentials: clinician.credentials,
              }
            : null,
        };
      }) || [];

    return {
      success: true,
      data: {
        patient: {
          id: patient.id,
          first_name: patient.first_name,
          last_name: patient.last_name,
          mrn: patient.mrn,
          date_of_birth: patient.date_of_birth,
          facility: patient.facility,
        },
        visits: records,
        totalVisits: records.length,
      },
    };
  } catch (error: unknown) {
    console.error("Error fetching patient records:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

// ============================================================================
// EXPORT FUNCTIONS
// ============================================================================

export async function exportVisitLogToCSV(filters: VisitLogFilters) {
  try {
    // Get all data (no pagination for export)
    const result = await getVisitLog({ ...filters, limit: 10000, page: 1 });

    if (!result.success || !result.data) {
      throw new Error(result.error || "Failed to fetch data");
    }

    // Generate CSV
    const headers = [
      "Visit Date",
      "Patient Name",
      "MRN",
      "Clinician",
      "Credentials",
      "Facility",
      "Visit Type",
      "Status",
      "Wounds",
      "Assessments",
    ];

    const rows = result.data.map((visit) => [
      visit.visit_date,
      `${visit.patient.last_name}, ${visit.patient.first_name}`,
      visit.patient.mrn,
      visit.clinician
        ? `${visit.clinician.last_name}, ${visit.clinician.first_name}`
        : "N/A",
      visit.clinician?.credentials || "",
      visit.facility.name,
      visit.visit_type,
      visit.status,
      visit.wound_count.toString(),
      visit.assessment_count.toString(),
    ]);

    const csvContent = [
      headers.join(","),
      ...rows.map((row) =>
        row.map((cell) => `"${cell.replace(/"/g, '""')}"`).join(",")
      ),
    ].join("\n");

    return { success: true, csv: csvContent };
  } catch (error: unknown) {
    console.error("Error exporting to CSV:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

export async function getAvailableCliniciansForReporting() {
  try {
    const supabase = await createClient();

    // Get all users who have conducted visits
    const { data: visitClinicians } = await supabase
      .from("visits")
      .select("clinician_id")
      .not("clinician_id", "is", null);

    const uniqueIds = [
      ...new Set(
        visitClinicians
          ?.map((v) => v.clinician_id)
          .filter((id): id is string => id !== null) || []
      ),
    ];

    const { data: clinicians, error } = await supabase
      .from("users")
      .select("id, first_name, last_name, credentials")
      .in("id", uniqueIds)
      .order("last_name");

    if (error) throw error;

    return { success: true, data: clinicians || [] };
  } catch (error: unknown) {
    console.error("Error fetching clinicians for reporting:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}
