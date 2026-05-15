"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { SignaturePad } from "@/components/signatures/signature-pad";
import { createSignature } from "@/app/actions/signatures";
import { createConsentToTreatment } from "@/app/actions/new-forms";
import { toast } from "sonner";
import { Pen, ShieldCheck } from "lucide-react";

const PROCEDURES = [
  {
    value: "sharp_debridement",
    label: "Sharp Debridement",
    description:
      "Possibly involving a curette, scalpel, scissors, forceps, and silver nitrate",
  },
  {
    value: "incision_drainage",
    label: "Incision and Drainage (I&D)",
    description:
      "Possibly involving the use of an anaesthetic agent (lidocaine—given via syringe), a scalpel, curette, scissors, forceps, and/or a drainage wick",
  },
  {
    value: "tissue_biopsy",
    label: "Tissue Biopsy",
    description:
      "Using special biopsy instruments and scalpel, forceps, and scissors",
  },
  {
    value: "other",
    label: "Topical Anaesthesia",
    description:
      "Often a topical sprayed-on anaesthetic agent (benzocaine 20%) is used with any of the above procedures",
  },
];

type Props = {
  patientId: string;
  patientName: string;
  providerName: string;
  facilityName: string;
};

type SignatureStep =
  | "procedures"
  | "provider-sign"
  | "patient-sign"
  | "witness-sign"
  | "complete";

