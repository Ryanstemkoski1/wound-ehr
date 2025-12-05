import { notFound } from "next/navigation";
import Link from "next/link";
import { Edit, Calendar, MapPin, Plus } from "lucide-react";
import { getWound, getWoundAssessments } from "@/app/actions/wounds";
import { getPhotos, getPhotosForComparison } from "@/app/actions/photos";
import { getVisitsForQuickAssessment } from "@/app/actions/visits";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { PhotoGallery } from "@/components/photos/photo-gallery";
import { PhotoComparison } from "@/components/photos/photo-comparison";
import WoundPDFDownloadButton from "@/components/pdf/wound-pdf-download-button";
import { DynamicBreadcrumbs } from "@/components/ui/dynamic-breadcrumbs";
import { WoundAssessmentHistory } from "@/components/wounds/wound-assessment-history";
import { WoundQuickStats } from "@/components/wounds/wound-quick-stats";
import { QuickAssessmentDialog } from "@/components/wounds/quick-assessment-dialog";
import { format } from "date-fns";

// Force dynamic rendering (requires auth)
export const dynamic = "force-dynamic";

// Normalize raw DB rows to the PhotoGallery shape
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapPhoto(p: any) {
  const safeDate = (value: unknown) =>
    value ? new Date(value as string) : new Date("1970-01-01T00:00:00.000Z");

  return {
    id: p.id,
    url: p.url,
    filename: p.filename,
    caption: p.caption ?? null,
    uploadedAt: safeDate(p.uploaded_at ?? p.uploadedAt),
    wound: {
      id: p.wound?.id,
      woundNumber: p.wound?.wound_number ?? p.wound?.woundNumber,
      location: p.wound?.location,
    },
    visit: p.visit
      ? {
          id: p.visit.id,
          visitDate: safeDate(p.visit.visit_date ?? p.visit.visitDate),
          visitType: p.visit.visit_type ?? p.visit.visitType,
        }
      : null,
    assessment: p.assessment
      ? {
          id: p.assessment.id,
          healingStatus:
            p.assessment.healing_status ?? p.assessment.healingStatus ?? null,
          length:
            p.assessment.length !== undefined ? p.assessment.length : null,
          width: p.assessment.width !== undefined ? p.assessment.width : null,
          depth: p.assessment.depth !== undefined ? p.assessment.depth : null,
          area: p.assessment.area !== undefined ? p.assessment.area : null,
        }
      : null,
    uploader: p.uploader
      ? { name: p.uploader.name ?? null, email: p.uploader.email ?? "" }
      : { name: null, email: "" },
  };
}

