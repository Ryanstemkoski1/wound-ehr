import { getUserFacilities } from "@/app/actions/facilities";
import FacilityActions from "@/components/facilities/facility-actions";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Plus, Building2, MapPin, Phone, Mail } from "lucide-react";
import Link from "next/link";

// Force dynamic rendering (requires auth)
export const dynamic = "force-dynamic";

type Facility = {
  id: string;
  name: string;
  address: string | null;
  city: string | null;
  state: string | null;
  zip: string | null;
  phone: string | null;
  fax: string | null;
  contactPerson: string | null;
  email: string | null;
  notes: string | null;
  _count: {
    patients: number;
  };
};

export default async function FacilitiesPage() {
  const facilities = await getUserFacilities();

  return (
    <div className="animate-fade-in space-y-6">
      {/* Enhanced Header with gradient */}
      <div className="via-background shadow-soft relative overflow-hidden rounded-xl bg-linear-to-br from-purple-500/10 to-blue-500/5 p-6 sm:p-8">
        <div className="relative z-10 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="gradient-text text-2xl font-bold tracking-tight sm:text-3xl">
              Facilities
            </h1>
            <p className="mt-2 text-sm text-zinc-600 sm:text-base dark:text-zinc-400">
              Manage and oversee your healthcare facilities
            </p>
          </div>
          <Link href="/dashboard/facilities/new">
            <Button className="gap-2 bg-linear-to-r from-purple-600 to-purple-500 shadow-md transition-all hover:from-purple-500 hover:to-purple-600 hover:shadow-lg">
              <Plus className="h-4 w-4" />
              Add Facility
            </Button>
          </Link>
        </div>
        {/* Decorative elements */}
        <div className="absolute -top-16 -right-16 h-48 w-48 rounded-full bg-purple-500/5 blur-3xl" />
        <div className="absolute -bottom-8 -left-8 h-32 w-32 rounded-full bg-blue-500/5 blur-2xl" />
      </div>

      {facilities.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-16">
            <div className="mb-4 rounded-full bg-zinc-100 p-4 dark:bg-zinc-800">
              <Building2 className="h-12 w-12 text-zinc-400" />
            </div>
            <h3 className="mb-2 text-lg font-semibold">No facilities yet</h3>
            <p className="mb-4 text-center text-sm text-zinc-600 dark:text-zinc-400">
              Get started by creating your first facility
            </p>
            <Link href="/dashboard/facilities/new">
              <Button className="gap-2">
                <Plus className="h-4 w-4" />
                Add Facility
              </Button>
            </Link>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {facilities.map((facility: Facility, index: number) => (
            <div
              key={facility.id}
              style={{ animationDelay: `${index * 50}ms` }}
              className="animate-slide-in"
            >
              <Card className="hover-lift group relative overflow-hidden border-l-4 border-l-purple-500 transition-all duration-300 hover:shadow-lg">
                {/* Gradient background overlay */}
                <div className="absolute inset-0 bg-linear-to-br from-purple-500/2 to-blue-500/2 opacity-0 transition-opacity duration-300 group-hover:opacity-100" />

                <CardHeader className="relative flex flex-row items-start justify-between space-y-0 pb-3">
                  <div className="flex items-start gap-3">
                    <div className="rounded-xl bg-linear-to-br from-purple-500/10 to-purple-600/10 p-3 ring-1 ring-purple-500/20 transition-transform duration-300 group-hover:scale-110 group-hover:ring-purple-500/30">
                      <Building2 className="h-5 w-5 text-purple-600 dark:text-purple-400" />
                    </div>
                    <div>
                      <CardTitle className="text-lg font-bold tracking-tight transition-colors group-hover:text-purple-600 dark:group-hover:text-purple-400">
                        {facility.name}
                      </CardTitle>
                      <p className="mt-1 text-sm font-medium text-zinc-600 dark:text-zinc-400">
                        {facility._count.patients} patient
                        {facility._count.patients !== 1 ? "s" : ""}
                      </p>
                    </div>
                  </div>
                  <FacilityActions
                    facilityId={facility.id}
                    facilityName={facility.name}
                  />
                </CardHeader>
                <CardContent className="relative space-y-2.5">
                  {facility.address && (
                    <div className="flex items-start gap-2 rounded-lg bg-zinc-50 px-3 py-2 text-sm dark:bg-zinc-900/50">
                      <MapPin className="mt-0.5 h-4 w-4 text-zinc-400" />
                      <div className="font-medium text-zinc-700 dark:text-zinc-300">
                        <p>{facility.address}</p>
                        {(facility.city || facility.state || facility.zip) && (
                          <p className="text-zinc-600 dark:text-zinc-400">
                            {facility.city}
                            {facility.city && facility.state && ", "}
                            {facility.state} {facility.zip}
                          </p>
                        )}
                      </div>
                    </div>
                  )}
                  {facility.phone && (
                    <div className="flex items-center gap-2 text-sm text-zinc-600 dark:text-zinc-400">
                      <Phone className="h-4 w-4 text-zinc-400" />
                      <span>{facility.phone}</span>
                    </div>
                  )}
                  {facility.email && (
                    <div className="flex items-center gap-2 text-sm text-zinc-600 dark:text-zinc-400">
                      <Mail className="h-4 w-4 text-zinc-400" />
                      <span>{facility.email}</span>
                    </div>
                  )}
                  {facility.contactPerson && (
                    <div className="mt-3 rounded-lg bg-linear-to-br from-purple-500/5 to-blue-500/5 p-3 text-sm ring-1 ring-purple-500/10">
                      <span className="font-semibold text-purple-900 dark:text-purple-100">
                        Contact:
                      </span>{" "}
                      <span className="text-zinc-700 dark:text-zinc-300">
                        {facility.contactPerson}
                      </span>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
