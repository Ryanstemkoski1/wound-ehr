"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { UserPlus, X, Edit2 } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import {
  assignClinician,
  removeClinician,
  updateClinicianRole,
} from "@/app/actions/patient-clinicians";
import { toast } from "sonner";

type Clinician = {
  id: string;
  user_id: string;
  role: "primary" | "supervisor" | "covering";
  user_name: string;
  user_credentials: string;
  assigned_at: string;
};

type AvailableClinician = {
  id: string;
  name: string;
  email: string;
  credentials: string;
};

type ClinicianAssignmentProps = {
  patientId: string;
  clinicians: Clinician[];
  availableClinicians: AvailableClinician[];
  isAdmin: boolean;
};

export function ClinicianAssignment({
  patientId,
  clinicians,
  availableClinicians,
  isAdmin,
}: ClinicianAssignmentProps) {
  const router = useRouter();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedClinician, setSelectedClinician] = useState<string>("");
  const [selectedRole, setSelectedRole] = useState<string>("primary");
  const [saving, setSaving] = useState(false);
  const [editingRole, setEditingRole] = useState<string | null>(null);

  const handleAssign = async () => {
    if (!selectedClinician) {
      toast.error("Please select a clinician");
      return;
    }

    setSaving(true);
    const result = await assignClinician(
      patientId,
      selectedClinician,
      selectedRole as "primary" | "supervisor" | "covering"
    );

    if (result.success) {
      toast.success("Clinician assigned successfully");
      setDialogOpen(false);
      setSelectedClinician("");
      setSelectedRole("primary");
      router.refresh();
    } else {
      toast.error(result.error || "Failed to assign clinician");
    }
    setSaving(false);
  };

  const handleRemove = async (userId: string) => {
    setSaving(true);
    const result = await removeClinician(patientId, userId);

    if (result.success) {
      toast.success("Clinician removed successfully");
      router.refresh();
    } else {
      toast.error(result.error || "Failed to remove clinician");
    }
    setSaving(false);
  };

  const handleUpdateRole = async (
    userId: string,
    newRole: "primary" | "supervisor" | "covering"
  ) => {
    setSaving(true);
    const result = await updateClinicianRole(patientId, userId, newRole);

    if (result.success) {
      toast.success("Clinician role updated");
      setEditingRole(null);
      router.refresh();
    } else {
      toast.error(result.error || "Failed to update role");
    }
    setSaving(false);
  };

  const getRoleBadgeVariant = (role: string) => {
    switch (role) {
      case "primary":
        return "default";
      case "supervisor":
        return "secondary";
      case "covering":
        return "outline";
      default:
        return "outline";
    }
  };

  const getRoleLabel = (role: string) => {
    return role.charAt(0).toUpperCase() + role.slice(1);
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Assigned Clinicians</CardTitle>
            <CardDescription>
              Manage clinician assignments for this patient
            </CardDescription>
          </div>
          {isAdmin && (
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
              <DialogTrigger asChild>
                <Button size="sm" variant="outline">
                  <UserPlus className="mr-2 h-4 w-4" />
                  Assign Clinician
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Assign Clinician</DialogTitle>
                  <DialogDescription>
                    Assign a clinician to this patient for calendar filtering
                    and access control
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label htmlFor="clinician">Clinician</Label>
                    <Select
                      value={selectedClinician}
                      onValueChange={setSelectedClinician}
                    >
                      <SelectTrigger id="clinician">
                        <SelectValue placeholder="Select a clinician" />
                      </SelectTrigger>
                      <SelectContent>
                        {availableClinicians.map((clinician) => (
                          <SelectItem key={clinician.id} value={clinician.id}>
                            {clinician.name || clinician.email}
                            {clinician.credentials &&
                              ` (${clinician.credentials})`}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="role">Role</Label>
                    <Select
                      value={selectedRole}
                      onValueChange={setSelectedRole}
                    >
                      <SelectTrigger id="role">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="primary">Primary</SelectItem>
                        <SelectItem value="supervisor">Supervisor</SelectItem>
                        <SelectItem value="covering">Covering</SelectItem>
                      </SelectContent>
                    </Select>
                    <p className="text-muted-foreground text-sm">
                      <strong>Primary:</strong> Main provider for this patient
                      <br />
                      <strong>Supervisor:</strong> Oversight and approval
                      <br />
                      <strong>Covering:</strong> Temporary assignment
                    </p>
                  </div>
                </div>
                <DialogFooter>
                  <Button
                    variant="outline"
                    onClick={() => setDialogOpen(false)}
                    disabled={saving}
                  >
                    Cancel
                  </Button>
                  <Button onClick={handleAssign} disabled={saving}>
                    {saving ? "Assigning..." : "Assign"}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {clinicians.length === 0 ? (
          <p className="text-muted-foreground text-sm">
            No clinicians assigned yet.
            {isAdmin && " Click 'Assign Clinician' to get started."}
          </p>
        ) : (
          <div className="space-y-2">
            {clinicians.map((clinician) => (
              <div
                key={clinician.id}
                className="flex items-center justify-between rounded-lg border p-3"
              >
                <div className="flex items-center gap-3">
                  <div>
                    <p className="font-medium">
                      {clinician.user_name}
                      {clinician.user_credentials &&
                        `, ${clinician.user_credentials}`}
                    </p>
                    <p className="text-muted-foreground text-sm">
                      Assigned{" "}
                      {new Date(clinician.assigned_at).toLocaleDateString()}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {editingRole === clinician.user_id ? (
                    <Select
                      value={clinician.role}
                      onValueChange={(value) =>
                        handleUpdateRole(
                          clinician.user_id,
                          value as "primary" | "supervisor" | "covering"
                        )
                      }
                      disabled={saving}
                    >
                      <SelectTrigger className="w-32">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="primary">Primary</SelectItem>
                        <SelectItem value="supervisor">Supervisor</SelectItem>
                        <SelectItem value="covering">Covering</SelectItem>
                      </SelectContent>
                    </Select>
                  ) : (
                    <Badge variant={getRoleBadgeVariant(clinician.role)}>
                      {getRoleLabel(clinician.role)}
                    </Badge>
                  )}
                  {isAdmin && (
                    <>
                      {!editingRole && (
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => setEditingRole(clinician.user_id)}
                        >
                          <Edit2 className="h-4 w-4" />
                        </Button>
                      )}
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleRemove(clinician.user_id)}
                        disabled={saving}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