export default async function WoundDetailPage({
  params,
}: {
  params: Promise<{ id: string; woundId: string }>;
}) {
  const { id: patientId, woundId } = await params;

  const wound = await getWound(woundId);

  if (!wound) {
    notFound();
  }

  // Fetch all assessments for this wound
  const assessments = await getWoundAssessments(woundId);

  // Fetch visits for quick assessment dialog
  const visits = await getVisitsForQuickAssessment(patientId);

  // Get photos
  const photosResult = await getPhotos(woundId);
  const comparisonResult = await getPhotosForComparison(woundId);

  const photos = (photosResult.photos || []).map(mapPhoto);
  const comparisonPhotos = (comparisonResult.photos || []).map(mapPhoto);

  // Calculate stats from assessments
  const latestAssessment = assessments[0];
  const previousAssessment = assessments[1];

  const latestMeasurements = latestAssessment
    ? {
        length: latestAssessment.length,
        width: latestAssessment.width,
        area: latestAssessment.area,
      }
    : null;

  const previousMeasurements = previousAssessment
    ? {
        length: previousAssessment.length,
        width: previousAssessment.width,
        area: previousAssessment.area,
      }
    : null;

  return (
    <div className="space-y-6">
      {/* Breadcrumbs */}
      <DynamicBreadcrumbs
        customSegments={[
          { label: "Patients", href: "/dashboard/patients" },
          {
            label: `${wound.patient.firstName} ${wound.patient.lastName}`,
            href: `/dashboard/patients/${patientId}`,
          },
          { label: `Wound #${wound.woundNumber}` },
        ]}
      />

      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight">
              Wound #{wound.woundNumber}
            </h1>
            <Badge
              variant={wound.status === "active" ? "default" : "secondary"}
              className="capitalize"
            >
              {wound.status}
            </Badge>
          </div>
          <p className="text-muted-foreground">
            {wound.patient.firstName} {wound.patient.lastName}
          </p>
        </div>

        <div className="flex gap-2">
          <WoundPDFDownloadButton
            woundId={woundId}
            location={wound.location}
            patientName={`${wound.patient.firstName} ${wound.patient.lastName}`}
          />
          <Link
            href={`/dashboard/patients/${patientId}/wounds/${woundId}/edit`}
          >
            <Button>
              <Edit className="mr-2 h-4 w-4" />
              Edit Wound
            </Button>
          </Link>
        </div>
      </div>

      {/* Wound Info */}
      <Card>
        <CardHeader>
          <CardTitle>Wound Information</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            <div>
              <p className="text-muted-foreground text-sm">Location</p>
              <div className="mt-1 flex items-center gap-2">
                <MapPin className="text-muted-foreground h-4 w-4" />
                <p className="font-medium capitalize">
                  {wound.location.replace("_", " ")}
                </p>
              </div>
            </div>

            <div>
              <p className="text-muted-foreground text-sm">Type</p>
              <p className="mt-1 font-medium capitalize">
                {wound.woundType.replace("_", " ")}
              </p>
            </div>

            <div>
              <p className="text-muted-foreground text-sm">Onset Date</p>
              <div className="mt-1 flex items-center gap-2">
                <Calendar className="text-muted-foreground h-4 w-4" />
                <p className="font-medium">
                  {format(new Date(wound.onsetDate), "MMM d, yyyy")}
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Quick Stats */}
      {assessments.length > 0 && (
        <WoundQuickStats
          onsetDate={wound.onsetDate}
          assessmentCount={assessments.length}
          latestMeasurements={latestMeasurements}
          previousMeasurements={previousMeasurements}
          latestHealingStatus={latestAssessment?.healingStatus || null}
        />
      )}

      {/* Assessment History */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Assessment History</CardTitle>
              <CardDescription className="mt-1.5">
                Complete record of all assessments for this wound across all visits
              </CardDescription>
            </div>
            <QuickAssessmentDialog
              patientId={patientId}
              woundId={woundId}
              woundNumber={wound.woundNumber}
              visits={visits}
            >
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                Add Assessment
              </Button>
            </QuickAssessmentDialog>
          </div>
        </CardHeader>
        <CardContent>
          {assessments.length > 0 ? (
            <>
              <p className="text-sm text-blue-600 dark:text-blue-400 mb-6">
                💡 <strong>Quick Tip:</strong> Click any assessment card to view full details and edit. Click "Add Assessment" above to document this wound at a specific visit.
              </p>
              <WoundAssessmentHistory
                patientId={patientId}
                woundId={woundId}
                assessments={assessments}
              />
            </>
          ) : (
            <div className="text-center py-12">
              <div className="mx-auto h-12 w-12 rounded-full bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center mb-4">
                <Plus className="h-6 w-6 text-primary" />
              </div>
              <h3 className="text-lg font-semibold mb-2">Ready to Document?</h3>
              <p className="text-muted-foreground mb-6 max-w-md mx-auto">
                Start tracking this wound's progress by creating your first assessment during a patient visit.
              </p>
              <QuickAssessmentDialog
                patientId={patientId}
                woundId={woundId}
                woundNumber={wound.woundNumber}
                visits={visits}
              >
                <Button size="lg">
                  <Plus className="mr-2 h-4 w-4" />
                  Add First Assessment
                </Button>
              </QuickAssessmentDialog>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Photos Section */}
      {photos.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>All Photos ({photos.length})</CardTitle>
            <CardDescription>
              View and compare all wound photos from assessments to track healing progress
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="gallery" className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="gallery">
                  Gallery ({photos.length})
                </TabsTrigger>
                <TabsTrigger value="comparison">Comparison</TabsTrigger>
              </TabsList>

              <TabsContent value="gallery" className="mt-6">
                <PhotoGallery photos={photos} />
              </TabsContent>

              <TabsContent value="comparison" className="mt-6">
                <PhotoComparison photos={comparisonPhotos} />
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
