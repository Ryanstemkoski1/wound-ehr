"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { createFacility, updateFacility } from "@/app/actions/facilities";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";

type FacilityFormProps = {
  facility?: {
    id: string;
    name: string;
    address?: string | null;
    city?: string | null;
    state?: string | null;
    zip?: string | null;
    phone?: string | null;
    fax?: string | null;
    contactPerson?: string | null;
    email?: string | null;
    notes?: string | null;
  };
};

export default function FacilityForm({ facility }: FacilityFormProps) {
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const isEdit = !!facility;

  async function handleSubmit(formData: FormData) {
    setLoading(true);
    setError("");

    const result = isEdit
      ? await updateFacility(facility.id, formData)
      : await createFacility(formData);

    if (result.error) {
      setError(result.error);
      setLoading(false);
    } else {
      router.push("/dashboard/facilities");
      router.refresh();
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/dashboard/facilities">
          <Button variant="ghost" size="sm" className="gap-2">
            <ArrowLeft className="h-4 w-4" />
            Back
          </Button>
        </Link>
        <div>
          <h1 className="text-3xl font-bold">
            {isEdit ? "Edit Facility" : "Add Facility"}
          </h1>
          <p className="text-zinc-600 dark:text-zinc-400">
            {isEdit ? "Update facility information" : "Create a new facility"}
          </p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Facility Information</CardTitle>
        </CardHeader>
        <CardContent>
          <form action={handleSubmit} className="space-y-6">
            {error && (
              <div className="rounded-md bg-red-50 p-3 text-sm text-red-800 dark:bg-red-950 dark:text-red-200">
                {error}
              </div>
            )}

            {/* Basic Information */}
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">
                  Facility Name <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="name"
                  name="name"
                  defaultValue={facility?.name}
                  required
                  placeholder="e.g., Sunrise Nursing Home"
                />
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="contactPerson">Contact Person</Label>
                  <Input
                    id="contactPerson"
                    name="contactPerson"
                    defaultValue={facility?.contactPerson || ""}
                    placeholder="John Doe"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    name="email"
                    type="email"
                    defaultValue={facility?.email || ""}
                    placeholder="contact@facility.com"
                  />
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="phone">Phone</Label>
                  <Input
                    id="phone"
                    name="phone"
                    type="tel"
                    defaultValue={facility?.phone || ""}
                    placeholder="(555) 123-4567"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="fax">Fax</Label>
                  <Input
                    id="fax"
                    name="fax"
                    type="tel"
                    defaultValue={facility?.fax || ""}
                    placeholder="(555) 123-4568"
                  />
                </div>
              </div>
            </div>

            {/* Address */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Address</h3>
              <div className="space-y-2">
                <Label htmlFor="address">Street Address</Label>
                <Input
                  id="address"
                  name="address"
                  defaultValue={facility?.address || ""}
                  placeholder="123 Main Street"
                />
              </div>

              <div className="grid gap-4 md:grid-cols-3">
                <div className="space-y-2">
                  <Label htmlFor="city">City</Label>
                  <Input
                    id="city"
                    name="city"
                    defaultValue={facility?.city || ""}
                    placeholder="Springfield"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="state">State</Label>
                  <Input
                    id="state"
                    name="state"
                    defaultValue={facility?.state || ""}
                    placeholder="IL"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="zip">ZIP Code</Label>
                  <Input
                    id="zip"
                    name="zip"
                    defaultValue={facility?.zip || ""}
                    placeholder="62701"
                  />
                </div>
              </div>
            </div>

            {/* Notes */}
            <div className="space-y-2">
              <Label htmlFor="notes">Notes</Label>
              <Textarea
                id="notes"
                name="notes"
                defaultValue={facility?.notes || ""}
                placeholder="Additional information about the facility..."
                rows={4}
              />
            </div>

            <div className="flex gap-3">
              <Button type="submit" disabled={loading}>
                {loading
                  ? isEdit
                    ? "Updating..."
                    : "Creating..."
                  : isEdit
                    ? "Update Facility"
                    : "Create Facility"}
              </Button>
              <Link href="/dashboard/facilities">
                <Button type="button" variant="outline">
                  Cancel
                </Button>
              </Link>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
