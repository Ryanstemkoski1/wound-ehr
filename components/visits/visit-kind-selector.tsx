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
  Stethoscope,
  ClipboardCheck,
  ScanLine,
  UserX,
} from "lucide-react";

export type VisitKind =
  | "wound_care"
  | "skilled_nursing"
  | "skin_sweep"
  | "patient_not_seen";

type VisitKindSelectorProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelect: (kind: VisitKind) => void;
};

export function VisitKindSelector({
  open,
  onOpenChange,
  onSelect,
}: VisitKindSelectorProps) {
  const handleSelect = (kind: VisitKind) => {
    onSelect(kind);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[900px]!">
        <DialogHeader>
          <DialogTitle className="text-2xl">
            What kind of visit is this?
          </DialogTitle>
          <DialogDescription className="text-base">
            Pick the type of visit you are documenting. This determines which
            forms and workflows will be available.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-6 py-6 md:grid-cols-2">
          <Card
            className="hover:border-primary flex min-h-[200px] cursor-pointer flex-col transition-all hover:shadow-lg"
            onClick={() => handleSelect("wound_care")}
          >
            <CardHeader>
              <div className="flex flex-col items-center space-y-3 text-center">
                <div className="bg-primary/10 rounded-full p-4">
                  <Stethoscope className="text-primary h-8 w-8" />
                </div>
                <CardTitle className="text-xl">Wound Care</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="flex-1">
              <CardDescription className="text-center text-base leading-relaxed">
                Wound assessment, procedures, treatment orders
              </CardDescription>
            </CardContent>
          </Card>

          <Card
            className="hover:border-primary flex min-h-[200px] cursor-pointer flex-col transition-all hover:shadow-lg"
            onClick={() => handleSelect("skilled_nursing")}
          >
            <CardHeader>
              <div className="flex flex-col items-center space-y-3 text-center">
                <div className="bg-primary/10 rounded-full p-4">
                  <ClipboardCheck className="text-primary h-8 w-8" />
                </div>
                <CardTitle className="text-xl">Skilled Nursing</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="flex-1">
              <CardDescription className="text-center text-base leading-relaxed">
                Vitals, head-to-toe assessment, qualitative wound findings
              </CardDescription>
            </CardContent>
          </Card>

          <Card
            className="hover:border-primary flex min-h-[200px] cursor-pointer flex-col transition-all hover:shadow-lg"
            onClick={() => handleSelect("skin_sweep")}
          >
            <CardHeader>
              <div className="flex flex-col items-center space-y-3 text-center">
                <div className="bg-primary/10 rounded-full p-4">
                  <ScanLine className="text-primary h-8 w-8" />
                </div>
                <CardTitle className="text-xl">Skin Sweep</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="flex-1">
              <CardDescription className="text-center text-base leading-relaxed">
                Whole-body audit of the patient&apos;s skin
              </CardDescription>
            </CardContent>
          </Card>

          <Card
            className="hover:border-primary flex min-h-[200px] cursor-pointer flex-col transition-all hover:shadow-lg"
            onClick={() => handleSelect("patient_not_seen")}
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
                Document why a scheduled visit didn&apos;t happen
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
