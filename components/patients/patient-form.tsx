"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { createPatient, updatePatient } from "@/app/actions/patients";
import { ArrowLeft, Plus, X, Lock } from "lucide-react";
import Link from "next/link";
import type { Credentials } from "@/lib/credentials";
import type { UserRole } from "@/lib/rbac";
import {
  getPatientFieldPermissions,
  getReadOnlyReason,
} from "@/lib/field-permissions";

type Facility = {
  id: string;
  name: string;
};

type InsuranceInfo = {
  primary?: {
    provider: string;
    policyNumber: string;
    groupNumber: string;
  };
  secondary?: {
    provider: string;
    policyNumber: string;
    groupNumber: string;
  };
};

type EmergencyContact = {
  name: string;
  phone: string;
  relationship: string;
};

type Patient = {
  id: string;
  facilityId: string;
  firstName: string;
  lastName: string;
  dob: Date;
  mrn: string;
  gender: string | null;
  phone: string | null;
  email: string | null;
  address: string | null;
  city: string | null;
  state: string | null;
  zip: string | null;
  insuranceInfo: InsuranceInfo | null;
  emergencyContact: EmergencyContact | null;
  allergies: string[] | null;
  medicalHistory: string[] | null;
};

type PatientFormProps = {
  patient?: Patient;
  facilities: Facility[];
  userCredentials: Credentials | null;
  userRole: UserRole | null;
};

