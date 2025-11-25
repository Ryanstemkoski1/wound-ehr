// Server Actions for Electronic Signatures
// Phase 9.2: Signature capture, consent management, visit signing
"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { requiresPatientSignature as requiresPatientSig } from "@/lib/credentials";
import type { Credentials } from "@/lib/credentials";

// =====================================================
// TYPES
// =====================================================

export type SignatureType = "patient" | "provider" | "consent";
export type SignatureMethod = "draw" | "type" | "upload";
export type VisitStatus =
  | "draft"
  | "ready_for_signature"
  | "signed"
  | "submitted"
  | "incomplete"
  | "complete";

export type SignatureData = {
  signatureType: SignatureType;
  visitId?: string;
  patientId: string;
  signerName: string;
  signerRole?: string;
  signatureData: string; // Base64 image or typed name
  signatureMethod: SignatureMethod;
  ipAddress?: string;
};

export type ConsentData = {
  patientId: string;
  consentType?: string;
  consentText: string;
  patientSignatureData: string;
  patientSignerName: string;
  signatureMethod: SignatureMethod;
  witnessSignatureData?: string;
  witnessSignerName?: string;
  ipAddress?: string;
};

// =====================================================
// SIGNATURE CRUD OPERATIONS
// =====================================================

/**
 * Create a new signature record
 */
export async function createSignature(data: SignatureData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Not authenticated" };
  }

  try {
    // Validate signature data is not empty
    if (!data.signatureData || data.signatureData.trim().length === 0) {
      return { error: "Signature data is required" };
    }

    // Create signature record
    const { data: signature, error } = await supabase
      .from("signatures")
      .insert({
        signature_type: data.signatureType,
        visit_id: data.visitId,
        patient_id: data.patientId,
        signer_name: data.signerName,
        signer_role: data.signerRole,
        signature_data: data.signatureData,
        signature_method: data.signatureMethod,
        ip_address: data.ipAddress,
        created_by: user.id,
      })
      .select()
      .single();

    if (error) {
      console.error("Error creating signature:", error);
      return { error: error.message };
    }

    revalidatePath("/dashboard/patients");
    return { data: signature };
  } catch (error) {
    console.error("Exception creating signature:", error);
    return { error: "Failed to create signature" };
  }
}

/**
 * Get signature by ID
 */
export async function getSignature(signatureId: string) {
  const supabase = await createClient();

  try {
    const { data, error } = await supabase
      .from("signatures")
      .select("*")
      .eq("id", signatureId)
      .single();

    if (error) {
      console.error("Error fetching signature:", error);
      return { error: error.message };
    }

    return { data };
  } catch (error) {
    console.error("Exception fetching signature:", error);
    return { error: "Failed to fetch signature" };
  }
}

/**
 * Get all signatures for a visit
 */
export async function getVisitSignatures(visitId: string) {
  const supabase = await createClient();

  try {
    const { data, error } = await supabase
      .from("signatures")
      .select("*")
      .eq("visit_id", visitId)
      .order("created_at", { ascending: true });

    if (error) {
      console.error("Error fetching visit signatures:", error);
      return { error: error.message };
    }

    return { data };
  } catch (error) {
    console.error("Exception fetching visit signatures:", error);
    return { error: "Failed to fetch visit signatures" };
  }
}

// =====================================================
// PATIENT CONSENT OPERATIONS
// =====================================================

/**
 * Check if patient has valid consent
 */
export async function getPatientConsent(
  patientId: string,
  consentType = "initial_treatment"
) {
  const supabase = await createClient();

  try {
    const { data, error } = await supabase
      .from("patient_consents")
      .select(
        `
        *,
        patient_signature:signatures!patient_consents_patient_signature_id_fkey(*),
        witness_signature:signatures!patient_consents_witness_signature_id_fkey(*)
      `
      )
      .eq("patient_id", patientId)
      .eq("consent_type", consentType)
      .maybeSingle();

    if (error) {
      console.error("Error fetching patient consent:", error);
      return { error: error.message };
    }

    return { data };
  } catch (error) {
    console.error("Exception fetching patient consent:", error);
    return { error: "Failed to fetch patient consent" };
  }
}

/**
 * Create patient consent with signature
 */
