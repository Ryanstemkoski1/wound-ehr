import { redirect, notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import prisma from "@/lib/prisma";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  AlertTriangle,
  Calendar,
  Edit,
  Phone,
  User,
  Activity,
  MapPin,
} from "lucide-react";
import Link from "next/link";
import { PatientDeleteButton } from "@/components/patients/patient-delete-button";

type Params = Promise<{ id: string }>;

export default async function PatientDetailPage({
  params,
}: {
  params: Params;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  // Get patient with facility access check
  const patient = await prisma.patient.findFirst({
    where: {
      id,
      isActive: true,
      facility: {
        users: {
          some: { userId: user.id },
        },
      },
    },
    include: {
      facility: true,
      wounds: {
        where: { status: "active" },
        orderBy: { createdAt: "desc" },
      },
      visits: {
        orderBy: { visitDate: "desc" },
        take: 5,
      },
    },
  });

  if (!patient) {
    notFound();
  }

  // Calculate age
  const calculateAge = (dob: Date) => {
    const today = new Date();
    const birthDate = new Date(dob);
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    if (
      monthDiff < 0 ||
      (monthDiff === 0 && today.getDate() < birthDate.getDate())
    ) {
      age--;
    }
    return age;
  };

  const age = calculateAge(patient.dob);

  // Parse JSONB fields
  const allergies = (patient.allergies as string[]) || [];
  const medicalHistory = (patient.medicalHistory as string[]) || [];
  const insuranceInfo = patient.insuranceInfo as {
    primary?: { provider: string; policyNumber: string; groupNumber: string };
    secondary?: { provider: string; policyNumber: string; groupNumber: string };
  } | null;
  const emergencyContact = patient.emergencyContact as {
    name: string;
    phone: string;
    relationship: string;
  } | null;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-bold">
            {patient.firstName} {patient.lastName}
          </h1>
          <p className="text-zinc-600 dark:text-zinc-400">
            MRN: {patient.mrn} • {patient.facility.name}
          </p>
        </div>
        <div className="flex gap-2">
          <Link href={`/dashboard/patients/${patient.id}/edit`}>
            <Button className="gap-2">
              <Edit className="h-4 w-4" />
              Edit
            </Button>
          </Link>
          <PatientDeleteButton
            patientId={patient.id}
            patientName={`${patient.firstName} ${patient.lastName}`}
          />
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Left Column - Patient Info */}
        <div className="space-y-6 lg:col-span-2">
          <Tabs defaultValue="demographics">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="demographics">Demographics</TabsTrigger>
              <TabsTrigger value="insurance">Insurance</TabsTrigger>
              <TabsTrigger value="medical">Medical Info</TabsTrigger>
            </TabsList>

            {/* Demographics Tab */}
            <TabsContent value="demographics" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <User className="h-5 w-5" />
                    Basic Information
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid gap-4 md:grid-cols-2">
                    <div>
                      <p className="text-sm text-zinc-600 dark:text-zinc-400">
                        Date of Birth
                      </p>
                      <p className="font-medium">
                        {new Date(patient.dob).toLocaleDateString()} ({age}{" "}
                        years old)
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-zinc-600 dark:text-zinc-400">
                        Gender
                      </p>
                      <p className="font-medium">
                        {patient.gender || "Not specified"}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Phone className="h-5 w-5" />
                    Contact Information
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid gap-4 md:grid-cols-2">
                    <div>
                      <p className="text-sm text-zinc-600 dark:text-zinc-400">
                        Phone
                      </p>
                      <p className="font-medium">
                        {patient.phone || "Not provided"}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-zinc-600 dark:text-zinc-400">
                        Email
                      </p>
                      <p className="font-medium">
                        {patient.email || "Not provided"}
                      </p>
                    </div>
                  </div>
                  {patient.address && (
                    <div>
                      <p className="flex items-center gap-1 text-sm text-zinc-600 dark:text-zinc-400">
                        <MapPin className="h-3 w-3" />
                        Address
                      </p>
                      <p className="font-medium">
                        {patient.address}
                        {patient.city && patient.state && (
                          <>
                            <br />
                            {patient.city}, {patient.state} {patient.zip}
                          </>
                        )}
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>

              {emergencyContact && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <AlertTriangle className="h-5 w-5" />
                      Emergency Contact
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid gap-4 md:grid-cols-3">
                      <div>
                        <p className="text-sm text-zinc-600 dark:text-zinc-400">
                          Name
                        </p>
                        <p className="font-medium">{emergencyContact.name}</p>
                      </div>
                      <div>
                        <p className="text-sm text-zinc-600 dark:text-zinc-400">
                          Phone
                        </p>
                        <p className="font-medium">{emergencyContact.phone}</p>
                      </div>
                      <div>
                        <p className="text-sm text-zinc-600 dark:text-zinc-400">
                          Relationship
                        </p>
                        <p className="font-medium">
                          {emergencyContact.relationship}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}
            </TabsContent>

            {/* Insurance Tab */}
            <TabsContent value="insurance" className="space-y-6">
              {insuranceInfo?.primary && (
                <Card>
                  <CardHeader>
                    <CardTitle>Primary Insurance</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <p className="text-sm text-zinc-600 dark:text-zinc-400">
                        Provider
                      </p>
                      <p className="font-medium">
                        {insuranceInfo.primary.provider}
                      </p>
                    </div>
                    <div className="grid gap-4 md:grid-cols-2">
                      <div>
                        <p className="text-sm text-zinc-600 dark:text-zinc-400">
                          Policy Number
                        </p>
                        <p className="font-medium">
                          {insuranceInfo.primary.policyNumber}
                        </p>
                      </div>
                      <div>
                        <p className="text-sm text-zinc-600 dark:text-zinc-400">
                          Group Number
                        </p>
                        <p className="font-medium">
                          {insuranceInfo.primary.groupNumber}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}

              {insuranceInfo?.secondary && (
                <Card>
                  <CardHeader>
                    <CardTitle>Secondary Insurance</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <p className="text-sm text-zinc-600 dark:text-zinc-400">
                        Provider
                      </p>
                      <p className="font-medium">
                        {insuranceInfo.secondary.provider}
                      </p>
                    </div>
                    <div className="grid gap-4 md:grid-cols-2">
                      <div>
                        <p className="text-sm text-zinc-600 dark:text-zinc-400">
                          Policy Number
                        </p>
                        <p className="font-medium">
                          {insuranceInfo.secondary.policyNumber}
                        </p>
                      </div>
                      <div>
                        <p className="text-sm text-zinc-600 dark:text-zinc-400">
                          Group Number
                        </p>
                        <p className="font-medium">
                          {insuranceInfo.secondary.groupNumber}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}

              {!insuranceInfo?.primary && !insuranceInfo?.secondary && (
                <Card>
                  <CardContent className="py-12 text-center text-zinc-600 dark:text-zinc-400">
                    No insurance information on file
                  </CardContent>
                </Card>
              )}
            </TabsContent>

            {/* Medical Info Tab */}
            <TabsContent value="medical" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <AlertTriangle className="h-5 w-5 text-red-500" />
                    Allergies
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {allergies.length > 0 ? (
                    <div className="flex flex-wrap gap-2">
                      {allergies.map((allergy, index) => (
                        <Badge
                          key={index}
                          variant="destructive"
                          className="text-sm"
                        >
                          {allergy}
                        </Badge>
                      ))}
                    </div>
                  ) : (
                    <p className="text-zinc-600 dark:text-zinc-400">
                      No known allergies
                    </p>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Activity className="h-5 w-5" />
                    Medical History
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {medicalHistory.length > 0 ? (
                    <ul className="space-y-2">
                      {medicalHistory.map((condition, index) => (
                        <li key={index} className="flex items-start gap-2">
                          <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-zinc-400" />
                          <span>{condition}</span>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-zinc-600 dark:text-zinc-400">
                      No medical history recorded
                    </p>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>

        {/* Right Column - Activity */}
        <div className="space-y-6">
          {/* Active Wounds */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Activity className="h-5 w-5" />
                Active Wounds
              </CardTitle>
            </CardHeader>
            <CardContent>
              {patient.wounds.length > 0 ? (
                <div className="space-y-3">
                  {patient.wounds.map(
                    (wound: {
                      id: string;
                      location: string;
                      woundType: string;
                      status: string;
                    }) => (
                      <div
                        key={wound.id}
                        className="rounded-md border border-zinc-200 p-3 dark:border-zinc-800"
                      >
                        <div className="flex items-start justify-between">
                          <div>
                            <p className="font-medium">{wound.location}</p>
                            <p className="text-sm text-zinc-600 dark:text-zinc-400">
                              {wound.woundType}
                            </p>
                          </div>
                          <Badge variant="outline">{wound.status}</Badge>
                        </div>
                      </div>
                    )
                  )}
                </div>
              ) : (
                <p className="text-center text-sm text-zinc-600 dark:text-zinc-400">
                  No active wounds
                </p>
              )}
            </CardContent>
          </Card>

          {/* Recent Visits */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5" />
                Recent Visits
              </CardTitle>
            </CardHeader>
            <CardContent>
              {patient.visits.length > 0 ? (
                <div className="space-y-3">
                  {patient.visits.map(
                    (visit: {
                      id: string;
                      visitDate: Date;
                      visitType: string;
                      status: string;
                    }) => (
                      <div
                        key={visit.id}
                        className="rounded-md border border-zinc-200 p-3 dark:border-zinc-800"
                      >
                        <div className="flex items-start justify-between">
                          <div>
                            <p className="font-medium">
                              {new Date(visit.visitDate).toLocaleDateString()}
                            </p>
                            <p className="text-sm text-zinc-600 dark:text-zinc-400">
                              {visit.visitType}
                            </p>
                          </div>
                          <Badge variant="outline">{visit.status}</Badge>
                        </div>
                      </div>
                    )
                  )}
                </div>
              ) : (
                <p className="text-center text-sm text-zinc-600 dark:text-zinc-400">
                  No visits recorded
                </p>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
