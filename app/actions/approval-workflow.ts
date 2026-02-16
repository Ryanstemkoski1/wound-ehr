"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

// =====================================================
// TYPES
// =====================================================

export type InboxFilters = {
  clinicianId?: string;
  facilityId?: string;
  startDate?: string;
  endDate?: string;
  searchTerm?: string;
};

type CorrectionNote = {
  note: string;
  requested_by: string;
  requested_at: string;
};

export type CorrectionVisit = {
  id: string;
  visit_date: string;
  status: string | null;
  correction_notes: CorrectionNote[] | null;
  patient: {
    id: string;
    first_name: string;
    last_name: string;
    mrn: string;
  };
};

// =====================================================
// SEND NOTE TO OFFICE
// =====================================================

export async function sendNoteToOffice(visitId: string) {
  const supabase = await createClient();

  try {
    // Update visit status to sent_to_office
    const { data, error } = await supabase
      .from("visits")
      .update({
        status: "sent_to_office",
        sent_to_office_at: new Date().toISOString(),
      })
      .eq("id", visitId)
      .select()
      .single();

    if (error) throw error;

    revalidatePath("/dashboard/patients");
    revalidatePath("/dashboard/visits");
    revalidatePath("/dashboard/admin/inbox");

    return { success: true, data };
  } catch (error) {
    console.error("Error sending note to office:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

// =====================================================
// REQUEST CORRECTION
// =====================================================

export async function requestCorrection(visitId: string, notes: string) {
  const supabase = await createClient();

  try {
    // Get current user
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) throw new Error("Not authenticated");

    // Get current correction_notes array
    const { data: visit } = await supabase
      .from("visits")
      .select("correction_notes")
      .eq("id", visitId)
      .single();

    // Append new correction note
    const currentNotes = (visit?.correction_notes as CorrectionNote[]) || [];
    const newNote: CorrectionNote = {
      note: notes,
      requested_by: user.id,
      requested_at: new Date().toISOString(),
    };

    const { data, error } = await supabase
      .from("visits")
      .update({
        status: "needs_correction",
        correction_notes: [...currentNotes, newNote],
      })
      .eq("id", visitId)
      .select()
      .single();

    if (error) throw error;

    revalidatePath("/dashboard/admin/inbox");
    revalidatePath("/dashboard/patients");

    return { success: true, data };
  } catch (error) {
    console.error("Error requesting correction:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

// =====================================================
// MARK AS CORRECTED
// =====================================================

export async function markAsCorrected(visitId: string) {
  const supabase = await createClient();

  try {
    // Update status to being_corrected first, then back to sent_to_office
    const { data, error } = await supabase
      .from("visits")
      .update({
        status: "sent_to_office",
      })
      .eq("id", visitId)
      .select()
      .single();

    if (error) throw error;

    revalidatePath("/dashboard");
    revalidatePath("/dashboard/admin/inbox");

    return { success: true, data };
  } catch (error) {
    console.error("Error marking as corrected:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

// =====================================================
// APPROVE NOTE
// =====================================================

export async function approveNote(visitId: string) {
  const supabase = await createClient();

  try {
    // Get current user
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) throw new Error("Not authenticated");

    // Verify user is admin
    const { data: userRole } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .single();

    if (
      !userRole ||
      !["tenant_admin", "facility_admin"].includes(userRole.role)
    ) {
      throw new Error("Unauthorized: Admin access required");
    }

    const { data, error } = await supabase
      .from("visits")
      .update({
        status: "approved",
        approved_at: new Date().toISOString(),
        approved_by: user.id,
      })
      .eq("id", visitId)
      .select()
      .single();

    if (error) throw error;

    revalidatePath("/dashboard/admin/inbox");
    revalidatePath("/dashboard/patients");
    revalidatePath("/dashboard/visits");

    return { success: true, data };
  } catch (error) {
    console.error("Error approving note:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

// =====================================================
// VOID NOTE
// =====================================================

export async function voidNote(visitId: string, reason: string) {
  const supabase = await createClient();

  try {
    // Get current user
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) throw new Error("Not authenticated");

    // Verify user is admin
    const { data: userRole } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .single();

    if (
      !userRole ||
      !["tenant_admin", "facility_admin"].includes(userRole.role)
    ) {
      throw new Error("Unauthorized: Admin access required");
    }

    const { data, error } = await supabase
      .from("visits")
      .update({
        status: "voided",
        voided_at: new Date().toISOString(),
        voided_by: user.id,
        void_reason: reason,
      })
      .eq("id", visitId)
      .select()
      .single();

    if (error) throw error;

    revalidatePath("/dashboard/admin/inbox");
    revalidatePath("/dashboard/patients");
    revalidatePath("/dashboard/visits");

    return { success: true, data };
  } catch (error) {
    console.error("Error voiding note:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

// =====================================================
// GET INBOX NOTES
// =====================================================

export async function getInboxNotes(filters?: InboxFilters) {
  const supabase = await createClient();

  try {
    let query = supabase
      .from("visits")
      .select(
        `
        *,
        patient:patients (
          id,
          first_name,
          last_name,
          mrn,
          facility:facilities (
            id,
            name
          )
        ),
        assessments:assessments (
          id,
          wound_id
        )
      `
      )
      .eq("status", "sent_to_office")
      .order("sent_to_office_at", { ascending: true });

    // Apply filters
    if (filters?.facilityId) {
      query = query.eq("patient.facility_id", filters.facilityId);
    }

    if (filters?.startDate) {
      query = query.gte("visit_date", filters.startDate);
    }

    if (filters?.endDate) {
      query = query.lte("visit_date", filters.endDate);
    }

    const { data, error } = await query;

    if (error) throw error;

    // Filter by search term (client-side due to nested relations)
    let filteredData = data || [];
    if (filters?.searchTerm) {
      const searchLower = filters.searchTerm.toLowerCase();
      filteredData = filteredData.filter((visit) => {
        const patientName =
          `${visit.patient?.first_name} ${visit.patient?.last_name}`.toLowerCase();
        const mrn = visit.patient?.mrn?.toLowerCase() || "";
        const clinician = visit.clinician_name?.toLowerCase() || "";

        return (
          patientName.includes(searchLower) ||
          mrn.includes(searchLower) ||
          clinician.includes(searchLower)
        );
      });
    }

    return { success: true, data: filteredData };
  } catch (error) {
    console.error("Error fetching inbox notes:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
      data: [],
    };
  }
}

// =====================================================
// GET CORRECTIONS FOR CLINICIAN
// =====================================================

export async function getCorrectionsForClinician(userId: string) {
  const supabase = await createClient();

  try {
    // Since visits don't have created_by yet (added in Phase 10.2.2),
    // we join with wound_notes to find visits where the user has created notes
    const { data, error } = await supabase
      .from("visits")
      .select(
        `
        *,
        patient:patients (
          id,
          first_name,
          last_name,
          mrn
        ),
        wound_notes!inner (
          id,
          created_by
        )
      `
      )
      .eq("wound_notes.created_by", userId)
      .eq("status", "needs_correction")
      .order("updated_at", { ascending: false });

    if (error) throw error;

    const uniqueVisits = data?.reduce<CorrectionVisit[]>((acc, visit) => {
      if (!acc.find((v) => v.id === visit.id)) {
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const { wound_notes, ...visitData } = visit;
        acc.push(visitData as CorrectionVisit);
      }
      return acc;
    }, []);

    return { success: true, data: uniqueVisits || [] };
  } catch (error) {
    console.error("Error fetching corrections:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
      data: [],
    };
  }
}

// =====================================================
// NOTIFY ADDENDUM
// =====================================================

export async function notifyAddendum(visitId: string, addendumId: string) {
  const supabase = await createClient();

  try {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) throw new Error("Not authenticated");

    const { data, error } = await supabase
      .from("addendum_notifications")
      .insert({
        visit_id: visitId,
        addendum_id: addendumId,
        created_by: user.id,
      })
      .select()
      .single();

    if (error) throw error;

    revalidatePath("/dashboard/admin/inbox");

    return { success: true, data };
  } catch (error) {
    console.error("Error creating addendum notification:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

// =====================================================
// ACKNOWLEDGE ADDENDUM
// =====================================================

export async function acknowledgeAddendum(notificationId: string) {
  const supabase = await createClient();

  try {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) throw new Error("Not authenticated");

    const { data, error } = await supabase
      .from("addendum_notifications")
      .update({
        reviewed: true,
        reviewed_by: user.id,
        reviewed_at: new Date().toISOString(),
      })
      .eq("id", notificationId)
      .select()
      .single();

    if (error) throw error;

    revalidatePath("/dashboard/admin/inbox");

    return { success: true, data };
  } catch (error) {
    console.error("Error acknowledging addendum:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}
