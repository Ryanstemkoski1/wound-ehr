"use client";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  FileText,
  Stethoscope,
  Activity,
  Scissors,
  ScanEye,
  Zap,
  UserX,
} from "lucide-react";

type AssessmentType =
  | "standard"
  | "skilled-nursing"
  | "gtube-procedure"
  | "grafting"
  | "skin-sweep"
  | "debridement"
  | "patient-not-seen";

type AssessmentTypeSelectorProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelectType: (type: AssessmentType) => void;
};

export default function AssessmentTypeSelector({
  open,
  onOpenChange,
  onSelectType,
}: AssessmentTypeSelectorProps) {
  const handleSelect = (type: AssessmentType) => {
    onSelectType(type);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[1400px]!">
        <DialogHeader>
          <DialogTitle className="text-2xl">
            Choose What to Document
          </DialogTitle>
          <DialogDescription className="text-base">
            Select the form that matches what you need to document during this
            visit.
            <span className="mt-1 block text-sm text-blue-600 dark:text-blue-400">
              💡 <strong>Most common:</strong> Use &quot;Standard
              Assessment&quot; for regular wound documentation
            </span>
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-6 py-6 md:grid-cols-3 lg:grid-cols-4">
          <Card
            className="hover:border-primary flex min-h-[280px] cursor-pointer flex-col transition-all hover:shadow-lg"
            onClick={() => handleSelect("standard")}
          >
            <CardHeader>
              <div className="flex flex-col items-center space-y-3 text-center">
                <div className="bg-primary/10 rounded-full p-4">
                  <FileText className="text-primary h-8 w-8" />
                </div>
                <CardTitle className="text-xl">Standard Assessment</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="flex-1">
              <CardDescription className="text-center text-base leading-relaxed">
                Basic wound assessment including location, measurements, tissue
                type, drainage, and treatment plan. Used for routine wound care
                visits.
              </CardDescription>
            </CardContent>
          </Card>

          <Card
            className="hover:border-primary flex min-h-[280px] cursor-pointer flex-col transition-all hover:shadow-lg"
            onClick={() => handleSelect("skilled-nursing")}
          >
            <CardHeader>
              <div className="flex flex-col items-center space-y-3 text-center">
                <div className="bg-primary/10 rounded-full p-4">
                  <Stethoscope className="text-primary h-8 w-8" />
                </div>
                <CardTitle className="text-xl">RN/LVN Assessment</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="flex-1">
              <CardDescription className="text-center text-base leading-relaxed">
                Comprehensive skilled nursing visit assessment covering all body
                systems: vitals, cardiovascular, respiratory, neurological,
                GI/GU, nutrition, medications, and more.
              </CardDescription>
            </CardContent>
          </Card>

          <Card
            className="hover:border-primary flex min-h-[280px] cursor-pointer flex-col transition-all hover:shadow-lg"
            onClick={() => handleSelect("gtube-procedure")}
          >
            <CardHeader>
              <div className="flex flex-col items-center space-y-3 text-center">
                <div className="bg-primary/10 rounded-full p-4">
                  <Activity className="text-primary h-8 w-8" />
                </div>
                <CardTitle className="text-xl">G-tube Procedure</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="flex-1">
              <CardDescription className="text-center text-base leading-relaxed">
                MEND G-tube documentation including comorbidities, procedure
                details, tube assessment, peri-tube findings, replacement
                details, and verification methods.
              </CardDescription>
            </CardContent>
          </Card>

          <Card
            className="hover:border-primary flex min-h-[280px] cursor-pointer flex-col transition-all hover:shadow-lg"
            onClick={() => handleSelect("grafting")}
          >
            <CardHeader>
              <div className="flex flex-col items-center space-y-3 text-center">
                <div className="bg-primary/10 rounded-full p-4">
                  <Scissors className="text-primary h-8 w-8" />
                </div>
                <CardTitle className="text-xl">Grafting Assessment</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="flex-1">
              <CardDescription className="text-center text-base leading-relaxed">
                Skin graft procedure documentation including graft site, donor
                site, adherence, viability, fixation, post-op care, and
                follow-up instructions.
              </CardDescription>
            </CardContent>
          </Card>

          <Card
            className="hover:border-primary flex min-h-[280px] cursor-pointer flex-col transition-all hover:shadow-lg"
            onClick={() => handleSelect("skin-sweep")}
          >
            <CardHeader>
              <div className="flex flex-col items-center space-y-3 text-center">
                <div className="bg-primary/10 rounded-full p-4">
                  <ScanEye className="text-primary h-8 w-8" />
                </div>
                <CardTitle className="text-xl">Skin Sweep Assessment</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="flex-1">
              <CardDescription className="text-center text-base leading-relaxed">
                Comprehensive full-body skin inspection documenting all areas,
                wounds found, at-risk areas, prevention measures, and patient
                education.
              </CardDescription>
            </CardContent>
          </Card>

          <Card
            className="hover:border-primary flex min-h-[280px] cursor-pointer flex-col transition-all hover:shadow-lg"
            onClick={() => handleSelect("debridement")}
          >
            <CardHeader>
              <div className="flex flex-col items-center space-y-3 text-center">
                <div className="bg-primary/10 rounded-full p-4">
                  <Zap className="text-primary h-8 w-8" />
                </div>
                <CardTitle className="text-xl">Debridement</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="flex-1">
              <CardDescription className="text-center text-base leading-relaxed">
                Contactless ultrasonic debridement (Arobella) with pre/post
                wound assessment, device settings, procedure notes, goals, and
                medical necessity.
              </CardDescription>
            </CardContent>
          </Card>

          <Card
            className="hover:border-primary flex min-h-[280px] cursor-pointer flex-col transition-all hover:shadow-lg"
            onClick={() => handleSelect("patient-not-seen")}
          >
            <CardHeader>
              <div className="flex flex-col items-center space-y-3 text-center">
                <div className="bg-primary/10 rounded-full p-4">
                  <UserX className="text-primary h-8 w-8" />
                </div>
                <CardTitle className="text-xl">Patient Not Seen</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="flex-1">
              <CardDescription className="text-center text-base leading-relaxed">
                Document why a scheduled patient was not seen during this visit,
                including reason, pertinent notes, and follow-up plan.
              </CardDescription>
            </CardContent>
          </Card>
        </div>

        <div className="flex justify-end">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
