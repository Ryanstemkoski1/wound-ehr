// Centralized attestation wording for the sign-note flow.
//
// Two separate texts are used at two distinct moments in the sign flow:
//   1. ATTESTATION_CHECKBOX_TEXT — gates the signature pad. Clinician must
//      tick this checkbox before the pad becomes active. Shown in the amber
//      callout above the pad.
//   2. ATTESTATION_CERTIFICATION_TEXT — shown inside the signature pad
//      itself as the certification line under the signature canvas. Also
//      snapshotted into PDFs and the audit row at sign time.
//
// PHASE 3 PLACEHOLDER: Dr. May is providing final legal-approved wording.
// When that arrives, replace these constants in this file only.

export const ATTESTATION_CHECKBOX_TEXT =
  "I attest that the documentation is true, accurate, and complete; that I personally performed (or directly supervised) the services described; and that the record reflects the care delivered to this patient.";

export const ATTESTATION_CERTIFICATION_TEXT =
  "By signing, I certify that I have reviewed all assessments and documentation for this visit, and that the information provided is accurate, complete, and represents the care delivered.";
