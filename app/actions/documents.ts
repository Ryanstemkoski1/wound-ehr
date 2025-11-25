"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

// Type definitions
export type DocumentType =
  | "face_sheet"
  | "lab_results"
  | "radiology"
  | "insurance"
  | "referral"
  | "discharge_summary"
  | "medication_list"
  | "history_physical"
  | "progress_note"
  | "consent_form"
  | "other";

export type PatientDocument = {
  id: string;
  patient_id: string;
  document_name: string;
  document_type: DocumentType;
  document_category: string | null;
  storage_path: string;
  file_size: number;
  mime_type: string;
  document_date: string | null;
  notes: string | null;
  uploaded_by: string | null;
  uploaded_at: string;
  is_archived: boolean;
  archived_at: string | null;
  archived_by: string | null;
  uploader?: {
    name: string;
    credentials: string;
  };
};

/**
 * Upload a patient document to Supabase Storage
 */
export async function uploadPatientDocument(formData: FormData) {
  const supabase = await createClient();

  try {
    // Extract data from FormData
    const patientId = formData.get("patientId") as string;
    const file = formData.get("file") as File;
    const documentType = formData.get("documentType") as DocumentType;
    const documentCategory = formData.get("documentCategory") as string | null;
    const documentDate = formData.get("documentDate") as string | null;
    const notes = formData.get("notes") as string | null;

    if (!file || !patientId || !documentType) {
      throw new Error("Missing required fields");
    }

    // Get current user
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) throw new Error("Not authenticated");

    // Verify user has access to this patient via user_facilities
    const { data: patient, error: patientError } = await supabase
      .from("patients")
      .select("id, facility_id")
      .eq("id", patientId)
      .single();

    if (patientError || !patient) {
      throw new Error("Patient not found");
    }

    // Check user has access to this facility
    const { data: facilityAccess } = await supabase
      .from("user_facilities")
      .select("facility_id")
      .eq("facility_id", patient.facility_id)
      .eq("user_id", user.id)
      .single();

    if (!facilityAccess) {
      throw new Error("Access denied: You don't have access to this patient's facility");
    }

    // Generate unique filename
    const timestamp = Date.now();
    const sanitizedFileName = file.name.replace(/[^a-zA-Z0-9.-]/g, "_");
    const storagePath = `${patientId}/${timestamp}-${sanitizedFileName}`;

    // Upload file to Supabase Storage
    const { error: uploadError } = await supabase.storage
      .from("patient-documents")
      .upload(storagePath, file, {
        contentType: file.type,
        upsert: false,
      });

    if (uploadError) {
      console.error("Storage upload error:", uploadError);
      throw new Error(`Failed to upload file: ${uploadError.message}`);
    }

    // Create database record
    const { data: document, error: dbError } = await supabase
      .from("patient_documents")
      .insert({
        patient_id: patientId,
        document_name: file.name,
        document_type: documentType,
        document_category: documentCategory || null,
        document_date: documentDate || null,
        notes: notes || null,
        storage_path: storagePath,
        file_size: file.size,
        mime_type: file.type,
        uploaded_by: user.id,
      })
      .select()
      .single();

    if (dbError) {
      // Cleanup: Delete uploaded file if database insert fails
      await supabase.storage.from("patient-documents").remove([storagePath]);
      console.error("Database insert error:", dbError);
      throw new Error(`Failed to save document metadata: ${dbError.message}`);
    }

    revalidatePath(`/dashboard/patients/${patientId}`);
    return { success: true, document };
  } catch (error) {
    console.error("Upload patient document error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to upload document",
    };
  }
}

/**
 * Get all documents for a patient
 */
export async function getPatientDocuments(patientId: string, includeArchived = false) {
  const supabase = await createClient();

  try {
    let query = supabase
      .from("patient_documents")
      .select(
        `
        *,
        uploader:uploaded_by(name, credentials)
      `
      )
      .eq("patient_id", patientId)
      .order("uploaded_at", { ascending: false });

    if (!includeArchived) {
      query = query.eq("is_archived", false);
    }

    const { data: documents, error } = await query;

    if (error) {
      console.error("Get patient documents error:", error);
      throw error;
    }

    return { success: true, documents: documents as PatientDocument[] };
  } catch (error) {
    console.error("Get patient documents error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to fetch documents",
      documents: [],
    };
  }
}