export async function createPatientConsent(data: ConsentData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Not authenticated" };
  }

  try {
    // Create patient signature
    const patientSignatureResult = await createSignature({
      signatureType: "consent",
      patientId: data.patientId,
      signerName: data.patientSignerName,
      signerRole: "Patient",
      signatureData: data.patientSignatureData,
      signatureMethod: data.signatureMethod,
      ipAddress: data.ipAddress,
    });

    if (patientSignatureResult.error || !patientSignatureResult.data) {
      return { error: "Failed to create patient signature" };
    }

    // Create witness signature if provided
    let witnessSignatureId = null;
    if (data.witnessSignatureData && data.witnessSignerName) {
      const witnessSignatureResult = await createSignature({
        signatureType: "consent",
        patientId: data.patientId,
        signerName: data.witnessSignerName,
        signerRole: "Witness",
        signatureData: data.witnessSignatureData,
        signatureMethod: data.signatureMethod,
        ipAddress: data.ipAddress,
      });

      if (witnessSignatureResult.data) {
        witnessSignatureId = witnessSignatureResult.data.id;
      }
    }

    // Create consent record
    const { data: consent, error } = await supabase
      .from("patient_consents")
      .insert({
        patient_id: data.patientId,
        consent_type: data.consentType || "initial_treatment",
        consent_text: data.consentText,
        patient_signature_id: patientSignatureResult.data.id,
        witness_signature_id: witnessSignatureId,
        created_by: user.id,
      })
      .select()
      .single();

    if (error) {
      console.error("Error creating consent:", error);
      return { error: error.message };
    }

    revalidatePath(`/dashboard/patients/${data.patientId}`);
    return { data: consent };
  } catch (error) {
    console.error("Exception creating consent:", error);
    return { error: "Failed to create consent" };
  }
}

// =====================================================
// VISIT SIGNING WORKFLOW
// =====================================================

/**
 * Check if current user's credentials require patient signature
 */
export async function requiresPatientSignature(): Promise<boolean> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return false;

  try {
    // Use RPC function to bypass RLS
    const { data: userDataArray } = await supabase.rpc(
      "get_current_user_credentials"
    );

    if (
      !userDataArray ||
      userDataArray.length === 0 ||
      !userDataArray[0]?.credentials
    )
      return false;

    return requiresPatientSig(userDataArray[0].credentials as Credentials);
  } catch (error) {
    console.error("Error checking signature requirement:", error);
    return false;
  }
}

/**
 * Update visit status
 */
export async function updateVisitStatus(visitId: string, status: VisitStatus) {
  const supabase = await createClient();

  try {
    const { error } = await supabase
      .from("visits")
      .update({ status })
      .eq("id", visitId);

    if (error) {
      console.error("Error updating visit status:", error);
      return { error: error.message };
    }

    revalidatePath("/dashboard/patients");
    return { success: true };
  } catch (error) {
    console.error("Exception updating visit status:", error);
    return { error: "Failed to update visit status" };
  }
}

/**
 * Sign visit as provider (clinician)
 */
export async function signVisit(
  visitId: string,
  signatureData: string,
  signerName: string,
  signatureMethod: SignatureMethod,
  ipAddress?: string
) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Not authenticated" };
  }

  try {
    // Get visit details
    const { data: visit, error: visitError } = await supabase
      .from("visits")
      .select("id, patient_id, status")
      .eq("id", visitId)
      .single();

    if (visitError || !visit) {
      return { error: "Visit not found" };
    }

    // Check if visit is in correct status
    if (visit.status !== "draft" && visit.status !== "ready_for_signature") {
      return { error: "Visit cannot be signed in current status" };
    }

    // Get user credentials using function to bypass RLS recursion
    const { data: userDataArray, error: userError } = await supabase.rpc(
      "get_current_user_credentials"
    );

    if (userError) {
      console.error("Database error fetching user credentials:", userError);
      return { error: `Database error: ${userError.message}` };
    }

    if (!userDataArray || userDataArray.length === 0) {
      console.error("No user data returned for user ID:", user.id);
      return { error: "User record not found. Please contact admin." };
    }

    const userData = userDataArray[0];

    if (!userData.credentials) {
      console.error("User has no credentials set:", user.id);
      return {
        error:
          "User credentials not set. Please contact admin to set your credentials.",
      };
    }

    // Create provider signature
    const signatureResult = await createSignature({
      signatureType: "provider",
      visitId,
      patientId: visit.patient_id,
      signerName,
      signerRole: userData.credentials,
      signatureData,
      signatureMethod,
      ipAddress,
    });

    if (signatureResult.error || !signatureResult.data) {
      return { error: "Failed to create provider signature" };
    }

    // Update visit with signature and status
    const requiresPatient = requiresPatientSig(
      userData.credentials as Credentials
    );
    const newStatus = requiresPatient ? "signed" : "signed"; // Can submit immediately if no patient sig needed

    const { error: updateError } = await supabase
      .from("visits")
      .update({
        provider_signature_id: signatureResult.data.id,
        status: newStatus,
        clinician_name: userData.name || signerName,
        clinician_credentials: userData.credentials,
      })
      .eq("id", visitId);

    if (updateError) {
      console.error("Error updating visit with signature:", updateError);
      return { error: "Failed to update visit" };
    }

    revalidatePath("/dashboard/patients");
    return { success: true, requiresPatientSignature: requiresPatient };
  } catch (error) {
    console.error("Exception signing visit:", error);
    return { error: "Failed to sign visit" };
  }
}

