// Shared prop shapes for the scheduler surface (client-safe, no server imports).

export interface NurseOption {
  id: string;
  name: string;
  credentials?: string;
  todayCount: number;
}

export interface FacilityOption {
  id: string;
  name: string;
}

/** Normalized patient-directory row (defensively shaped from getPatientsDirectory). */
export interface DirectoryPatient {
  id: string;
  name: string;
  dob: string | null;
  mrn: string | null;
  facilityName: string | null;
  lastVisitDate: string | null;
}
