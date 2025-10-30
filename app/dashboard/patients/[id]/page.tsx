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
  Plus,
} from "lucide-react";
import Link from "next/link";
import { PatientDeleteButton } from "@/components/patients/patient-delete-button";
import WoundCard from "@/components/wounds/wound-card";
import VisitCard from "@/components/visits/visit-card";
import CSVDownloadButton from "@/components/pdf/csv-download-button";
import { DynamicBreadcrumbs } from "@/components/ui/dynamic-breadcrumbs";

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
      {/* Breadcrumbs */}
      <DynamicBreadcrumbs
        customSegments={[
          { label: "Patients", href: "/dashboard/patients" },
          { label: `${patient.firstName} ${patient.lastName}` },
        ]}
      />

      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold sm:text-3xl">
            {patient.firstName} {patient.lastName}
          </h1>
          <p className="text-sm text-zinc-600 sm:text-base dark:text-zinc-400">
            MRN: {patient.mrn} • {patient.facility.name}
          </p>
        </div>
        <div className="flex gap-2">
          <Link href={`/dashboard/patients/${patient.id}/edit`}>
            <Button
              className="flex-1 gap-2 sm:flex-none"
              aria-label={`Edit patient ${patient.firstName} ${patient.lastName}`}
            >
              <Edit className="h-4 w-4" aria-hidden="true" />
              <span className="hidden sm:inline">Edit</span>
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
              <TabsTrigger value="demographics" className="text-xs sm:text-sm">
                Demographics
              </TabsTrigger>
              <TabsTrigger value="insurance" className="text-xs sm:text-sm">
                Insurance
              </TabsTrigger>
              <TabsTrigger value="medical" className="text-xs sm:text-sm">
                Medical Info
              </TabsTrigger>
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
        <div className="space-y-6 lg:sticky lg:top-6 lg:h-fit lg:max-h-[calc(100vh-8rem)]">
          {/* Active Wounds */}
          <Card className="flex flex-col overflow-hidden">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <Activity className="h-5 w-5" aria-hidden="true" />
                  Active Wounds
                </CardTitle>
                <div className="flex gap-2">
                  {patient.wounds.length > 0 && (
                    <CSVDownloadButton
                      type="wounds"
                      patientId={patient.id}
                      variant="ghost"
                      size="sm"
                    />
                  )}
                  <Link href={`/dashboard/patients/${patient.id}/wounds/new`}>
                    <Button
                      size="sm"
                      className="gap-1"
                      aria-label="Add new wound"
                    >
                      <Plus className="h-4 w-4" aria-hidden="true" />
                      Add
                    </Button>
                  </Link>
                </div>
              </div>
            </CardHeader>
            <CardContent className="flex-1 overflow-y-auto">
              {patient.wounds.length > 0 ? (
                <div className="space-y-3">
                  {patient.wounds.map(
                    (wound: {
                      id: string;
                      woundNumber: string;
                      location: string;
                      woundType: string;
                      onsetDate: Date;
                      status: string;
                    }) => (
                      <WoundCard
                        key={wound.id}
                        wound={wound}
                        patientId={patient.id}
                      />
                    )
                  )}
                </div>
              ) : (
                <div className="space-y-3 text-center">
                  <p className="text-sm text-zinc-600 dark:text-zinc-400">
                    No active wounds
                  </p>
                  <Link href={`/dashboard/patients/${patient.id}/wounds/new`}>
                    <Button
                      variant="outline"
                      size="sm"
                      className="gap-1"
                      aria-label="Add first wound"
                    >
                      <Plus className="h-4 w-4" aria-hidden="true" />
                      Add First Wound
                    </Button>
                  </Link>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Recent Visits */}
          <Card className="flex flex-col overflow-hidden">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <Calendar className="h-5 w-5" aria-hidden="true" />
                  Recent Visits
                </CardTitle>
                <Link href={`/dashboard/patients/${patient.id}/visits/new`}>
                  <Button
                    size="sm"
                    className="gap-1"
                    aria-label="Schedule new visit"
                  >
                    <Plus className="h-4 w-4" aria-hidden="true" />
                    Add
                  </Button>
                </Link>
              </div>
            </CardHeader>
            <CardContent className="flex-1 overflow-y-auto">
              {patient.visits.length > 0 ? (
                <div className="space-y-3">
                  {patient.visits.map(
                    (visit: {
                      id: string;
                      visitDate: Date;
                      visitType: string;
                      location: string | null;
                      status: string;
                      followUpType: string | null;
                      followUpDate: Date | null;
                    }) => (
                      <VisitCard
                        key={visit.id}
                        visit={visit}
                        patientId={patient.id}
                      />
                    )
                  )}
                </div>
              ) : (
                <div className="space-y-3 text-center">
                  <p className="text-sm text-zinc-600 dark:text-zinc-400">
                    No visits recorded
                  </p>
                  <Link href={`/dashboard/patients/${patient.id}/visits/new`}>
                    <Button variant="outline" size="sm" className="gap-1">
                      <Plus className="h-4 w-4" />
                      Schedule First Visit
                    </Button>
                  </Link>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
