"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Trash2, UserCog, Mail, Shield, Building2, User, Stethoscope } from "lucide-react";
import { CREDENTIALS_SHORT_LABELS, CREDENTIALS_LABELS, type Credentials } from "@/lib/credentials";
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
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
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
import { Label } from "@/components/ui/label";
import { removeUserFromTenant, updateUserRole } from "@/app/actions/admin";

type UserRole = {
  id: string;
  user_id: string;
  tenant_id: string;
  role: "tenant_admin" | "facility_admin" | "user";
  facility_id: string | null;
  created_at: string;
  facility?: {
    id: string;
    name: string;
  } | null;
  users?: {
    email: string;
    name: string | null;
    credentials: Credentials;
  } | null;
};

type Facility = {
  id: string;
  name: string;
};

type UsersManagementClientProps = {
  users: UserRole[];
  currentUserRole: string;
  facilities: Facility[];
};

export function UsersManagementClient({
  users,
  currentUserRole,
  facilities,
}: UsersManagementClientProps) {
  const router = useRouter();
  const [userToDelete, setUserToDelete] = useState<UserRole | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [userToEdit, setUserToEdit] = useState<UserRole | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState({
    role: "" as "tenant_admin" | "facility_admin" | "user",
    facilityId: "",
    credentials: "Admin" as Credentials,
  });

  const handleDeleteUser = async () => {
    if (!userToDelete) return;

    setIsDeleting(true);
    try {
      const result = await removeUserFromTenant(userToDelete.user_id);

      if (result.error) {
        alert(result.error);
      } else {
        router.refresh();
      }
    } catch {
      alert("Failed to remove user");
    } finally {
      setIsDeleting(false);
      setUserToDelete(null);
    }
  };

  const handleEditRole = (user: UserRole) => {
    setUserToEdit(user);
    setEditForm({
      role: user.role,
      facilityId: user.facility_id || "",
      credentials: user.users?.credentials || "Admin",
    });
  };

  const handleUpdateRole = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userToEdit) return;

    setIsEditing(true);
    try {
      const formData = new FormData();
      formData.append("userId", userToEdit.user_id);
      formData.append("role", editForm.role);
      formData.append("credentials", editForm.credentials);
      if (editForm.facilityId) {
        formData.append("facilityId", editForm.facilityId);
      }

      const result = await updateUserRole(formData);

      if (result.error) {
        alert(result.error);
      } else {
        setUserToEdit(null);
        // Force a hard refresh to ensure credentials update shows
        window.location.reload();
      }
    } catch (error) {
      console.error("Update error:", error);
      alert("Failed to update user role");
    } finally {
      setIsEditing(false);
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

  const isTenantAdmin = currentUserRole === "tenant_admin";

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Users</CardTitle>
              <CardDescription>
                {users.length} user{users.length !== 1 ? "s" : ""} in your
                organization
              </CardDescription>
            </div>
            <Button
              onClick={() => router.push("/dashboard/admin/invites")}
              className="gap-2"
            >
              <Mail className="h-4 w-4" />
              Invite User
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {users.length === 0 ? (
            <div className="py-12 text-center text-zinc-500">
              <User className="mx-auto h-12 w-12 text-zinc-400" />
              <p className="mt-2">No users found</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Credentials</TableHead>
                    <TableHead>Facility</TableHead>
                    <TableHead>Joined</TableHead>
                    {isTenantAdmin && <TableHead>Actions</TableHead>}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {users.map((user) => (
                    <TableRow key={user.id}>
                      <TableCell>
                        {user.users?.name ? (
                          <span className="font-medium">{user.users.name}</span>
                        ) : (
                          <span className="text-zinc-400 italic">No name set</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {user.users?.email || (
                          <span className="text-zinc-400 italic">No email</span>
                        )}
                      </TableCell>
                      <TableCell>{getRoleBadge(user.role)}</TableCell>
                      <TableCell>
                        {user.users?.credentials ? (
                          <Badge variant="outline" className="gap-1 font-mono">
                            <Stethoscope className="h-3 w-3" />
                            {CREDENTIALS_SHORT_LABELS[user.users.credentials]}
                          </Badge>
                        ) : (
                          <span className="text-zinc-400 italic">Not set</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {user.facility ? (
                          <div className="flex items-center gap-2">
                            <Building2 className="h-4 w-4 text-zinc-400" />
                            {user.facility.name}
                          </div>
                        ) : (
                          <span className="text-zinc-400">All Facilities</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {new Date(user.created_at).toLocaleDateString()}
                      </TableCell>
                      {isTenantAdmin && (
                        <TableCell>
                          <div className="flex gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              className="gap-2"
                              onClick={() => handleEditRole(user)}
                            >
                              <UserCog className="h-4 w-4" />
                              Edit Role
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              className="gap-2 text-red-600 hover:bg-red-50 hover:text-red-700 dark:text-red-400 dark:hover:bg-red-950"
                              onClick={() => setUserToDelete(user)}
                            >
                              <Trash2 className="h-4 w-4" />
                              Remove
                            </Button>
                          </div>
                        </TableCell>
                      )}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Delete Confirmation Dialog */}
      <AlertDialog
        open={!!userToDelete}
        onOpenChange={() => setUserToDelete(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove User</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to remove this user from your organization?
              This will revoke their access to all facilities and data.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteUser}
              disabled={isDeleting}
              className="bg-red-600 hover:bg-red-700"
            >
              {isDeleting ? "Removing..." : "Remove User"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Edit Role Dialog */}
      <Dialog open={!!userToEdit} onOpenChange={() => setUserToEdit(null)}>
        <DialogContent>
          <form onSubmit={handleUpdateRole}>
            <DialogHeader>
              <DialogTitle>Edit User Role</DialogTitle>
              <DialogDescription>
                Update the role and facility assignment for this user
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="edit-role">Role</Label>
                <Select
                  value={editForm.role}
                  onValueChange={(value: typeof editForm.role) =>
                    setEditForm({ ...editForm, role: value })
                  }
                >
                  <SelectTrigger id="edit-role">
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
                <Label htmlFor="edit-credentials">Clinical Credentials</Label>
                <Select
                  value={editForm.credentials}
                  onValueChange={(value: Credentials) =>
                    setEditForm({ ...editForm, credentials: value })
                  }
                >
                  <SelectTrigger id="edit-credentials">
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
              </div>

              {(editForm.role === "facility_admin" ||
                editForm.role === "user") && (
                <div className="space-y-2">
                  <Label htmlFor="edit-facility">Facility</Label>
                  <Select
                    value={editForm.facilityId}
                    onValueChange={(value) =>
                      setEditForm({ ...editForm, facilityId: value })
                    }
                  >
                    <SelectTrigger id="edit-facility">
                      <SelectValue placeholder="Select a facility" />
                    </SelectTrigger>
                    <SelectContent>
                      {facilities.map((facility) => (
                        <SelectItem key={facility.id} value={facility.id}>
                          {facility.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-zinc-500">
                    Required for Facility Admin and User roles
                  </p>
                </div>
              )}
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setUserToEdit(null)}
                disabled={isEditing}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isEditing}>
                {isEditing ? "Updating..." : "Update Role"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