/**
 * Add patient signature to visit (for RN/LVN visits)
 */
export async function addPatientSignature(
  visitId: string,
  signatureData: string,
  signerName: string,
  signatureMethod: SignatureMethod,
  ipAddress?: string
) {
  const supabase = await createClient();

  try {
    // Get visit details
    const { data: visit, error: visitError } = await supabase
      .from("visits")
      .select("id, patient_id, status, requires_patient_signature")
      .eq("id", visitId)
      .single();

    if (visitError || !visit) {
      return { error: "Visit not found" };
    }

    // Verify patient signature is required
    if (!visit.requires_patient_signature) {
      return { error: "Patient signature not required for this visit" };
    }

    // Create patient signature
    const signatureResult = await createSignature({
      signatureType: "patient",
      visitId,
      patientId: visit.patient_id,
      signerName,
      signerRole: "Patient",
      signatureData,
      signatureMethod,
      ipAddress,
    });

    if (signatureResult.error || !signatureResult.data) {
      return { error: "Failed to create patient signature" };
    }

    // Update visit with patient signature
    const { error: updateError } = await supabase
      .from("visits")
      .update({
        patient_signature_id: signatureResult.data.id,
      })
      .eq("id", visitId);

    if (updateError) {
      console.error(
        "Error updating visit with patient signature:",
        updateError
      );
      return { error: "Failed to update visit" };
    }

    revalidatePath("/dashboard/patients");
    return { success: true };
  } catch (error) {
    console.error("Exception adding patient signature:", error);
    return { error: "Failed to add patient signature" };
  }
}

/**
 * Submit visit to office (final step)
 */
export async function submitVisit(visitId: string) {
  const supabase = await createClient();

  try {
    // Get visit details
    const { data: visit, error: visitError } = await supabase
      .from("visits")
      .select(
        "id, provider_signature_id, patient_signature_id, requires_patient_signature"
      )
      .eq("id", visitId)
      .single();

    if (visitError || !visit) {
      return { error: "Visit not found" };
    }

    // Verify provider signature exists
    if (!visit.provider_signature_id) {
      return { error: "Provider signature required before submission" };
    }

    // Verify patient signature if required
    if (visit.requires_patient_signature && !visit.patient_signature_id) {
      return { error: "Patient signature required before submission" };
    }

    // Update visit status to submitted
    const { error: updateError } = await supabase
      .from("visits")
      .update({ status: "submitted" })
      .eq("id", visitId);

    if (updateError) {
      console.error("Error submitting visit:", updateError);
      return { error: "Failed to submit visit" };
    }

    revalidatePath("/dashboard/patients");
    return { success: true };
  } catch (error) {
    console.error("Exception submitting visit:", error);
    return { error: "Failed to submit visit" };
  }
}

/**
 * Get client IP address (helper for audit trail)
 */
export async function getClientIpAddress(): Promise<string | null> {
  // In production, you'd extract this from headers
  // For now, return null and handle on client side
  return null;
}

// =====================================================
// SCANNED CONSENT UPLOAD (Phase 9.3.5)
// =====================================================

export type UploadConsentData = {
  patientId: string;
  patientName: string;
  file: File;
  consentType?: string;
  consentText?: string;
};

/**
 * Upload a scanned consent document (PDF or image)
 * Creates consent record with document reference instead of signature
 */