export default function ConsentToTreatmentForm({
  patientId,
  patientName,
  providerName,
  facilityName,
}: Props) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [step, setStep] = useState<SignatureStep>("procedures");

  // Form state
  const [selectedProcedures, setSelectedProcedures] = useState<string[]>([]);
  const [procedureOther, setProcedureOther] = useState("");

  // Signature IDs
  const [providerSignatureId, setProviderSignatureId] = useState<string | null>(
    null
  );
  const [patientSignatureId, setPatientSignatureId] = useState<string | null>(
    null
  );
  const [witnessSignatureId, setWitnessSignatureId] = useState<string | null>(
    null
  );
  const [patientRelationship, setPatientRelationship] = useState("");
  const [witnessName, setWitnessName] = useState("");
  const [witnessRelationship, setWitnessRelationship] = useState("");

  const toggleProcedure = (value: string) => {
    setSelectedProcedures((prev) =>
      prev.includes(value) ? prev.filter((p) => p !== value) : [...prev, value]
    );
  };

  const handleProviderSign = async (
    signatureData: string,
    method: "draw" | "type"
  ) => {
    try {
      const result = await createSignature({
        signatureType: "consent",
        patientId,
        signerName: providerName,
        signerRole: "Provider",
        signatureData,
        signatureMethod: method,
      });
      if (result.data) {
        setProviderSignatureId(result.data.id);
        setStep("patient-sign");
        toast.success("Provider signature captured");
      } else {
        toast.error("Failed to save provider signature");
      }
    } catch {
      toast.error("Error saving signature");
    }
  };

  const handlePatientSign = async (
    signatureData: string,
    method: "draw" | "type"
  ) => {
    try {
      const result = await createSignature({
        signatureType: "consent",
        patientId,
        signerName: patientName,
        signerRole: "Patient",
        signatureData,
        signatureMethod: method,
      });
      if (result.data) {
        setPatientSignatureId(result.data.id);
        setStep("witness-sign");
        toast.success("Patient signature captured");
      } else {
        toast.error("Failed to save patient signature");
      }
    } catch {
      toast.error("Error saving signature");
    }
  };

  const handleWitnessSign = async (
    signatureData: string,
    method: "draw" | "type"
  ) => {
    try {
      const result = await createSignature({
        signatureType: "consent",
        patientId,
        signerName: witnessName,
        signerRole: "Witness",
        signatureData,
        signatureMethod: method,
      });
      if (result.data) {
        setWitnessSignatureId(result.data.id);
        toast.success("Witness signature captured");
        // Auto-submit after witness
        await submitConsent(result.data.id);
      } else {
        toast.error("Failed to save witness signature");
      }
    } catch {
      toast.error("Error saving signature");
    }
  };

  const submitConsent = async (witnessSigId?: string) => {
    if (!patientSignatureId) {
      toast.error("Patient signature is required");
      return;
    }
    setIsSubmitting(true);
    try {
      const result = await createConsentToTreatment({
        patientId,
        procedures: selectedProcedures,
        procedureOther: selectedProcedures.includes("other")
          ? procedureOther
          : undefined,
        providerName,
        providerSignatureId: providerSignatureId || undefined,
        patientSignatureId: patientSignatureId || undefined,
        witnessSignatureId: witnessSigId || witnessSignatureId || undefined,
        witnessName: witnessName || undefined,
        witnessRelationship: witnessRelationship || undefined,
      });
      if (result.success) {
        toast.success("Consent to treatment saved");
        setStep("complete");
        router.push(`/dashboard/patients/${patientId}`);
      } else {
        toast.error(result.error || "Failed to save consent");
        setIsSubmitting(false);
      }
    } catch {
      toast.error("An unexpected error occurred");
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Info */}
      <Card>
        <CardContent className="grid grid-cols-1 gap-4 pt-6 md:grid-cols-3">
          <div>
            <Label className="text-xs text-zinc-500">Patient</Label>
            <p className="font-medium">{patientName}</p>
          </div>
          <div>
            <Label className="text-xs text-zinc-500">Provider</Label>
            <p className="font-medium">{providerName}</p>
          </div>
          <div>
            <Label className="text-xs text-zinc-500">Facility</Label>
            <p className="font-medium">{facilityName}</p>
          </div>
        </CardContent>
      </Card>

      {/* Step 1: Select Procedures */}
      {step === "procedures" && (
        <Card>
          <CardHeader>
            <CardTitle>Select Procedures</CardTitle>
            <p className="text-sm text-zinc-500">
              Select the procedures the patient is consenting to:
            </p>
          </CardHeader>
          <CardContent className="space-y-4">
            {PROCEDURES.map((proc) => (
              <div key={proc.value} className="flex items-start gap-3">
                <Checkbox
                  id={`proc-${proc.value}`}
                  checked={selectedProcedures.includes(proc.value)}
                  onCheckedChange={() => toggleProcedure(proc.value)}
                  className="mt-0.5"
                />
                <div>
                  <Label htmlFor={`proc-${proc.value}`} className="font-medium">
                    {proc.label}
                  </Label>
                  <p className="text-sm text-zinc-500">{proc.description}</p>
                </div>
              </div>
            ))}
            {selectedProcedures.includes("other") && (
              <Input
                value={procedureOther}
                onChange={(e) => setProcedureOther(e.target.value)}
                placeholder="Describe other procedures..."
                className="ml-7"
              />
            )}

            <div className="rounded-lg border bg-amber-50 p-3 text-sm text-amber-800 dark:bg-amber-950/30 dark:text-amber-300">
              <strong>Note:</strong> Sharp debridement should NOT be done in any
              area affecting a dialysis access site.
            </div>

            <div className="rounded-lg border bg-blue-50 p-3 text-sm text-blue-800 dark:bg-blue-950/30 dark:text-blue-300">
              <strong>Topical Anaesthesia:</strong> Often a topical sprayed-on
              anaesthetic agent (benzocaine 20%) is used with any of the above
              procedures.
            </div>

            <div className="flex justify-end pt-4">
              <Button
                onClick={() => setStep("provider-sign")}
                disabled={selectedProcedures.length === 0}
              >
                Continue to Signatures
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step 2: Provider Signature */}
      {step === "provider-sign" && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Pen className="h-5 w-5" />
              Provider Attestation & Signature
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <ScrollArea className="h-32 rounded-md border p-4">
              <p className="text-sm">
                I have explained to the patient/legal representative the nature
                and purposes of the above-listed procedures, the potential
                risks, possible benefits, reasonable alternatives, and
                limitations of the proposed treatment. I have answered all
                questions to the best of my knowledge. The patient/legal
                representative has been given the opportunity to ask questions
                and voluntarily consents to the treatment.
              </p>
            </ScrollArea>

            <SignaturePad
              onSave={handleProviderSign}
              onCancel={() => setStep("procedures")}
              signerName={providerName}
              title="Provider Signature"
              description="Sign to attest to the provider statement above"
              certificationText="I certify that I have explained the procedures and their risks to the patient."
            />
          </CardContent>
        </Card>
      )}

      {/* Step 3: Patient Signature */}
      {step === "patient-sign" && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ShieldCheck className="h-5 w-5" />
              Patient / Legal Representative Consent & Signature
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <ScrollArea className="h-40 rounded-md border p-4">
              <p className="text-sm">
                I have been told about the intended benefits, possible risks,
                and any alternatives to the procedure(s) listed above. I
                understand that additional procedures may become necessary
                during my treatment, and that this procedure may involve topical
                anaesthesia. I understand that my consent also gives approval
                for another provider in the same practice to do this same
                procedure(s) (as a part of standard best practice follow-up
                wound care) should the provider be unavailable.
              </p>
            </ScrollArea>

            <div className="max-w-xs">
              <Label htmlFor="patientRelationship">
                Relationship to Patient (if signing as legal representative)
              </Label>
              <Input
                id="patientRelationship"
                value={patientRelationship}
                onChange={(e) => setPatientRelationship(e.target.value)}
                placeholder="Self, Spouse, POA, etc."
              />
            </div>

            <SignaturePad
              onSave={handlePatientSign}
              onCancel={() => setStep("provider-sign")}
              signerName={patientName}
              title="Patient / Legal Representative Signature"
              description="Sign to consent to the listed procedures"
              certificationText="I consent to the procedures described above and confirm I understand the risks and alternatives."
            />
          </CardContent>
        </Card>
      )}

      {/* Step 4: Witness Signature (optional, for verbal consent) */}
      {step === "witness-sign" && (
        <Card>
          <CardHeader>
            <CardTitle>Witness Signature (Optional)</CardTitle>
            <p className="text-sm text-zinc-500">
              Required for verbal consent. Skip if not applicable.
            </p>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div>
                <Label htmlFor="witnessName">Witness Name</Label>
                <Input
                  id="witnessName"
                  value={witnessName}
                  onChange={(e) => setWitnessName(e.target.value)}
                />
              </div>
              <div>
                <Label htmlFor="witnessRelationship">Relationship</Label>
                <Input
                  id="witnessRelationship"
                  value={witnessRelationship}
                  onChange={(e) => setWitnessRelationship(e.target.value)}
                />
              </div>
            </div>

            {witnessName ? (
              <SignaturePad
                onSave={handleWitnessSign}
                onCancel={() => submitConsent()}
                signerName={witnessName}
                title="Witness Signature"
                description="Sign as witness to the patient's verbal consent"
                certificationText="I witnessed the patient's verbal consent to the procedures listed above."
              />
            ) : (
              <div className="flex justify-end gap-3">
                <Button
                  variant="outline"
                  onClick={() => setStep("patient-sign")}
                >
                  Back
                </Button>
                <Button onClick={() => submitConsent()} disabled={isSubmitting}>
                  {isSubmitting ? "Saving..." : "Save Without Witness"}
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
