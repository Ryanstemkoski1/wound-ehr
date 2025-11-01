import { redirect, notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getVisit } from "@/app/actions/visits";
import { getBillingForVisit } from "@/app/actions/billing";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Calendar,
  Clock,
  MapPin,
  FileText,
  Plus,
  Edit,
  DollarSign,
} from "lucide-react";
import Link from "next/link";
import AssessmentCard from "@/components/assessments/assessment-card";
import VisitPDFDownloadButton from "@/components/pdf/visit-pdf-download-button";
import { DynamicBreadcrumbs } from "@/components/ui/dynamic-breadcrumbs";

// Force dynamic rendering (requires auth)
export const dynamic = "force-dynamic";

type PageProps = {
  params: Promise<{
    id: string;
    visitId: string;
  }>;
};

export default async function VisitDetailPage({ params }: PageProps) {
  const { id: patientId, visitId } = await params;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const visit = await getVisit(visitId);

  if (!visit || visit.patientId !== patientId) {
    notFound();
  }

  // Get billing information
  const billingResult = await getBillingForVisit(visitId);
  const billing = billingResult.success ? billingResult.billing : null;

  const statusVariant = visit.status === "complete" ? "secondary" : "default";

  return (
    <div className="space-y-6">
      {/* Breadcrumbs */}
      <DynamicBreadcrumbs
        customSegments={[
          { label: "Patients", href: "/dashboard/patients" },
          {
            label: `${visit.patient.firstName} ${visit.patient.lastName}`,
            href: `/dashboard/patients/${patientId}`,
          },
          { label: "Visit Details" },
        ]}
      />

      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-bold">Visit Details</h1>
          <p className="text-zinc-600 dark:text-zinc-400">
            {visit.patient.firstName} {visit.patient.lastName} •{" "}
            {visit.patient.facility.name}
          </p>
        </div>
        <div className="flex gap-2">
          <VisitPDFDownloadButton
            visitId={visitId}
            visitDate={visit.visitDate}
            patientName={`${visit.patient.firstName} ${visit.patient.lastName}`}
          />
          <Link
            href={`/dashboard/patients/${patientId}/visits/${visitId}/edit`}
          >
            <Button variant="outline" className="gap-2">
              <Edit className="h-4 w-4" />
              Edit Visit
            </Button>
          </Link>
          <Badge variant={statusVariant} className="h-fit">
            {visit.status}
          </Badge>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Visit Information */}
        <div className="space-y-6 lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle>Visit Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="flex items-center gap-2">
                  <Calendar className="text-muted-foreground h-4 w-4" />
                  <div>
                    <p className="text-sm text-zinc-600 dark:text-zinc-400">
                      Date
                    </p>
                    <p className="font-medium">
                      {new Date(visit.visitDate).toLocaleDateString("en-US", {
                        weekday: "long",
                        year: "numeric",
                        month: "long",
                        day: "numeric",
                      })}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <Clock className="text-muted-foreground h-4 w-4" />
                  <div>
                    <p className="text-sm text-zinc-600 dark:text-zinc-400">
                      Time
                    </p>
                    <p className="font-medium">
                      {new Date(visit.visitDate).toLocaleTimeString("en-US", {
                        hour: "numeric",
                        minute: "2-digit",
                      })}
                    </p>
                  </div>
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <p className="text-sm text-zinc-600 dark:text-zinc-400">
                    Visit Type
                  </p>
                  <p className="font-medium">
                    {visit.visitType === "in_person"
                      ? "In-Person"
                      : "Telemedicine"}
                  </p>
                </div>

                {visit.location && (
                  <div className="flex items-start gap-2">
                    <MapPin className="text-muted-foreground mt-0.5 h-4 w-4" />
                    <div>
                      <p className="text-sm text-zinc-600 dark:text-zinc-400">
                        Location
                      </p>
                      <p className="font-medium">{visit.location}</p>
                    </div>
                  </div>
                )}
              </div>

              {visit.timeSpent && (
                <div className="rounded-md bg-blue-50 p-3 dark:bg-blue-900/20">
                  <p className="text-sm text-blue-800 dark:text-blue-300">
                    ⏱️ 45+ minutes spent on this visit
                  </p>
                </div>
              )}

              {visit.additionalNotes && (
                <div>
                  <p className="text-sm text-zinc-600 dark:text-zinc-400">
                    Additional Notes
                  </p>
                  <p className="mt-1 whitespace-pre-wrap">
                    {visit.additionalNotes}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Billing Information */}
          {billing && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <DollarSign className="h-5 w-5" />
                  Billing & Documentation
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {Array.isArray(billing.cptCodes) &&
                  billing.cptCodes.length > 0 && (
                    <div>
                      <p className="mb-2 text-sm text-zinc-600 dark:text-zinc-400">
                        CPT Codes
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {(billing.cptCodes as string[]).map((code) => (
                          <Badge key={code} variant="outline">
                            {code}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}

                {Array.isArray(billing.icd10Codes) &&
                  billing.icd10Codes.length > 0 && (
                    <div>
                      <p className="mb-2 text-sm text-zinc-600 dark:text-zinc-400">
                        ICD-10 Codes
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {(billing.icd10Codes as string[]).map((code) => (
                          <Badge key={code} variant="outline">
                            {code}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}

                {Array.isArray(billing.modifiers) &&
                  billing.modifiers.length > 0 && (
                    <div>
                      <p className="mb-2 text-sm text-zinc-600 dark:text-zinc-400">
                        Modifiers
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {(billing.modifiers as string[]).map((modifier) => (
                          <Badge key={modifier} variant="secondary">
                            {modifier}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}

                {billing.timeSpent && (
                  <div className="rounded-md bg-blue-50 p-3 dark:bg-blue-900/20">
                    <p className="text-sm text-blue-800 dark:text-blue-300">
                      ⏱️ Time-based billing applicable (45+ minutes)
                    </p>
                  </div>
                )}

                {billing.notes && (
                  <div>
                    <p className="text-sm text-zinc-600 dark:text-zinc-400">
                      Billing Notes
                    </p>
                    <p className="mt-1 text-sm whitespace-pre-wrap">
                      {billing.notes}
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {visit.followUpType && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  Follow-Up Plan
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <p className="text-sm text-zinc-600 dark:text-zinc-400">
                    Type
                  </p>
                  <p className="font-medium capitalize">{visit.followUpType}</p>
                </div>

                {visit.followUpDate && (
                  <div>
                    <p className="text-sm text-zinc-600 dark:text-zinc-400">
                      Scheduled Date
                    </p>
                    <p className="font-medium">
                      {new Date(visit.followUpDate).toLocaleDateString()}
                    </p>
                  </div>
                )}

                {visit.followUpNotes && (
                  <div>
                    <p className="text-sm text-zinc-600 dark:text-zinc-400">
                      Notes
                    </p>
                    <p className="mt-1 whitespace-pre-wrap">
                      {visit.followUpNotes}
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </div>

        {/* Assessments */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Wound Assessments</CardTitle>
                <Link
                  href={`/dashboard/patients/${patientId}/visits/${visitId}/assessments/new`}
                >
                  <Button size="sm" className="gap-1">
                    <Plus className="h-4 w-4" />
                    Add
                  </Button>
                </Link>
              </div>
            </CardHeader>
            <CardContent>
              {visit.assessments.length > 0 ? (
                <div className="space-y-3">
                  {visit.assessments.map(
                    (assessment: {
                      id: string;
                      woundId: string;
                      wound: { woundNumber: string; location: string };
                      healingStatus: string | null;
                      length: number | null;
                      width: number | null;
                      depth: number | null;
                      area: number | null;
                      createdAt: Date;
                    }) => (
                      <AssessmentCard
                        key={assessment.id}
                        assessment={{
                          ...assessment,
                          length: assessment.length,
                          width: assessment.width,
                          depth: assessment.depth,
                          area: assessment.area,
                        }}
                        patientId={patientId}
                        visitId={visitId}
                      />
                    )
                  )}
                </div>
              ) : (
                <div className="space-y-3 text-center">
                  <p className="text-sm text-zinc-600 dark:text-zinc-400">
                    No assessments recorded
                  </p>
                  <Link
                    href={`/dashboard/patients/${patientId}/visits/${visitId}/assessments/new`}
                  >
                    <Button variant="outline" size="sm" className="gap-1">
                      <Plus className="h-4 w-4" />
                      Add First Assessment
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