export async function uploadScannedConsent(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Not authenticated" };
  }

  try {
    const patientId = formData.get("patientId") as string;
    const patientName = formData.get("patientName") as string;
    const consentType =
      (formData.get("consentType") as string) || "initial_treatment";
    const consentText =
      (formData.get("consentText") as string) || "Scanned paper consent form";
    const file = formData.get("file") as File;

    if (!patientId || !file) {
      return { error: "Missing required fields" };
    }

    // Validate file type
    const allowedTypes = [
      "application/pdf",
      "image/jpeg",
      "image/jpg",
      "image/png",
    ];
    if (!allowedTypes.includes(file.type)) {
      return {
        error: "Invalid file type. Please upload PDF, JPG, or PNG files only.",
      };
    }

    // Validate file size (10MB max)
    const maxSize = 10 * 1024 * 1024; // 10MB in bytes
    if (file.size > maxSize) {
      return { error: "File too large. Maximum size is 10MB." };
    }

    // Generate unique filename
    const timestamp = Date.now();
    const fileExt = file.name.split(".").pop();
    const fileName = `${patientId}/${timestamp}-consent.${fileExt}`;

    // Upload to Supabase Storage
    const { error: uploadError } = await supabase.storage
      .from("patient-consents")
      .upload(fileName, file, {
        contentType: file.type,
        upsert: false,
      });

    if (uploadError) {
      console.error("Error uploading file:", uploadError);
      return { error: "Failed to upload file: " + uploadError.message };
    }

    // Store the file path (not URL) for private buckets
    // We'll generate signed URLs when needed for viewing
    const filePath = fileName;

    // Create a signature record with method='upload'
    const signatureResult = await createSignature({
      signatureType: "consent",
      patientId,
      signerName: patientName,
      signerRole: "Patient",
      signatureData: filePath, // Store file path for private bucket
      signatureMethod: "upload",
      ipAddress: (await getClientIpAddress()) || undefined,
    });

    if (signatureResult.error || !signatureResult.data) {
      // Clean up uploaded file if signature creation fails
      await supabase.storage.from("patient-consents").remove([fileName]);
      return { error: "Failed to create signature record" };
    }

    // Create consent record with document metadata
    const { data: consent, error: consentError } = await supabase
      .from("patient_consents")
      .insert({
        patient_id: patientId,
        consent_type: consentType,
        consent_text: consentText,
        patient_signature_id: signatureResult.data.id,
        consent_document_url: filePath, // Store file path, not URL
        consent_document_name: file.name,
        consent_document_size: file.size,
        created_by: user.id,
      })
      .select()
      .single();

    if (consentError) {
      console.error("Error creating consent:", consentError);
      // Clean up uploaded file and signature if consent creation fails
      await supabase.storage.from("patient-consents").remove([fileName]);
      return { error: consentError.message };
    }

    revalidatePath(`/dashboard/patients/${patientId}`);
    return { data: consent };
  } catch (error) {
    console.error("Exception uploading consent:", error);
    return { error: "Failed to upload consent" };
  }
}

/**
 * Get consent document with signed URL for viewing
 * Generates a temporary signed URL for private storage buckets
 */
export async function getConsentDocumentUrl(patientId: string) {
  const supabase = await createClient();

  try {
    const { data: consent, error } = await supabase
      .from("patient_consents")
      .select("consent_document_url, consent_document_name")
      .eq("patient_id", patientId)
      .order("created_at", { ascending: false })
      .limit(1)
      .single();

    if (error || !consent) {
      return { error: "Consent not found" };
    }

    // If no document URL (electronic signature), return as-is
    if (!consent.consent_document_url) {
      return { data: consent };
    }

    // Extract file path from URL if it's a full URL (legacy format)
    let filePath = consent.consent_document_url;
    if (filePath.includes("/storage/v1/object/public/patient-consents/")) {
      filePath = filePath.split(
        "/storage/v1/object/public/patient-consents/"
      )[1];
    }

    // Generate signed URL for private bucket (valid for 1 hour)
    const { data: signedUrlData, error: signedError } = await supabase.storage
      .from("patient-consents")
      .createSignedUrl(filePath, 3600);

    if (signedError || !signedUrlData) {
      return { error: "Failed to generate document access URL" };
    }

    return {
      data: {
        ...consent,
        consent_document_url: signedUrlData.signedUrl,
      },
    };
  } catch (error) {
    return { error: "Failed to get consent document" };
  }
}
