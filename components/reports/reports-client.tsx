"use client";

/**
 * Reports Client Component
 * Tabbed interface for all report types
 */

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { VisitLogReport } from "@/components/reports/visit-log-report";
import { ClinicianActivityReport } from "@/components/reports/clinician-activity-report";
import { FacilitySummaryReport } from "@/components/reports/facility-summary-report";
import { MedicalRecordsRequest } from "@/components/reports/medical-records-request";

type ReportsClientProps = {
  facilities: Array<{ id: string; name: string }>;
  clinicians: Array<{ id: string; name: string; credentials?: string }>;
  patients: Array<{
    id: string;
    first_name: string;
    last_name: string;
    mrn: string;
  }>;
};

export function ReportsClient({
  facilities,
  clinicians,
  patients,
}: ReportsClientProps) {
  return (
    <Tabs defaultValue="visit-log" className="space-y-4">
      <TabsList className="grid w-full grid-cols-4">
        <TabsTrigger value="visit-log">Visit Log</TabsTrigger>
        <TabsTrigger value="clinician">Clinician Activity</TabsTrigger>
        <TabsTrigger value="facility">Facility Summary</TabsTrigger>
        <TabsTrigger value="records">Medical Records</TabsTrigger>
      </TabsList>

      <TabsContent value="visit-log" className="space-y-4">
        <VisitLogReport facilities={facilities} clinicians={clinicians} />
      </TabsContent>

      <TabsContent value="clinician" className="space-y-4">
        <ClinicianActivityReport clinicians={clinicians} />
      </TabsContent>

      <TabsContent value="facility" className="space-y-4">
        <FacilitySummaryReport facilities={facilities} />
      </TabsContent>

      <TabsContent value="records" className="space-y-4">
        <MedicalRecordsRequest patients={patients} />
      </TabsContent>
    </Tabs>
  );
}
