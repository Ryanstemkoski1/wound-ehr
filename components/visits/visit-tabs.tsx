"use client";

import * as React from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Bandage,
  Calendar,
  ClipboardList,
  FolderOpen,
  Heart,
  type LucideIcon,
  MessageSquare,
  Microscope,
  Notebook,
  Pill,
  Stethoscope,
} from "lucide-react";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

import { ChiefComplaintTab } from "@/components/visits/tabs/chief-complaint-tab";
import { ClinicalNotesTab } from "@/components/visits/tabs/clinical-notes-tab";
import { PhysicalExamTab } from "@/components/visits/tabs/physical-exam-tab";
import { PmhIcd10Tab } from "@/components/visits/tabs/pmh-icd10-tab";
import { ReviewOfSystemsTab } from "@/components/visits/tabs/ros-tab";
import { RxOrdersTab } from "@/components/visits/tabs/rx-orders-tab";
import { StudiesTab } from "@/components/visits/tabs/studies-tab";
import { VitalsTab } from "@/components/visits/tabs/vitals-tab";

export const VISIT_TAB_VALUES = [
  "vitals",
  "cc",
  "ros",
  "pe",
  "wound",
  "pmh",
  "studies",
  "notes",
  "rx",
  "timeline",
] as const;

export type VisitTabValue = (typeof VISIT_TAB_VALUES)[number];

const DEFAULT_TAB: VisitTabValue = "wound";

type TabDescriptor = {
  value: VisitTabValue;
  label: string;
  icon: LucideIcon;
};

const TAB_DESCRIPTORS: readonly TabDescriptor[] = [
  { value: "vitals", label: "Vitals", icon: Heart },
  { value: "cc", label: "Chief Complaint", icon: MessageSquare },
  { value: "ros", label: "Review of Systems", icon: ClipboardList },
  { value: "pe", label: "Physical Exam", icon: Stethoscope },
  { value: "wound", label: "Wound Assessment", icon: Bandage },
  { value: "pmh", label: "PMH / ICD-10", icon: FolderOpen },
  { value: "studies", label: "Studies", icon: Microscope },
  { value: "notes", label: "Clinical Notes", icon: Notebook },
  { value: "rx", label: "Rx Orders", icon: Pill },
  { value: "timeline", label: "Timeline", icon: Calendar },
];

export type VisitTabsProps = {
  visitId: string;
  patientId: string;
  emDocumentation: {
    vitals?: string;
    cc_hpi?: string;
    ros?: string;
    pe?: string;
    clinical_notes?: string;
    rx_orders?: string;
  } | null;
  readOnly: boolean;
  woundAssessmentSlot: React.ReactNode;
  timelineSlot: React.ReactNode;
};

function isVisitTabValue(value: string | null): value is VisitTabValue {
  return value !== null && (VISIT_TAB_VALUES as readonly string[]).includes(value);
}

export function VisitTabs({
  visitId,
  patientId,
  emDocumentation,
  readOnly,
  woundAssessmentSlot,
  timelineSlot,
}: VisitTabsProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const rawTab = searchParams.get("tab");
  const activeTab: VisitTabValue = isVisitTabValue(rawTab) ? rawTab : DEFAULT_TAB;

  const handleTabChange = React.useCallback(
    (next: string) => {
      if (!isVisitTabValue(next)) {
        return;
      }
      const params = new URLSearchParams(searchParams.toString());
      params.set("tab", next);
      router.replace(`?${params.toString()}`, { scroll: false });
    },
    [router, searchParams],
  );

  return (
    <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full">
      <div className="overflow-x-auto">
        <TabsList className="flex w-max min-w-full gap-1">
          {TAB_DESCRIPTORS.map(({ value, label, icon: Icon }) => (
            <TabsTrigger key={value} value={value} className="flex items-center gap-2 whitespace-nowrap">
              <Icon className="h-4 w-4" aria-hidden="true" />
              <span>{label}</span>
            </TabsTrigger>
          ))}
        </TabsList>
      </div>

      <TabsContent value="vitals">
        <VitalsTab visitId={visitId} initial={emDocumentation} readOnly={readOnly} />
      </TabsContent>

      <TabsContent value="cc">
        <ChiefComplaintTab visitId={visitId} initial={emDocumentation} readOnly={readOnly} />
      </TabsContent>

      <TabsContent value="ros">
        <ReviewOfSystemsTab visitId={visitId} initial={emDocumentation} readOnly={readOnly} />
      </TabsContent>

      <TabsContent value="pe">
        <PhysicalExamTab visitId={visitId} initial={emDocumentation} readOnly={readOnly} />
      </TabsContent>

      <TabsContent value="wound">{woundAssessmentSlot}</TabsContent>

      <TabsContent value="pmh">
        <PmhIcd10Tab patientId={patientId} visitId={visitId} readOnly={readOnly} />
      </TabsContent>

      <TabsContent value="studies">
        <StudiesTab visitId={visitId} readOnly={readOnly} />
      </TabsContent>

      <TabsContent value="notes">
        <ClinicalNotesTab visitId={visitId} initial={emDocumentation} readOnly={readOnly} />
      </TabsContent>

      <TabsContent value="rx">
        <RxOrdersTab visitId={visitId} initial={emDocumentation} readOnly={readOnly} />
      </TabsContent>

      <TabsContent value="timeline">{timelineSlot}</TabsContent>
    </Tabs>
  );
}

export default VisitTabs;
