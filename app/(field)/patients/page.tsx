import { Search } from "lucide-react";
import { getPatientsDirectory } from "@/app/actions/field-patients";
import { getUserRole, getAccessibleFacilities } from "@/lib/rbac";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { DirectoryTable } from "@/components/field/patients/directory-table";
import { ErrorState } from "@/components/field/patients/error-state";
import { NewPatientDialog } from "@/components/field/patients/new-patient-dialog";
import {
  actionError,
  actionOk,
  normalizeDirectoryPatients,
  toFacilityOptions,
  type FacilityOption,
} from "@/components/field/patients/normalize";

export const metadata = { title: "Patients" };

// The actions module is built concurrently — pin the call-site contract
// locally and shape the result defensively (normalize.ts).
const getDirectory = getPatientsDirectory as unknown as (search?: string) => Promise<unknown>;

export default async function PatientsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await searchParams;
  const q = typeof sp.q === "string" && sp.q.trim().length > 0 ? sp.q.trim() : undefined;

  const role = await getUserRole();
  const isOfficeAdmin = role?.role === "tenant_admin" || role?.role === "facility_admin";

  const res = await getDirectory(q);

  let facilities: FacilityOption[] = [];
  if (isOfficeAdmin) {
    facilities = toFacilityOptions(await getAccessibleFacilities());
  }

  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-6 sm:px-6 lg:py-8">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Directory
          </p>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight text-foreground">Patients</h1>
        </div>
        {isOfficeAdmin ? <NewPatientDialog facilities={facilities} /> : null}
      </header>

      <form action="/patients" role="search" className="mt-5 flex max-w-xl items-center gap-2">
        <div className="relative flex-1">
          <Search
            className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
            aria-hidden="true"
          />
          <Input
            name="q"
            type="search"
            defaultValue={q ?? ""}
            placeholder="Search by name or MRN"
            aria-label="Search patients"
            className="h-11 pl-9"
          />
        </div>
        <Button type="submit" variant="secondary" className="h-11">
          Search
        </Button>
      </form>

      <div className="mt-6">
        {actionOk(res) ? (
          <DirectoryTable patients={normalizeDirectoryPatients(res)} query={q} />
        ) : (
          <ErrorState message={actionError(res, "Failed to load the patients directory.")} />
        )}
      </div>
    </div>
  );
}