/**
 * Get a signed URL to view/download a document
 */
export async function getDocumentSignedUrl(documentId: string) {
  const supabase = await createClient();

  try {
    // Get document metadata
    const { data: document, error: docError } = await supabase
      .from("patient_documents")
      .select("storage_path, document_name, mime_type")
      .eq("id", documentId)
      .single();

    if (docError || !document) {
      throw new Error("Document not found");
    }

    // Generate signed URL (valid for 1 hour)
    const { data: signedUrlData, error: urlError } = await supabase.storage
      .from("patient-documents")
      .createSignedUrl(document.storage_path, 3600);

    if (urlError || !signedUrlData) {
      console.error("Signed URL error:", urlError);
      throw new Error("Failed to generate document URL");
    }

    return {
      success: true,
      url: signedUrlData.signedUrl,
      documentName: document.document_name,
      mimeType: document.mime_type,
    };
  } catch (error) {
    console.error("Get document signed URL error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to get document URL",
    };
  }
}

/**
 * Archive (soft delete) a document
 */
export async function archivePatientDocument(documentId: string) {
  const supabase = await createClient();

  try {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) throw new Error("Not authenticated");

    // Get document to find patient_id for revalidation
    const { data: document } = await supabase
      .from("patient_documents")
      .select("patient_id")
      .eq("id", documentId)
      .single();

    // Update document to archived
    const { error } = await supabase
      .from("patient_documents")
      .update({ is_archived: true })
      .eq("id", documentId);

    if (error) {
      console.error("Archive document error:", error);
      throw error;
    }

    if (document) {
      revalidatePath(`/dashboard/patients/${document.patient_id}`);
    }

    return { success: true };
  } catch (error) {
    console.error("Archive document error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to archive document",
    };
  }
}

/**
 * Permanently delete a document (admin only)
 */
export async function deletePatientDocument(documentId: string) {
  const supabase = await createClient();

  try {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) throw new Error("Not authenticated");

    // Get document metadata
    const { data: document, error: docError } = await supabase
      .from("patient_documents")
      .select("storage_path, patient_id")
      .eq("id", documentId)
      .single();

    if (docError || !document) {
      throw new Error("Document not found");
    }

    // Delete from storage
    const { error: storageError } = await supabase.storage
      .from("patient-documents")
      .remove([document.storage_path]);

    if (storageError) {
      console.error("Storage delete error:", storageError);
      // Continue anyway - metadata cleanup is important
    }

    // Delete from database
    const { error: dbError } = await supabase
      .from("patient_documents")
      .delete()
      .eq("id", documentId);

    if (dbError) {
      console.error("Database delete error:", dbError);
      throw dbError;
    }

    revalidatePath(`/dashboard/patients/${document.patient_id}`);
    return { success: true };
  } catch (error) {
    console.error("Delete document error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to delete document",
    };
  }
}

/**
 * Update document metadata
 */
export async function updatePatientDocument(
  documentId: string,
  updates: {
    documentType?: DocumentType;
    documentCategory?: string;
    documentDate?: string;
    notes?: string;
  }
) {
  const supabase = await createClient();

  try {
    // Get document to find patient_id for revalidation
    const { data: document } = await supabase
      .from("patient_documents")
      .select("patient_id")
      .eq("id", documentId)
      .single();

    const { error } = await supabase
      .from("patient_documents")
      .update({
        document_type: updates.documentType,
        document_category: updates.documentCategory,
        document_date: updates.documentDate,
        notes: updates.notes,
      })
      .eq("id", documentId);

    if (error) {
      console.error("Update document error:", error);
      throw error;
    }

    if (document) {
      revalidatePath(`/dashboard/patients/${document.patient_id}`);
    }

    return { success: true };
  } catch (error) {
    console.error("Update document error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to update document",
    };
  }
}

/**
 * Get document count for a patient
 */
export async function getPatientDocumentCount(patientId: string) {
  const supabase = await createClient();

  try {
    const { data, error } = await supabase.rpc("get_patient_document_count", {
      patient_uuid: patientId,
    });

    if (error) throw error;

    return { success: true, count: data || 0 };
  } catch (error) {
    console.error("Get document count error:", error);
    return { success: false, count: 0 };
  }
}
