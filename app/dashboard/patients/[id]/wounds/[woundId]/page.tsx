import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Edit, Calendar, MapPin } from "lucide-react";
import { getWound } from "@/app/actions/wounds";
import { getPhotos, getPhotosForComparison } from "@/app/actions/photos";
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
import { PhotoUpload } from "@/components/photos/photo-upload";
import { PhotoGallery } from "@/components/photos/photo-gallery";
import { PhotoComparison } from "@/components/photos/photo-comparison";
import WoundPDFDownloadButton from "@/components/pdf/wound-pdf-download-button";
import { format } from "date-fns";

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

  const photosResult = await getPhotos(woundId);
  const comparisonResult = await getPhotosForComparison(woundId);

  const photos = photosResult.photos || [];
  const comparisonPhotos = comparisonResult.photos || [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Link
              href={`/dashboard/patients/${patientId}`}
              className="text-muted-foreground hover:text-foreground transition-colors"
            >
              <ArrowLeft className="h-4 w-4" />
            </Link>
            <h1 className="text-2xl font-bold tracking-tight">
              {wound.woundNumber}
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

      {/* Photos Section */}
      <Card>
        <CardHeader>
          <CardTitle>Wound Photos</CardTitle>
          <CardDescription>
            Upload, view, and compare wound photos to track healing progress
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="gallery" className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="gallery">
                Gallery ({photos.length})
              </TabsTrigger>
              <TabsTrigger value="upload">Upload</TabsTrigger>
              <TabsTrigger value="comparison">Comparison</TabsTrigger>
            </TabsList>

            <TabsContent value="gallery" className="mt-6">
              <PhotoGallery photos={photos} />
            </TabsContent>

            <TabsContent value="upload" className="mt-6">
              <PhotoUpload woundId={woundId} className="mx-auto max-w-2xl" />
            </TabsContent>

            <TabsContent value="comparison" className="mt-6">
              <PhotoComparison photos={comparisonPhotos} />
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}
