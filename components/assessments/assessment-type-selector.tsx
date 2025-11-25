"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { FileText, Stethoscope, Activity } from "lucide-react";

type AssessmentType = "standard" | "skilled-nursing" | "gtube-procedure";

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
  const [selectedType, setSelectedType] = useState<AssessmentType | null>(null);

  const handleSelect = (type: AssessmentType) => {
    setSelectedType(type);
    onSelectType(type);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>Select Assessment Type</DialogTitle>
          <DialogDescription>
            Choose the type of assessment you want to create for this visit
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 md:grid-cols-3 py-4">
          <Card
            className="cursor-pointer transition-all hover:shadow-lg hover:border-primary"
            onClick={() => handleSelect("standard")}
          >
            <CardHeader>
              <div className="flex items-center space-x-2">
                <div className="rounded-full bg-primary/10 p-2">
                  <FileText className="h-5 w-5 text-primary" />
                </div>
                <CardTitle className="text-lg">Standard Assessment</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <CardDescription>
                Basic wound assessment including location, measurements, tissue type, drainage, and
                treatment plan. Used for routine wound care visits.
              </CardDescription>
            </CardContent>
          </Card>

          <Card
            className="cursor-pointer transition-all hover:shadow-lg hover:border-primary"
            onClick={() => handleSelect("skilled-nursing")}
          >
            <CardHeader>
              <div className="flex items-center space-x-2">
                <div className="rounded-full bg-primary/10 p-2">
                  <Stethoscope className="h-5 w-5 text-primary" />
                </div>
                <CardTitle className="text-lg">RN/LVN Assessment</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <CardDescription>
                Comprehensive skilled nursing visit assessment covering all body systems: vitals,
                cardiovascular, respiratory, neurological, GI/GU, nutrition, medications, and more.
              </CardDescription>
            </CardContent>
          </Card>

          <Card
            className="cursor-pointer transition-all hover:shadow-lg hover:border-primary"
            onClick={() => handleSelect("gtube-procedure")}
          >
            <CardHeader>
              <div className="flex items-center space-x-2">
                <div className="rounded-full bg-primary/10 p-2">
                  <Activity className="h-5 w-5 text-primary" />
                </div>
                <CardTitle className="text-lg">G-tube Procedure</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <CardDescription>
                MEND G-tube documentation including comorbidities, procedure details, tube
                assessment, peri-tube findings, replacement details, and verification methods.
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
