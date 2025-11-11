import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { User, Phone, Building2, Activity, Calendar } from "lucide-react";

type Patient = {
  id: string;
  firstName: string;
  lastName: string;
  dob: Date;
  mrn: string;
  gender: string | null;
  phone: string | null;
  facility: {
    id: string;
    name: string;
  };
  _count: {
    wounds: number;
  };
};

export default function PatientCard({ patient }: { patient: Patient }) {
  const age = Math.floor(
    (new Date().getTime() - new Date(patient.dob).getTime()) /
      (365.25 * 24 * 60 * 60 * 1000)
  );

  return (
    <Link
      href={`/dashboard/patients/${patient.id}`}
      aria-label={`View details for patient ${patient.firstName} ${patient.lastName}, MRN ${patient.mrn}`}
      className="group"
    >
      <Card className="hover-lift group relative overflow-hidden border-l-4 border-l-teal-500 transition-all duration-300 hover:shadow-lg">
        {/* Gradient background overlay */}
        <div className="absolute inset-0 bg-linear-to-br from-teal-500/2 to-blue-500/2 opacity-0 transition-opacity duration-300 group-hover:opacity-100" />

        <CardHeader className="relative flex flex-row items-start justify-between space-y-0 pb-3">
          <div className="flex items-start gap-3">
            <div className="rounded-xl bg-linear-to-br from-teal-500/10 to-teal-600/10 p-3 ring-1 ring-teal-500/20 transition-transform duration-300 group-hover:scale-110 group-hover:ring-teal-500/30">
              <User
                className="h-5 w-5 text-teal-600 dark:text-teal-400"
                aria-hidden="true"
              />
            </div>
            <div className="flex-1">
              <CardTitle className="text-lg font-bold tracking-tight transition-colors group-hover:text-teal-600 dark:group-hover:text-teal-400">
                {patient.lastName}, {patient.firstName}
              </CardTitle>
              <div className="mt-2 flex flex-wrap gap-2">
                <Badge
                  variant="outline"
                  className="border-teal-200 text-xs font-medium dark:border-teal-800"
                >
                  MRN: {patient.mrn}
                </Badge>
                {patient.gender && (
                  <Badge variant="secondary" className="text-xs font-medium">
                    {patient.gender}
                  </Badge>
                )}
              </div>
            </div>
          </div>
        </CardHeader>

        <CardContent className="relative space-y-3">
          <div className="flex items-center gap-3 rounded-lg bg-zinc-50 px-3 py-2 text-sm dark:bg-zinc-900/50">
            <Calendar className="h-4 w-4 text-zinc-400" aria-hidden="true" />
            <div className="flex items-center gap-2 text-zinc-700 dark:text-zinc-300">
              <span className="font-semibold">{age} years old</span>
              <span className="text-zinc-400">•</span>
              <span className="text-zinc-500 dark:text-zinc-400">
                {new Date(patient.dob).toLocaleDateString()}
              </span>
            </div>
          </div>

          {patient.phone && (
            <div className="flex items-center gap-2 text-sm text-zinc-600 dark:text-zinc-400">
              <Phone className="h-4 w-4 text-zinc-400" aria-hidden="true" />
              <span>{patient.phone}</span>
            </div>
          )}

          {patient.facility && (
            <div className="flex items-center gap-2 text-sm text-zinc-600 dark:text-zinc-400">
              <Building2 className="h-4 w-4 text-zinc-400" aria-hidden="true" />
              <span className="font-medium">{patient.facility.name}</span>
            </div>
          )}

          {patient._count.wounds > 0 && (
            <div className="mt-4 flex items-center gap-2 rounded-lg bg-linear-to-br from-amber-500/10 to-orange-500/10 p-3 ring-1 ring-amber-500/20">
              <Activity
                className="h-4 w-4 text-amber-600 dark:text-amber-400"
                aria-hidden="true"
              />
              <span className="text-sm font-semibold text-amber-900 dark:text-amber-100">
                {patient._count.wounds} active wound
                {patient._count.wounds !== 1 ? "s" : ""}
              </span>
            </div>
          )}
        </CardContent>
      </Card>
    </Link>
  );
}
