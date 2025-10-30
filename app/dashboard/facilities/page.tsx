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
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Facilities</h1>
          <p className="text-zinc-600 dark:text-zinc-400">
            Manage your healthcare facilities
          </p>
        </div>
        <Link href="/dashboard/facilities/new">
          <Button className="gap-2">
            <Plus className="h-4 w-4" />
            Add Facility
          </Button>
        </Link>
      </div>

      {facilities.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16">
            <Building2 className="mb-4 h-12 w-12 text-zinc-400" />
            <h3 className="mb-2 text-lg font-semibold">No facilities yet</h3>
            <p className="mb-4 text-sm text-zinc-600 dark:text-zinc-400">
              Get started by creating your first facility
            </p>
            <Link href="/dashboard/facilities/new">
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                Add Facility
              </Button>
            </Link>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {facilities.map((facility: Facility) => (
            <Card
              key={facility.id}
              className="hover:border-teal-200 dark:hover:border-teal-800"
            >
              <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-2">
                <div className="flex items-start gap-3">
                  <div className="rounded-lg bg-teal-50 p-2 dark:bg-teal-950">
                    <Building2 className="h-5 w-5 text-teal-600 dark:text-teal-400" />
                  </div>
                  <div>
                    <CardTitle className="text-lg">{facility.name}</CardTitle>
                    <p className="text-sm text-zinc-600 dark:text-zinc-400">
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
              <CardContent className="space-y-2">
                {facility.address && (
                  <div className="flex items-start gap-2 text-sm">
                    <MapPin className="mt-0.5 h-4 w-4 text-zinc-400" />
                    <div>
                      <p>{facility.address}</p>
                      {(facility.city || facility.state || facility.zip) && (
                        <p>
                          {facility.city}
                          {facility.city && facility.state && ", "}
                          {facility.state} {facility.zip}
                        </p>
                      )}
                    </div>
                  </div>
                )}
                {facility.phone && (
                  <div className="flex items-center gap-2 text-sm">
                    <Phone className="h-4 w-4 text-zinc-400" />
                    <span>{facility.phone}</span>
                  </div>
                )}
                {facility.email && (
                  <div className="flex items-center gap-2 text-sm">
                    <Mail className="h-4 w-4 text-zinc-400" />
                    <span>{facility.email}</span>
                  </div>
                )}
                {facility.contactPerson && (
                  <div className="mt-3 rounded-md bg-zinc-50 p-2 text-sm dark:bg-zinc-900">
                    <span className="font-medium">Contact:</span>{" "}
                    {facility.contactPerson}
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
