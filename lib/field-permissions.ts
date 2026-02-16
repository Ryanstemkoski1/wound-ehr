/**
 * Field-Level Permissions Utility
 * Phase 10.3.1: Role-Based Field Access
 *
 * Defines which fields each user role can edit in the system.
 */

import type { Credentials } from "@/lib/credentials";
import type { UserRole } from "@/lib/rbac";

// Field categories for patients
export type PatientFieldCategory =
  | "demographics" // name, DOB, MRN, gender, SSN
  | "contact" // address, phone, email
  | "insurance" // insurance info, policy numbers
  | "emergency_contact" // emergency contact details
  | "medical_history" // diagnoses, medications, allergies
  | "allergies" // specific allergy management
  | "wounds" // wound tracking
  | "documents"; // document uploads

// Field categories for visits
export type VisitFieldCategory =
  | "visit_details" // date, type, facility
  | "assessments" // wound assessments
  | "treatments" // treatment plans
  | "visit_notes" // clinical notes
  | "signatures" // electronic signatures
  | "billing"; // billing codes;

// Permission level for a field
export type PermissionLevel = "edit" | "view" | "none";

// Permissions configuration for patient fields
export type PatientFieldPermissions = Record<
  PatientFieldCategory,
  PermissionLevel
>;

// Permissions configuration for visit fields
export type VisitFieldPermissions = Record<VisitFieldCategory, PermissionLevel>;

/**
 * Get patient field permissions based on user credentials and role
 */
export function getPatientFieldPermissions(
  credentials: Credentials | null,
  role: UserRole | null
): PatientFieldPermissions {
  // Tenant admins and facility admins have full edit access
  if (role === "tenant_admin" || role === "facility_admin") {
    return {
      demographics: "edit",
      contact: "edit",
      insurance: "edit",
      emergency_contact: "edit",
      medical_history: "edit",
      allergies: "edit",
      wounds: "edit",
      documents: "edit",
    };
  }

  // Admin credential (non-clinical staff) has limited edit access
  if (credentials === "Admin") {
    return {
      demographics: "edit",
      contact: "edit",
      insurance: "edit",
      emergency_contact: "edit",
      medical_history: "view", // Can view but not edit clinical data
      allergies: "view",
      wounds: "view",
      documents: "edit", // Can upload administrative docs
    };
  }

  // Clinical credentials (RN, LVN, MD, DO, PA, NP, CNA)
  // Can edit clinical data but NOT demographics/insurance
  if (credentials) {
    return {
      demographics: "view", // Read-only for clinicians
      contact: "view", // Read-only for clinicians
      insurance: "view", // Read-only for clinicians
      emergency_contact: "view", // Read-only for clinicians
      medical_history: "edit", // Clinicians can add/edit
      allergies: "edit", // Clinicians can add/edit
      wounds: "edit", // Clinicians can add/edit
      documents: "view", // Can view but not upload insurance docs
    };
  }

  // Default: view-only for unknown roles
  return {
    demographics: "view",
    contact: "view",
    insurance: "view",
    emergency_contact: "view",
    medical_history: "view",
    allergies: "view",
    wounds: "view",
    documents: "view",
  };
}

/**
 * Get visit field permissions based on user credentials and role
 *
 * @param credentials - User's clinical credentials
 * @param role - User's system role
 * @param visitUserId - ID of user who created the visit (for ownership check)
 * @param currentUserId - ID of currently logged-in user
 */
export function getVisitFieldPermissions(
  credentials: Credentials | null,
  role: UserRole | null,
  visitUserId?: string,
  currentUserId?: string
): VisitFieldPermissions {
  // Tenant admins and facility admins can edit all visits
  if (role === "tenant_admin" || role === "facility_admin") {
    return {
      visit_details: "edit",
      assessments: "edit",
      treatments: "edit",
      visit_notes: "edit",
      signatures: "edit",
      billing: "edit",
    };
  }

  // Admin credential (non-clinical)
  if (credentials === "Admin") {
    return {
      visit_details: "edit",
      assessments: "view", // Can view but not edit clinical assessments
      treatments: "view",
      visit_notes: "view",
      signatures: "view",
      billing: "edit", // Can edit billing
    };
  }

  // Clinical credentials - can only edit their own visits
  if (credentials && visitUserId && currentUserId) {
    const isOwnVisit = visitUserId === currentUserId;

    if (isOwnVisit) {
      return {
        visit_details: "edit",
        assessments: "edit",
        treatments: "edit",
        visit_notes: "edit",
        signatures: "edit",
        billing: "edit",
      };
    } else {
      // Cannot edit another clinician's visit
      return {
        visit_details: "view",
        assessments: "view",
        treatments: "view",
        visit_notes: "view",
        signatures: "view",
        billing: "view",
      };
    }
  }

  // Default: view-only
  return {
    visit_details: "view",
    assessments: "view",
    treatments: "view",
    visit_notes: "view",
    signatures: "view",
    billing: "view",
  };
}

/**
 * Check if user can edit demographics fields
 */
export function canEditDemographics(
  credentials: Credentials | null,
  role: UserRole | null
): boolean {
  const permissions = getPatientFieldPermissions(credentials, role);
  return permissions.demographics === "edit";
}

/**
 * Check if user can edit insurance fields
 */
export function canEditInsurance(
  credentials: Credentials | null,
  role: UserRole | null
): boolean {
  const permissions = getPatientFieldPermissions(credentials, role);
  return permissions.insurance === "edit";
}

/**
 * Check if user can edit a specific visit
 */
export function canEditVisit(
  credentials: Credentials | null,
  role: UserRole | null,
  visitUserId: string,
  currentUserId: string
): boolean {
  const permissions = getVisitFieldPermissions(
    credentials,
    role,
    visitUserId,
    currentUserId
  );
  return permissions.visit_details === "edit";
}

/**
 * Check if user can upload documents
 */
export function canUploadDocuments(
  credentials: Credentials | null,
  role: UserRole | null,
  documentType?: string
): boolean {
  const permissions = getPatientFieldPermissions(credentials, role);

  // If documents permission is "view", cannot upload
  if (permissions.documents === "view") return false;

  // Admin-only document types (insurance cards, face sheets)
  const adminOnlyDocs = ["insurance_card", "face_sheet", "id_verification"];

  if (documentType && adminOnlyDocs.includes(documentType)) {
    // Only admins (role or credential) can upload these
    return (
      role === "tenant_admin" ||
      role === "facility_admin" ||
      credentials === "Admin"
    );
  }

  // All other documents: anyone with edit permission
  return permissions.documents === "edit";
}

/**
 * Get user-friendly reason why field is read-only
 */
export function getReadOnlyReason(
  fieldCategory: PatientFieldCategory,
  credentials: Credentials | null,
  role: UserRole | null
): string | null {
  const permissions = getPatientFieldPermissions(credentials, role);

  if (permissions[fieldCategory] === "edit") {
    return null; // Not read-only
  }

  // Generate helpful messages
  switch (fieldCategory) {
    case "demographics":
    case "contact":
    case "insurance":
    case "emergency_contact":
      return "Contact an administrator to update this information";

    case "documents":
      return "Only administrators can upload insurance and identification documents";

    default:
      return "You do not have permission to edit this field";
  }
}
