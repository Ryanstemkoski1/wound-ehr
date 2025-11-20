"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Mail,
  UserPlus,
  Trash2,
  Shield,
  Building2,
  User,
  Clock,
  Copy,
  Check,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { inviteUser, cancelInvite } from "@/app/actions/admin";
import { formatDistanceToNow } from "date-fns";
import type { Credentials } from "@/lib/credentials";
import { CREDENTIALS_LABELS } from "@/lib/credentials";

type Invite = {
  id: string;
  email: string;
  role: string;
  facility_id: string | null;
  invite_token: string;
  created_at: string;
  expires_at: string;
  facility?: {
    id: string;
    name: string;
  } | null;
};

type Facility = {
  id: string;
  name: string;
};

type InvitesManagementClientProps = {
  invites: Invite[];
  facilities: Facility[];
};

export function InvitesManagementClient({
  invites,
  facilities,
}: InvitesManagementClientProps) {
  const router = useRouter();
  const [showInviteDialog, setShowInviteDialog] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [copiedToken, setCopiedToken] = useState<string | null>(null);

  const [inviteForm, setInviteForm] = useState({
    email: "",
    role: "user" as "tenant_admin" | "facility_admin" | "user",
    credentials: "Admin" as Credentials,
    facilityId: "",
  });

  const handleInviteSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    const formData = new FormData();
    formData.append("email", inviteForm.email);
    formData.append("role", inviteForm.role);
    formData.append("credentials", inviteForm.credentials);
    if (inviteForm.facilityId) {
      formData.append("facilityId", inviteForm.facilityId);
    }

    const result = await inviteUser(formData);

    if (result.error) {
      alert(result.error);
    } else {
      setShowInviteDialog(false);
      setInviteForm({ email: "", role: "user", credentials: "Admin", facilityId: "" });
      router.refresh();
    }

    setIsSubmitting(false);
  };

  const handleCancelInvite = async (inviteId: string) => {
    if (!confirm("Are you sure you want to cancel this invite?")) return;

    const result = await cancelInvite(inviteId);

    if (result.error) {
      alert(result.error);
    } else {
      router.refresh();
    }
  };

  const copyInviteLink = async (token: string) => {
    const inviteLink = `${window.location.origin}/auth/accept-invite?token=${token}`;
    
    try {
      // Try modern clipboard API first
      await navigator.clipboard.writeText(inviteLink);
      setCopiedToken(token);
      setTimeout(() => setCopiedToken(null), 2000);
    } catch (_err) { // eslint-disable-line @typescript-eslint/no-unused-vars
      // Fallback for older browsers or when clipboard permission is denied
      const textArea = document.createElement("textarea");
      textArea.value = inviteLink;
      textArea.style.position = "fixed";
      textArea.style.left = "-999999px";
      document.body.appendChild(textArea);
      textArea.select();
      try {
        document.execCommand("copy");
        setCopiedToken(token);
        setTimeout(() => setCopiedToken(null), 2000);
      } catch (copyErr) {
        console.error("Failed to copy:", copyErr);
        alert("Failed to copy link. Please copy manually: " + inviteLink);
      }
      document.body.removeChild(textArea);
    }
  };

  const getRoleBadge = (role: string) => {
    switch (role) {
      case "tenant_admin":
        return (
          <Badge className="gap-1 bg-purple-600">
            <Shield className="h-3 w-3" />
            Tenant Admin
          </Badge>
        );
      case "facility_admin":
        return (
          <Badge className="gap-1 bg-blue-600">
            <Building2 className="h-3 w-3" />
            Facility Admin
          </Badge>
        );
      case "user":
        return (
          <Badge variant="secondary" className="gap-1">
            <User className="h-3 w-3" />
            User
          </Badge>
        );
      default:
        return <Badge variant="outline">{role}</Badge>;
    }
  };

  const requiresFacility =
    inviteForm.role === "facility_admin" || inviteForm.role === "user";

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Pending Invites</CardTitle>
              <CardDescription>
                {invites.length} pending invite{invites.length !== 1 ? "s" : ""}
              </CardDescription>
            </div>
            <Button
              onClick={() => setShowInviteDialog(true)}
              className="gap-2"
            >
              <UserPlus className="h-4 w-4" />
              Invite User
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {invites.length === 0 ? (
            <div className="py-12 text-center text-zinc-500">
              <Mail className="mx-auto h-12 w-12 text-zinc-400" />
              <p className="mt-2">No pending invites</p>
              <Button
                onClick={() => setShowInviteDialog(true)}
                className="mt-4 gap-2"
                variant="outline"
              >
                <UserPlus className="h-4 w-4" />
                Invite Your First User
              </Button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Email</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Facility</TableHead>
                    <TableHead>Invited</TableHead>
                    <TableHead>Expires</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {invites.map((invite) => (
                    <TableRow key={invite.id}>
                      <TableCell className="font-medium">
                        {invite.email}
                      </TableCell>
                      <TableCell>{getRoleBadge(invite.role)}</TableCell>
                      <TableCell>
                        {invite.facility ? (
                          <div className="flex items-center gap-2">
                            <Building2 className="h-4 w-4 text-zinc-400" />
                            {invite.facility.name}
                          </div>
                        ) : (
                          <span className="text-zinc-400">All Facilities</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2 text-sm text-zinc-600 dark:text-zinc-400">
                          <Clock className="h-4 w-4" />
                          {formatDistanceToNow(new Date(invite.created_at), {
                            addSuffix: true,
                          })}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm text-zinc-600 dark:text-zinc-400">
                          {formatDistanceToNow(new Date(invite.expires_at), {
                            addSuffix: true,
                          })}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            className="gap-2"
                            onClick={() => copyInviteLink(invite.invite_token)}
                          >
                            {copiedToken === invite.invite_token ? (
                              <>
                                <Check className="h-4 w-4" />
                                Copied
                              </>
                            ) : (
                              <>
                                <Copy className="h-4 w-4" />
                                Copy Link
                              </>
                            )}
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            className="gap-2 text-red-600 hover:bg-red-50 hover:text-red-700 dark:text-red-400 dark:hover:bg-red-950"
                            onClick={() => handleCancelInvite(invite.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                            Cancel
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Invite Dialog */}
      <Dialog open={showInviteDialog} onOpenChange={setShowInviteDialog}>
        <DialogContent>
          <form onSubmit={handleInviteSubmit}>
            <DialogHeader>
              <DialogTitle>Invite User</DialogTitle>
              <DialogDescription>
                Send an invitation to a new user to join your organization
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email Address</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="user@example.com"
                  value={inviteForm.email}
                  onChange={(e) =>
                    setInviteForm({ ...inviteForm, email: e.target.value })
                  }
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="role">Administrative Role</Label>
                <Select
                  value={inviteForm.role}
                  onValueChange={(value: typeof inviteForm.role) =>
                    setInviteForm({ ...inviteForm, role: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="user">User</SelectItem>
                    <SelectItem value="facility_admin">
                      Facility Admin
                    </SelectItem>
                    <SelectItem value="tenant_admin">Tenant Admin</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="credentials">Clinical Credentials</Label>
                <Select
                  value={inviteForm.credentials}
                  onValueChange={(value: Credentials) =>
                    setInviteForm({ ...inviteForm, credentials: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(CREDENTIALS_LABELS).map(([value, label]) => (
                      <SelectItem key={value} value={value}>
                        {label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-zinc-500">
                  Determines clinical scope and signature requirements
                </p>
              </div>

              {requiresFacility && (
                <div className="space-y-2">
                  <Label htmlFor="facility">Facility</Label>
                  <Select
                    value={inviteForm.facilityId}
                    onValueChange={(value) =>
                      setInviteForm({ ...inviteForm, facilityId: value })
                    }
                    required
                  >
                    <SelectTrigger>
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
              )}
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowInviteDialog(false)}
                disabled={isSubmitting}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? "Sending..." : "Send Invite"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
