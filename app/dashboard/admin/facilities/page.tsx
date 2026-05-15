import { redirect } from "next/navigation";
import Link from "next/link";
import { Plus } from "lucide-react";
import { isAdmin } from "@/lib/rbac";
import { getUserFacilities } from "@/app/actions/facilities";
import { Button } from "@/components/ui/button";
import { DynamicBreadcrumbs } from "@/components/ui/dynamic-breadcrumbs";
import FacilityActionsClient from "@/components/facilities/facility-actions";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";

export const dynamic = "force-dynamic";

export default async function AdminFacilitiesPage() {
  const hasAccess = await isAdmin();

  if (!hasAccess) {
    redirect("/dashboard");
  }

  const facilities = await getUserFacilities();

  return (
    <div className="space-y-6">
      <DynamicBreadcrumbs
        customSegments={[
          { label: "Dashboard", href: "/dashboard" },
          { label: "Admin" },
          { label: "Facilities" },
        ]}
      />

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Facilities</h1>
          <p className="text-zinc-600 dark:text-zinc-400">
            Manage facilities in your organization
          </p>
        </div>
        <Link href="/dashboard/admin/facilities/new">
          <Button className="gap-2">
            <Plus className="h-4 w-4" />
            Add Facility
          </Button>
        </Link>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Facilities</CardTitle>
          <CardDescription>
            {facilities.length} facilit{facilities.length !== 1 ? "ies" : "y"}{" "}
            in your organization
          </CardDescription>
        </CardHeader>
        <CardContent>
          {facilities.length === 0 ? (
            <div className="py-12 text-center text-zinc-500">
              <p>No facilities found</p>
              <Link href="/dashboard/admin/facilities/new">
                <Button className="mt-4 gap-2">
                  <Plus className="h-4 w-4" />
                  Add Your First Facility
                </Button>
              </Link>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Address</TableHead>
                    <TableHead>Contact</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {facilities.map((facility) => (
                    <TableRow key={facility.id}>
                      <TableCell className="font-medium">
                        {facility.name}
                      </TableCell>
                      <TableCell>
                        {facility.address && (
                          <div className="text-sm text-zinc-600 dark:text-zinc-400">
                            {facility.address}
                            {facility.city && `, ${facility.city}`}
                            {facility.state && `, ${facility.state}`}
                            {facility.zip && ` ${facility.zip}`}
                          </div>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="text-sm">
                          {facility.phone && <div>{facility.phone}</div>}
                          {facility.email && (
                            <div className="text-zinc-600 dark:text-zinc-400">
                              {facility.email}
                            </div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={facility.isActive ? "default" : "secondary"}
                        >
                          {facility.isActive ? "Active" : "Inactive"}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <FacilityActionsClient
                          facilityId={facility.id}
                          facilityName={facility.name}
                        />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
