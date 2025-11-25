// Clinical Credentials Type Definitions
// Phase 9.1: Credentials-Based Role System

export type Credentials =
  | "RN" // Registered Nurse
  | "LVN" // Licensed Vocational Nurse
  | "MD" // Medical Doctor
  | "DO" // Doctor of Osteopathic Medicine
  | "PA" // Physician Assistant
  | "NP" // Nurse Practitioner
  | "CNA" // Certified Nursing Assistant
  | "Admin"; // Administrative staff (non-clinical)

// Credentials that require patient signatures
export const REQUIRES_PATIENT_SIGNATURE: Credentials[] = ["RN", "LVN"];

// Credentials with full clinical access (can perform all procedures)
export const FULL_CLINICAL_ACCESS: Credentials[] = ["MD", "DO", "PA", "NP"];

// Credentials with limited clinical access (restricted procedures)
export const LIMITED_CLINICAL_ACCESS: Credentials[] = ["RN", "LVN", "CNA"];

// Display labels for credentials
export const CREDENTIALS_LABELS: Record<Credentials, string> = {
  RN: "Registered Nurse",
  LVN: "Licensed Vocational Nurse",
  MD: "Medical Doctor",
  DO: "Doctor of Osteopathic Medicine",
  PA: "Physician Assistant",
  NP: "Nurse Practitioner",
  CNA: "Certified Nursing Assistant",
  Admin: "Administrative Staff",
};

// Short labels for badges
export const CREDENTIALS_SHORT_LABELS: Record<Credentials, string> = {
  RN: "RN",
  LVN: "LVN",
  MD: "MD",
  DO: "DO",
  PA: "PA",
  NP: "NP",
  CNA: "CNA",
  Admin: "Admin",
};

// Helper function to check if credentials require patient signature
export function requiresPatientSignature(
  credentials: Credentials | null | undefined
): boolean {
  if (!credentials) return false;
  return REQUIRES_PATIENT_SIGNATURE.includes(credentials);
}

// Helper function to check if credentials have full clinical access
export function hasFullClinicalAccess(
  credentials: Credentials | null | undefined
): boolean {
  if (!credentials) return false;
  return FULL_CLINICAL_ACCESS.includes(credentials);
}

// Helper function to get display label
export function getCredentialsLabel(
  credentials: Credentials | null | undefined,
  short: boolean = false
): string {
  if (!credentials) return "Unknown";
  return short
    ? CREDENTIALS_SHORT_LABELS[credentials]
    : CREDENTIALS_LABELS[credentials];
}
