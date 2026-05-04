"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Plus, Pencil, MapPin } from "lucide-react";
import { toast } from "sonner";
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  createServiceLocation,
  updateServiceLocation,
  setServiceLocationActive,
  type ServiceLocation,
} from "@/app/actions/service-locations";

type Props = {
  facilityId: string;
  initialLocations: ServiceLocation[];
};

export function ServiceLocationsClient({
  facilityId,
  initialLocations,
}: Props) {
  const router = useRouter();
  const [editing, setEditing] = useState<ServiceLocation | null>(null);
  const [creating, setCreating] = useState(false);
  const [isPending, startTransition] = useTransition();

  const active = initialLocations.filter((l) => l.is_active);
  const inactive = initialLocations.filter((l) => !l.is_active);

  const handleToggle = (loc: ServiceLocation) => {
    startTransition(async () => {
      const result = await setServiceLocationActive(
        facilityId,
        loc.id,
        !loc.is_active
      );
      if (result.success) {
        toast.success(
          loc.is_active ? "Location deactivated" : "Location reactivated"
        );
        router.refresh();
      } else {
        toast.error(result.error);
      }
    });
  };

  return (
    <>
      <div className="flex justify-end">
        <Button onClick={() => setCreating(true)} className="gap-2">
          <Plus className="h-4 w-4" />
          Add Location
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Active Locations</CardTitle>
          <CardDescription>
            {active.length} active location{active.length !== 1 ? "s" : ""}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {active.length === 0 ? (
            <div className="py-12 text-center text-zinc-500">
              <MapPin className="mx-auto mb-3 h-10 w-10 opacity-50" />
              <p>No service locations yet.</p>
              <Button onClick={() => setCreating(true)} className="mt-4 gap-2">
                <Plus className="h-4 w-4" />
                Add the first location
              </Button>
            </div>
          ) : (
            <LocationTable
              locations={active}
              onEdit={setEditing}
              onToggle={handleToggle}
              isPending={isPending}
            />
          )}
        </CardContent>
      </Card>

      {inactive.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-zinc-500">Inactive</CardTitle>
            <CardDescription>
              {inactive.length} inactive location
              {inactive.length !== 1 ? "s" : ""}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <LocationTable
              locations={inactive}
              onEdit={setEditing}
              onToggle={handleToggle}
              isPending={isPending}
            />
          </CardContent>
        </Card>
      )}

      <LocationDialog
        open={creating}
        onOpenChange={setCreating}
        facilityId={facilityId}
        location={null}
        onSaved={() => router.refresh()}
      />
      <LocationDialog
        open={!!editing}
        onOpenChange={(o) => !o && setEditing(null)}
        facilityId={facilityId}
        location={editing}
        onSaved={() => {
          setEditing(null);
          router.refresh();
        }}
      />
    </>
  );
}

function LocationTable({
  locations,
  onEdit,
  onToggle,
  isPending,
}: {
  locations: ServiceLocation[];
  onEdit: (l: ServiceLocation) => void;
  onToggle: (l: ServiceLocation) => void;
  isPending: boolean;
}) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead className="w-16">Order</TableHead>
          <TableHead>Name</TableHead>
          <TableHead>Description</TableHead>
          <TableHead className="text-right">Actions</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {locations.map((l) => (
          <TableRow key={l.id}>
            <TableCell className="text-sm text-zinc-500">
              {l.sort_order}
            </TableCell>
            <TableCell className="font-medium">
              {l.name}
              {!l.is_active && (
                <Badge variant="outline" className="ml-2">
                  inactive
                </Badge>
              )}
            </TableCell>
            <TableCell className="text-sm text-zinc-600">
              {l.description || "—"}
            </TableCell>
            <TableCell className="text-right">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onEdit(l)}
                disabled={isPending}
              >
                <Pencil className="h-4 w-4" />
                <span className="sr-only">Edit</span>
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onToggle(l)}
                disabled={isPending}
              >
                {l.is_active ? "Deactivate" : "Reactivate"}
              </Button>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

function LocationDialog({
  open,
  onOpenChange,
  facilityId,
  location,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  facilityId: string;
  location: ServiceLocation | null;
  onSaved: () => void;
}) {
  const [isPending, startTransition] = useTransition();

  const handleSubmit = (formData: FormData) => {
    startTransition(async () => {
      const result = location
        ? await updateServiceLocation(facilityId, location.id, formData)
        : await createServiceLocation(facilityId, formData);

      if (result.success) {
        toast.success(location ? "Location updated" : "Location created");
        onOpenChange(false);
        onSaved();
      } else {
        toast.error(result.error);
      }
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>
            {location ? "Edit Location" : "Add Service Location"}
          </DialogTitle>
          <DialogDescription>
            Used by the New Visit dropdown for this facility.
          </DialogDescription>
        </DialogHeader>

        <form action={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">
              Name<span className="ml-0.5 text-red-500">*</span>
            </Label>
            <Input
              id="name"
              name="name"
              required
              defaultValue={location?.name}
              placeholder="Wound Clinic Suite A"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              name="description"
              defaultValue={location?.description ?? ""}
              rows={2}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="sort_order">Sort order</Label>
            <Input
              id="sort_order"
              name="sort_order"
              type="number"
              min={0}
              max={9999}
              defaultValue={location?.sort_order ?? 0}
            />
            <p className="text-xs text-zinc-500">
              Lower numbers appear first in dropdowns.
            </p>
          </div>

          {location && (
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="is_active"
                name="is_active"
                defaultChecked={location.is_active}
                className="h-4 w-4 rounded border-zinc-300"
              />
              <Label htmlFor="is_active" className="font-normal">
                Active
              </Label>
            </div>
          )}

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isPending}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending ? "Saving..." : location ? "Save changes" : "Create"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