export default function PatientForm({
  patient,
  facilities,
  userCredentials,
  userRole,
}: PatientFormProps) {
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const isEdit = !!patient;

  // Get field permissions based on user credentials and role
  const permissions = getPatientFieldPermissions(userCredentials, userRole);

  // Check which field categories are read-only
  const isDemographicsReadOnly = permissions.demographics !== "edit";
  const isContactReadOnly = permissions.contact !== "edit";
  const isInsuranceReadOnly = permissions.insurance !== "edit";
  const isEmergencyContactReadOnly = permissions.emergency_contact !== "edit";

  // State for JSONB fields
  const [allergies, setAllergies] = useState<string[]>(
    patient?.allergies || []
  );
  const [medicalHistory, setMedicalHistory] = useState<string[]>(
    patient?.medicalHistory || []
  );
  const [newAllergy, setNewAllergy] = useState("");
  const [newCondition, setNewCondition] = useState("");

  // Format date for input (YYYY-MM-DD)
  const formatDate = (date: Date) => {
    return new Date(date).toISOString().split("T")[0];
  };

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError("");

    const formData = new FormData(e.currentTarget);

    // Add JSONB fields
    formData.append("allergies", JSON.stringify(allergies));
    formData.append("medicalHistory", JSON.stringify(medicalHistory));

    // Primary insurance
    const primaryInsurance = {
      provider: formData.get("primaryInsuranceProvider") || "",
      policyNumber: formData.get("primaryPolicyNumber") || "",
      groupNumber: formData.get("primaryGroupNumber") || "",
    };
    formData.append("primaryInsurance", JSON.stringify(primaryInsurance));

    // Secondary insurance
    const secondaryInsurance = {
      provider: formData.get("secondaryInsuranceProvider") || "",
      policyNumber: formData.get("secondaryPolicyNumber") || "",
      groupNumber: formData.get("secondaryGroupNumber") || "",
    };
    formData.append("secondaryInsurance", JSON.stringify(secondaryInsurance));

    // Emergency contact
    const emergencyContact = {
      name: formData.get("emergencyContactName") || "",
      phone: formData.get("emergencyContactPhone") || "",
      relationship: formData.get("emergencyContactRelationship") || "",
    };
    formData.append("emergencyContact", JSON.stringify(emergencyContact));

    const result = isEdit
      ? await updatePatient(patient.id, formData)
      : await createPatient(formData);

    if (result.error) {
      setError(result.error);
      setLoading(false);
      toast.error(
        isEdit ? "Failed to update patient" : "Failed to create patient",
        {
          description: result.error,
        }
      );
    } else {
      toast.success(
        isEdit
          ? "Patient updated successfully"
          : "Patient created successfully",
        {
          description: isEdit
            ? `${patient.firstName} ${patient.lastName}'s information has been updated.`
            : "You can now add wounds and schedule visits.",
        }
      );
      router.push("/dashboard/patients");
      router.refresh();
    }
  }

  function addAllergy() {
    if (newAllergy.trim()) {
      setAllergies([...allergies, newAllergy.trim()]);
      setNewAllergy("");
    }
  }

  function removeAllergy(index: number) {
    setAllergies(allergies.filter((_, i) => i !== index));
  }

  function addCondition() {
    if (newCondition.trim()) {
      setMedicalHistory([...medicalHistory, newCondition.trim()]);
      setNewCondition("");
    }
  }

  function removeCondition(index: number) {
    setMedicalHistory(medicalHistory.filter((_, i) => i !== index));
  }

  // Helper component for read-only field labels
  const ReadOnlyLabel = ({
    htmlFor,
    children,
    required = false,
  }: {
    htmlFor: string;
    children: React.ReactNode;
    required?: boolean;
  }) => {
    const reason = getReadOnlyReason("demographics", userCredentials, userRole);

    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Label
              htmlFor={htmlFor}
              className="flex cursor-help items-center gap-2"
            >
              <Lock className="text-muted-foreground h-3 w-3" />
              {children}
              {required && <span className="text-red-500">*</span>}
            </Label>
          </TooltipTrigger>
          <TooltipContent>
            <p className="text-sm">{reason}</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/dashboard/patients">
          <Button variant="ghost" size="sm" className="gap-2">
            <ArrowLeft className="h-4 w-4" />
            Back
          </Button>
        </Link>
        <div>
          <h1 className="text-3xl font-bold">
            {isEdit ? "Edit Patient" : "Add Patient"}
          </h1>
          <p className="text-zinc-600 dark:text-zinc-400">
            {isEdit
              ? "Update patient information"
              : "Create a new patient record"}
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit}>
        {error && (
          <div className="rounded-md bg-red-50 p-3 text-sm text-red-800 dark:bg-red-950 dark:text-red-200">
            {error}
          </div>
        )}

        <Tabs defaultValue="demographics" className="space-y-6">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="demographics">Demographics</TabsTrigger>
            <TabsTrigger value="insurance">Insurance</TabsTrigger>
            <TabsTrigger value="medical">Medical Info</TabsTrigger>
            <TabsTrigger value="emergency">Emergency Contact</TabsTrigger>
          </TabsList>

          {/* Demographics Tab */}
          <TabsContent value="demographics" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  Basic Information
                  {isDemographicsReadOnly && (
                    <span className="text-muted-foreground text-xs font-normal">
                      (Admin Only)
                    </span>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  {isDemographicsReadOnly ? (
                    <ReadOnlyLabel htmlFor="facilityId" required>
                      Facility
                    </ReadOnlyLabel>
                  ) : (
                    <Label htmlFor="facilityId">
                      Facility <span className="text-red-500">*</span>
                    </Label>
                  )}
                  <Select
                    name="facilityId"
                    defaultValue={patient?.facilityId}
                    required
                    disabled={isDemographicsReadOnly}
                  >
                    <SelectTrigger
                      className={
                        isDemographicsReadOnly
                          ? "bg-muted cursor-not-allowed"
                          : ""
                      }
                    >
                      <SelectValue placeholder="Select facility" />
                    </SelectTrigger>
                    <SelectContent>
                      {facilities.map((facility) => (
                        <SelectItem key={facility.id} value={facility.id}>
                          {facility.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    {isDemographicsReadOnly ? (
                      <ReadOnlyLabel htmlFor="firstName" required>
                        First Name
                      </ReadOnlyLabel>
                    ) : (
                      <Label htmlFor="firstName">
                        First Name <span className="text-red-500">*</span>
                      </Label>
                    )}
                    <Input
                      id="firstName"
                      name="firstName"
                      defaultValue={patient?.firstName}
                      required
                      placeholder="John"
                      disabled={isDemographicsReadOnly}
                      className={
                        isDemographicsReadOnly
                          ? "bg-muted cursor-not-allowed"
                          : ""
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    {isDemographicsReadOnly ? (
                      <ReadOnlyLabel htmlFor="lastName" required>
                        Last Name
                      </ReadOnlyLabel>
                    ) : (
                      <Label htmlFor="lastName">
                        Last Name <span className="text-red-500">*</span>
                      </Label>
                    )}
                    <Input
                      id="lastName"
                      name="lastName"
                      defaultValue={patient?.lastName}
                      required
                      placeholder="Doe"
                      disabled={isDemographicsReadOnly}
                      className={
                        isDemographicsReadOnly
                          ? "bg-muted cursor-not-allowed"
                          : ""
                      }
                    />
                  </div>
                </div>

                <div className="grid gap-4 md:grid-cols-3">
                  <div className="space-y-2">
                    {isDemographicsReadOnly ? (
                      <ReadOnlyLabel htmlFor="dob" required>
                        Date of Birth
                      </ReadOnlyLabel>
                    ) : (
                      <Label htmlFor="dob">
                        Date of Birth <span className="text-red-500">*</span>
                      </Label>
                    )}
                    <Input
                      id="dob"
                      name="dob"
                      type="date"
                      defaultValue={patient?.dob ? formatDate(patient.dob) : ""}
                      required
                      disabled={isDemographicsReadOnly}
                      className={
                        isDemographicsReadOnly
                          ? "bg-muted cursor-not-allowed"
                          : ""
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    {isDemographicsReadOnly ? (
                      <ReadOnlyLabel htmlFor="gender">Gender</ReadOnlyLabel>
                    ) : (
                      <Label htmlFor="gender">Gender</Label>
                    )}
                    <Select
                      name="gender"
                      defaultValue={patient?.gender || ""}
                      disabled={isDemographicsReadOnly}
                    >
                      <SelectTrigger
                        className={
                          isDemographicsReadOnly
                            ? "bg-muted cursor-not-allowed"
                            : ""
                        }
                      >
                        <SelectValue placeholder="Select gender" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Male">Male</SelectItem>
                        <SelectItem value="Female">Female</SelectItem>
                        <SelectItem value="Other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    {isDemographicsReadOnly ? (
                      <ReadOnlyLabel htmlFor="mrn" required>
                        MRN
                      </ReadOnlyLabel>
                    ) : (
                      <Label htmlFor="mrn">
                        MRN <span className="text-red-500">*</span>
                      </Label>
                    )}
                    <Input
                      id="mrn"
                      name="mrn"
                      defaultValue={patient?.mrn}
                      required
                      placeholder="123456"
                      disabled={isDemographicsReadOnly}
                      className={
                        isDemographicsReadOnly
                          ? "bg-muted cursor-not-allowed"
                          : ""
                      }
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  Contact Information
                  {isContactReadOnly && (
                    <span className="text-muted-foreground text-xs font-normal">
                      (Admin Only)
                    </span>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    {isContactReadOnly ? (
                      <ReadOnlyLabel htmlFor="phone">Phone</ReadOnlyLabel>
                    ) : (
                      <Label htmlFor="phone">Phone</Label>
                    )}
                    <Input
                      id="phone"
                      name="phone"
                      type="tel"
                      defaultValue={patient?.phone || ""}
                      placeholder="(555) 123-4567"
                      disabled={isContactReadOnly}
                      className={
                        isContactReadOnly ? "bg-muted cursor-not-allowed" : ""
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    {isContactReadOnly ? (
                      <ReadOnlyLabel htmlFor="email">Email</ReadOnlyLabel>
                    ) : (
                      <Label htmlFor="email">Email</Label>
                    )}
                    <Input
                      id="email"
                      name="email"
                      type="email"
                      defaultValue={patient?.email || ""}
                      placeholder="john.doe@example.com"
                      disabled={isContactReadOnly}
                      className={
                        isContactReadOnly ? "bg-muted cursor-not-allowed" : ""
                      }
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  {isContactReadOnly ? (
                    <ReadOnlyLabel htmlFor="address">
                      Street Address
                    </ReadOnlyLabel>
                  ) : (
                    <Label htmlFor="address">Street Address</Label>
                  )}
                  <Input
                    id="address"
                    name="address"
                    defaultValue={patient?.address || ""}
                    placeholder="123 Main Street"
                    disabled={isContactReadOnly}
                    className={
                      isContactReadOnly ? "bg-muted cursor-not-allowed" : ""
                    }
                  />
                </div>

                <div className="grid gap-4 md:grid-cols-3">
                  <div className="space-y-2">
                    {isContactReadOnly ? (
                      <ReadOnlyLabel htmlFor="city">City</ReadOnlyLabel>
                    ) : (
                      <Label htmlFor="city">City</Label>
                    )}
                    <Input
                      id="city"
                      name="city"
                      defaultValue={patient?.city || ""}
                      placeholder="Springfield"
                      disabled={isContactReadOnly}
                      className={
                        isContactReadOnly ? "bg-muted cursor-not-allowed" : ""
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    {isContactReadOnly ? (
                      <ReadOnlyLabel htmlFor="state">State</ReadOnlyLabel>
                    ) : (
                      <Label htmlFor="state">State</Label>
                    )}
                    <Input
                      id="state"
                      name="state"
                      defaultValue={patient?.state || ""}
                      placeholder="IL"
                      disabled={isContactReadOnly}
                      className={
                        isContactReadOnly ? "bg-muted cursor-not-allowed" : ""
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    {isContactReadOnly ? (
                      <ReadOnlyLabel htmlFor="zip">ZIP Code</ReadOnlyLabel>
                    ) : (
                      <Label htmlFor="zip">ZIP Code</Label>
                    )}
                    <Input
                      id="zip"
                      name="zip"
                      defaultValue={patient?.zip || ""}
                      placeholder="62701"
                      disabled={isContactReadOnly}
                      className={
                        isContactReadOnly ? "bg-muted cursor-not-allowed" : ""
                      }
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Insurance Tab */}
          <TabsContent value="insurance" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  Primary Insurance
                  {isInsuranceReadOnly && (
                    <span className="text-muted-foreground text-xs font-normal">
                      (Admin Only)
                    </span>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  {isInsuranceReadOnly ? (
                    <ReadOnlyLabel htmlFor="primaryInsuranceProvider">
                      Provider
                    </ReadOnlyLabel>
                  ) : (
                    <Label htmlFor="primaryInsuranceProvider">Provider</Label>
                  )}
                  <Input
                    id="primaryInsuranceProvider"
                    name="primaryInsuranceProvider"
                    defaultValue={
                      patient?.insuranceInfo?.primary?.provider || ""
                    }
                    placeholder="Blue Cross Blue Shield"
                    disabled={isInsuranceReadOnly}
                    className={
                      isInsuranceReadOnly ? "bg-muted cursor-not-allowed" : ""
                    }
                  />
                </div>
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    {isInsuranceReadOnly ? (
                      <ReadOnlyLabel htmlFor="primaryPolicyNumber">
                        Policy Number
                      </ReadOnlyLabel>
                    ) : (
                      <Label htmlFor="primaryPolicyNumber">Policy Number</Label>
                    )}
                    <Input
                      id="primaryPolicyNumber"
                      name="primaryPolicyNumber"
                      defaultValue={
                        patient?.insuranceInfo?.primary?.policyNumber || ""
                      }
                      placeholder="ABC123456"
                      disabled={isInsuranceReadOnly}
                      className={
                        isInsuranceReadOnly ? "bg-muted cursor-not-allowed" : ""
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    {isInsuranceReadOnly ? (
                      <ReadOnlyLabel htmlFor="primaryGroupNumber">
                        Group Number
                      </ReadOnlyLabel>
                    ) : (
                      <Label htmlFor="primaryGroupNumber">Group Number</Label>
                    )}
                    <Input
                      id="primaryGroupNumber"
                      name="primaryGroupNumber"
                      defaultValue={
                        patient?.insuranceInfo?.primary?.groupNumber || ""
                      }
                      placeholder="GRP789"
                      disabled={isInsuranceReadOnly}
                      className={
                        isInsuranceReadOnly ? "bg-muted cursor-not-allowed" : ""
                      }
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  Secondary Insurance
                  {isInsuranceReadOnly && (
                    <span className="text-muted-foreground text-xs font-normal">
                      (Admin Only)
                    </span>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  {isInsuranceReadOnly ? (
                    <ReadOnlyLabel htmlFor="secondaryInsuranceProvider">
                      Provider
                    </ReadOnlyLabel>
                  ) : (
                    <Label htmlFor="secondaryInsuranceProvider">Provider</Label>
                  )}
                  <Input
                    id="secondaryInsuranceProvider"
                    name="secondaryInsuranceProvider"
                    defaultValue={
                      patient?.insuranceInfo?.secondary?.provider || ""
                    }
                    placeholder="United Healthcare"
                    disabled={isInsuranceReadOnly}
                    className={
                      isInsuranceReadOnly ? "bg-muted cursor-not-allowed" : ""
                    }
                  />
                </div>
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    {isInsuranceReadOnly ? (
                      <ReadOnlyLabel htmlFor="secondaryPolicyNumber">
                        Policy Number
                      </ReadOnlyLabel>
                    ) : (
                      <Label htmlFor="secondaryPolicyNumber">
                        Policy Number
                      </Label>
                    )}
                    <Input
                      id="secondaryPolicyNumber"
                      name="secondaryPolicyNumber"
                      defaultValue={
                        patient?.insuranceInfo?.secondary?.policyNumber || ""
                      }
                      placeholder="DEF456789"
                      disabled={isInsuranceReadOnly}
                      className={
                        isInsuranceReadOnly ? "bg-muted cursor-not-allowed" : ""
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    {isInsuranceReadOnly ? (
                      <ReadOnlyLabel htmlFor="secondaryGroupNumber">
                        Group Number
                      </ReadOnlyLabel>
                    ) : (
                      <Label htmlFor="secondaryGroupNumber">Group Number</Label>
                    )}
                    <Input
                      id="secondaryGroupNumber"
                      name="secondaryGroupNumber"
                      defaultValue={
                        patient?.insuranceInfo?.secondary?.groupNumber || ""
                      }
                      placeholder="GRP456"
                      disabled={isInsuranceReadOnly}
                      className={
                        isInsuranceReadOnly ? "bg-muted cursor-not-allowed" : ""
                      }
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Medical Info Tab */}
          <TabsContent value="medical" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Allergies</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex gap-2">
                  <Input
                    placeholder="Add an allergy..."
                    value={newAllergy}
                    onChange={(e) => setNewAllergy(e.target.value)}
                    onKeyPress={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        addAllergy();
                      }
                    }}
                  />
                  <Button type="button" onClick={addAllergy} className="gap-2">
                    <Plus className="h-4 w-4" />
                    Add
                  </Button>
                </div>
                {allergies.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {allergies.map((allergy, index) => (
                      <div
                        key={index}
                        className="flex items-center gap-2 rounded-md bg-red-50 px-3 py-1 text-sm dark:bg-red-950"
                      >
                        <span>{allergy}</span>
                        <button
                          type="button"
                          onClick={() => removeAllergy(index)}
                          className="text-red-600 hover:text-red-800 dark:text-red-400"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Medical History</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex gap-2">
                  <Input
                    placeholder="Add a medical condition..."
                    value={newCondition}
                    onChange={(e) => setNewCondition(e.target.value)}
                    onKeyPress={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        addCondition();
                      }
                    }}
                  />
                  <Button
                    type="button"
                    onClick={addCondition}
                    className="gap-2"
                  >
                    <Plus className="h-4 w-4" />
                    Add
                  </Button>
                </div>
                {medicalHistory.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {medicalHistory.map((condition, index) => (
                      <div
                        key={index}
                        className="flex items-center gap-2 rounded-md bg-blue-50 px-3 py-1 text-sm dark:bg-blue-950"
                      >
                        <span>{condition}</span>
                        <button
                          type="button"
                          onClick={() => removeCondition(index)}
                          className="text-blue-600 hover:text-blue-800 dark:text-blue-400"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Emergency Contact Tab */}
          <TabsContent value="emergency" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  Emergency Contact Information
                  {isEmergencyContactReadOnly && (
                    <span className="text-muted-foreground text-xs font-normal">
                      (Admin Only)
                    </span>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  {isEmergencyContactReadOnly ? (
                    <ReadOnlyLabel htmlFor="emergencyContactName">
                      Name
                    </ReadOnlyLabel>
                  ) : (
                    <Label htmlFor="emergencyContactName">Name</Label>
                  )}
                  <Input
                    id="emergencyContactName"
                    name="emergencyContactName"
                    defaultValue={patient?.emergencyContact?.name || ""}
                    placeholder="Jane Doe"
                    disabled={isEmergencyContactReadOnly}
                    className={
                      isEmergencyContactReadOnly
                        ? "bg-muted cursor-not-allowed"
                        : ""
                    }
                  />
                </div>
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    {isEmergencyContactReadOnly ? (
                      <ReadOnlyLabel htmlFor="emergencyContactPhone">
                        Phone
                      </ReadOnlyLabel>
                    ) : (
                      <Label htmlFor="emergencyContactPhone">Phone</Label>
                    )}
                    <Input
                      id="emergencyContactPhone"
                      name="emergencyContactPhone"
                      type="tel"
                      defaultValue={patient?.emergencyContact?.phone || ""}
                      placeholder="(555) 987-6543"
                      disabled={isEmergencyContactReadOnly}
                      className={
                        isEmergencyContactReadOnly
                          ? "bg-muted cursor-not-allowed"
                          : ""
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    {isEmergencyContactReadOnly ? (
                      <ReadOnlyLabel htmlFor="emergencyContactRelationship">
                        Relationship
                      </ReadOnlyLabel>
                    ) : (
                      <Label htmlFor="emergencyContactRelationship">
                        Relationship
                      </Label>
                    )}
                    <Input
                      id="emergencyContactRelationship"
                      name="emergencyContactRelationship"
                      defaultValue={
                        patient?.emergencyContact?.relationship || ""
                      }
                      placeholder="Spouse, Child, etc."
                      disabled={isEmergencyContactReadOnly}
                      className={
                        isEmergencyContactReadOnly
                          ? "bg-muted cursor-not-allowed"
                          : ""
                      }
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        <div className="flex gap-3 pt-6">
          <Button type="submit" disabled={loading}>
            {loading
              ? isEdit
                ? "Updating..."
                : "Creating..."
              : isEdit
                ? "Update Patient"
                : "Create Patient"}
          </Button>
          <Link href="/dashboard/patients">
            <Button type="button" variant="outline">
              Cancel
            </Button>
          </Link>
        </div>
      </form>
    </div>
  );
}
