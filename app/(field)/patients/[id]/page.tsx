import Link from "next/link";
import { ArrowLeft, CalendarPlus } from "lucide-react";
import { getPatientChart } from "@/app/actions/field-patients";
import { getUserRole, getAccessibleFacilities } from "@/lib/rbac";
import { Button } from "@/components/ui/button";
import { EditDemographicsDialog } from "@/components/field/patients/edit-demographics-dialog";
import { ErrorState } from "@/components/field/patients/error-state";
import { NoteHistory } from "@/components/field/patients/note-history";
import { WoundsSummary } from "@/components/field/patients/wounds-summary";
import {
  actionError,
  actionOk,
  fmtDate,
  normalizeChart,
  toFacilityOptions,
  type FacilityOption,
} from "@/components/field/patients/normalize";

export const metadata = { title: "Patient chart" };

// The actions module is built concurrently — pin the call-site contract
// locally and shape the result defensively (normalize.ts).
const getChart = getPatientChart as unknown as (patientId: string) => Promise<unknown>;

export default async function PatientChartPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const role = await getUserRole();
  const isOfficeAdmin = role?.role === "tenant_admin" || role?.role === "facility_admin";

  const res = await getChart(id);

  if (!actionOk(res)) {
    return (
      <div className="mx-auto w-full max-w-5xl px-4 py-6 sm:px-6 lg:py-8">
        <BackLink />
        <div className="mt-6">
          <ErrorState
            message={actionError(res, "Failed to load this patient's chart.")}
            backHref="/patients"
            backLabel="Back to patients"
          />
        </div>
      </div>
    );
  }

  const chart = normalizeChart(res);
  if (!chart) {
    return (
      <div className="mx-auto w-full max-w-5xl px-4 py-6 sm:px-6 lg:py-8">
        <BackLink />
        <div className="mt-6">
          <ErrorState
            message="Patient not found or access denied."
            backHref="/patients"
            backLabel="Back to patients"
          />
        </div>
      </div>
    );
  }

  let facilities: FacilityOption[] = [];
  if (isOfficeAdmin) {
    facilities = toFacilityOptions(await getAccessibleFacilities());
  }

  const { patient, notes, wounds, woundsAsOf } = chart;

  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-6 sm:px-6 lg:py-8">
      <BackLink />

      <header className="mt-4 flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Patient chart
          </p>
          <h1 className="mt-1 truncate text-2xl font-semibold tracking-tight text-foreground">
            {patient.name}
          </h1>
          <dl className="mt-2 flex flex-wrap gap-x-6 gap-y-1 text-sm">
            <div className="flex gap-1.5">
              <dt className="text-muted-foreground">DOB</dt>
              <dd className="text-foreground">{fmtDate(patient.dob)}</dd>
            </div>
            <div className="flex gap-1.5">
              <dt className="text-muted-foreground">MRN</dt>
              <dd className="text-foreground">{patient.mrn ?? "—"}</dd>
            </div>
            <div className="flex gap-1.5">
              <dt className="text-muted-foreground">Facility</dt>
              <dd className="text-foreground">{patient.facilityName ?? "—"}</dd>
            </div>
          </dl>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {isOfficeAdmin ? (
            <EditDemographicsDialog patient={patient} facilities={facilities} />
          ) : null}
          {/* /schedule is office-only; a nurse tapping this would dead-end at the proxy gate. */}
          {isOfficeAdmin ? (
            <Button asChild className="h-11">
              <Link href="/schedule">
                <CalendarPlus className="h-4 w-4" aria-hidden="true" />
                Schedule visit
              </Link>
            </Button>
          ) : null}
        </div>
      </header>

      <div className="mt-6 grid gap-4 lg:grid-cols-3">
        {wounds.length > 0 ? (
          <div className="lg:order-2">
            <WoundsSummary wounds={wounds} asOf={woundsAsOf} />
          </div>
        ) : null}
        <div className={wounds.length > 0 ? "lg:order-1 lg:col-span-2" : "lg:col-span-3"}>
          <NoteHistory notes={notes} />
        </div>
      </div>
    </div>
  );
}

function BackLink() {
  return (
    <Link
      href="/patients"
      className="inline-flex min-h-11 items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
    >
      <ArrowLeft className="h-4 w-4" aria-hidden="true" />
      Patients
    </Link>
  );
}
