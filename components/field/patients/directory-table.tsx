import Link from "next/link";
import { ChevronRight, Users } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { fmtDate, type DirectoryPatient } from "./normalize";

/**
 * Patients directory listing: table on >=sm, tappable cards on phones.
 * Server component — rows are plain links to the chart.
 */
export function DirectoryTable({
  patients,
  query,
}: {
  patients: DirectoryPatient[];
  query?: string;
}) {
  if (patients.length === 0) {
    return (
      <div className="rounded-lg border border-border bg-card px-4 py-10 text-center">
        <Users className="mx-auto h-5 w-5 text-muted-foreground" aria-hidden="true" />
        <p className="mt-2 text-sm font-medium text-foreground">
          {query ? `No patients match "${query}"` : "No patients yet"}
        </p>
        <p className="mt-1 text-sm text-muted-foreground">
          {query
            ? "Try a different name or MRN."
            : "Patients appear here once they are added to the directory."}
        </p>
        {query ? (
          <Link
            href="/patients"
            className="mt-4 inline-flex min-h-11 items-center justify-center rounded-md border border-border bg-background px-4 text-sm font-medium text-foreground hover:bg-muted"
          >
            Clear search
          </Link>
        ) : null}
      </div>
    );
  }

  return (
    <div>
      <p className="mb-2 text-xs text-muted-foreground">
        {patients.length} patient{patients.length === 1 ? "" : "s"}
        {query ? ` matching "${query}"` : ""}
      </p>

      {/* Phone: card list */}
      <ul className="space-y-2 sm:hidden">
        {patients.map((p) => (
          <li key={p.id}>
            <Link
              href={`/patients/${p.id}`}
              className="block rounded-lg border border-border bg-card p-4 transition-colors hover:bg-muted/50"
            >
              <div className="flex items-center justify-between gap-2">
                <span className="truncate text-sm font-medium text-foreground">{p.name}</span>
                <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden="true" />
              </div>
              <dl className="mt-2 grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
                <div>
                  <dt className="text-xs uppercase tracking-wide text-muted-foreground">DOB</dt>
                  <dd className="text-foreground">{fmtDate(p.dob)}</dd>
                </div>
                <div>
                  <dt className="text-xs uppercase tracking-wide text-muted-foreground">MRN</dt>
                  <dd className="text-foreground">{p.mrn ?? "—"}</dd>
                </div>
                <div>
                  <dt className="text-xs uppercase tracking-wide text-muted-foreground">Facility</dt>
                  <dd className="truncate text-foreground">{p.facilityName ?? "—"}</dd>
                </div>
                <div>
                  <dt className="text-xs uppercase tracking-wide text-muted-foreground">Last visit</dt>
                  <dd className="text-foreground">{fmtDate(p.lastVisitAt)}</dd>
                </div>
              </dl>
            </Link>
          </li>
        ))}
      </ul>

      {/* >=sm: table */}
      <div className="hidden overflow-x-auto rounded-lg border border-border bg-card sm:block">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>DOB</TableHead>
              <TableHead>MRN</TableHead>
              <TableHead>Facility</TableHead>
              <TableHead>Last visit</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {patients.map((p) => (
              <TableRow key={p.id} className="relative">
                <TableCell className="py-3 font-medium">
                  <Link
                    href={`/patients/${p.id}`}
                    className="text-foreground after:absolute after:inset-0 after:content-['']"
                  >
                    {p.name}
                  </Link>
                </TableCell>
                <TableCell className="py-3 text-muted-foreground">{fmtDate(p.dob)}</TableCell>
                <TableCell className="py-3 text-muted-foreground">{p.mrn ?? "—"}</TableCell>
                <TableCell className="py-3 text-muted-foreground">{p.facilityName ?? "—"}</TableCell>
                <TableCell className="py-3 text-muted-foreground">{fmtDate(p.lastVisitAt)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
