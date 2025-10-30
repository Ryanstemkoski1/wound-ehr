import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { User, Phone, Building2, Activity } from "lucide-react";

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
    >
      <Card className="cursor-pointer transition-colors hover:border-teal-200 dark:hover:border-teal-800">
        <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-2">
          <div className="flex items-start gap-3">
            <div className="rounded-lg bg-teal-50 p-2 dark:bg-teal-950">
              <User
                className="h-5 w-5 text-teal-600 dark:text-teal-400"
                aria-hidden="true"
              />
            </div>
            <div>
              <CardTitle className="text-lg">
                {patient.lastName}, {patient.firstName}
              </CardTitle>
              <div className="mt-1 flex gap-2">
                <Badge variant="outline" className="text-xs">
                  MRN: {patient.mrn}
                </Badge>
                {patient.gender && (
                  <Badge variant="secondary" className="text-xs">
                    {patient.gender}
                  </Badge>
                )}
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-2">
          <div className="flex items-center gap-2 text-sm text-zinc-600 dark:text-zinc-400">
            <span>Age: {age} years</span>
            <span>•</span>
            <span>DOB: {new Date(patient.dob).toLocaleDateString()}</span>
          </div>

          {patient.phone && (
            <div className="flex items-center gap-2 text-sm">
              <Phone className="h-4 w-4 text-zinc-400" aria-hidden="true" />
              <span>{patient.phone}</span>
            </div>
          )}

          <div className="flex items-center gap-2 text-sm">
            <Building2 className="h-4 w-4 text-zinc-400" aria-hidden="true" />
            <span>{patient.facility.name}</span>
          </div>

          {patient._count.wounds > 0 && (
            <div className="mt-3 flex items-center gap-2 rounded-md bg-amber-50 p-2 text-sm dark:bg-amber-950">
              <Activity
                className="h-4 w-4 text-amber-600 dark:text-amber-400"
                aria-hidden="true"
              />
              <span className="font-medium text-amber-900 dark:text-amber-100">
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
