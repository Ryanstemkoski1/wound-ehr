"use client";

import { useState, useTransition } from "react";
import { Plus, Pencil, RotateCcw, Building2 } from "lucide-react";
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
  createHomeHealthAgency,
  updateHomeHealthAgency,
  setHomeHealthAgencyActive,
  type HomeHealthAgency,
} from "@/app/actions/home-health-agencies";
import { useRouter } from "next/navigation";

type Props = {
  initialAgencies: HomeHealthAgency[];
};

export function HomeHealthAgenciesClient({ initialAgencies }: Props) {
  const router = useRouter();
  const [editing, setEditing] = useState<HomeHealthAgency | null>(null);
  const [creating, setCreating] = useState(false);
  const [isPending, startTransition] = useTransition();

  const active = initialAgencies.filter((a) => a.is_active);
  const inactive = initialAgencies.filter((a) => !a.is_active);

  const handleToggleActive = (agency: HomeHealthAgency) => {
    startTransition(async () => {
      const result = await setHomeHealthAgencyActive(
        agency.id,
        !agency.is_active
      );
      if (result.success) {
        toast.success(
          agency.is_active ? "Agency deactivated" : "Agency reactivated"
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
          Add Agency
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Active Agencies</CardTitle>
          <CardDescription>
            {active.length} active agenc{active.length !== 1 ? "ies" : "y"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {active.length === 0 ? (
            <EmptyState onAdd={() => setCreating(true)} />
          ) : (
            <AgencyTable
              agencies={active}
              onEdit={setEditing}
              onToggle={handleToggleActive}
              isPending={isPending}
            />
          )}
        </CardContent>
      </Card>

      {inactive.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-muted-foreground">Inactive</CardTitle>
            <CardDescription>
              {inactive.length} inactive agenc
              {inactive.length !== 1 ? "ies" : "y"}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <AgencyTable
              agencies={inactive}
              onEdit={setEditing}
              onToggle={handleToggleActive}
              isPending={isPending}
            />
          </CardContent>
        </Card>
      )}

      <AgencyDialog
        open={creating}
        onOpenChange={setCreating}
        agency={null}
        onSaved={() => router.refresh()}
      />
      <AgencyDialog
        open={!!editing}
        onOpenChange={(o) => !o && setEditing(null)}
        agency={editing}
        onSaved={() => {
          setEditing(null);
          router.refresh();
        }}
      />
    </>
  );
}

function EmptyState({ onAdd }: { onAdd: () => void }) {
  return (
    <div className="py-12 text-center text-muted-foreground">
      <Building2 className="mx-auto mb-3 h-10 w-10 opacity-50" />
      <p>No home health agencies yet.</p>
      <Button onClick={onAdd} className="mt-4 gap-2">
        <Plus className="h-4 w-4" />
        Add the first agency
      </Button>
    </div>
  );
}

function AgencyTable({
  agencies,
  onEdit,
  onToggle,
  isPending,
}: {
  agencies: HomeHealthAgency[];
  onEdit: (a: HomeHealthAgency) => void;
  onToggle: (a: HomeHealthAgency) => void;
  isPending: boolean;
}) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Name</TableHead>
          <TableHead>NPI</TableHead>
          <TableHead>Phone</TableHead>
          <TableHead>Location</TableHead>
          <TableHead className="text-right">Actions</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {agencies.map((a) => (
          <TableRow key={a.id}>
            <TableCell className="font-medium">
              {a.name}
              {!a.is_active && (
                <Badge variant="outline" className="ml-2">
                  inactive
                </Badge>
              )}
            </TableCell>
            <TableCell className="text-sm text-muted-foreground">
              {a.npi || "—"}
            </TableCell>
            <TableCell className="text-sm text-muted-foreground">
              {a.phone || "—"}
            </TableCell>
            <TableCell className="text-sm text-muted-foreground">
              {[a.city, a.state].filter(Boolean).join(", ") || "—"}
            </TableCell>
            <TableCell className="text-right">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onEdit(a)}
                disabled={isPending}
              >
                <Pencil className="h-4 w-4" />
                <span className="sr-only">Edit</span>
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onToggle(a)}
                disabled={isPending}
              >
                {a.is_active ? (
                  "Deactivate"
                ) : (
                  <>
                    <RotateCcw className="mr-1 h-4 w-4" />
                    Reactivate
                  </>
                )}
              </Button>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

function AgencyDialog({
  open,
  onOpenChange,
  agency,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  agency: HomeHealthAgency | null;
  onSaved: () => void;
}) {
  const [isPending, startTransition] = useTransition();

  const handleSubmit = (formData: FormData) => {
    startTransition(async () => {
      const result = agency
        ? await updateHomeHealthAgency(agency.id, formData)
        : await createHomeHealthAgency(formData);

      if (result.success) {
        toast.success(agency ? "Agency updated" : "Agency created");
        onOpenChange(false);
        onSaved();
      } else {
        toast.error(result.error);
      }
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>
            {agency ? "Edit Agency" : "Add Home Health Agency"}
          </DialogTitle>
          <DialogDescription>
            {agency
              ? "Update this agency's contact details."
              : "Add a new partner agency. Tenant-scoped."}
          </DialogDescription>
        </DialogHeader>

        <form action={handleSubmit} className="space-y-4">
          <Field
            label="Name"
            name="name"
            required
            defaultValue={agency?.name}
          />

          <div className="grid grid-cols-2 gap-3">
            <Field
              label="NPI"
              name="npi"
              defaultValue={agency?.npi ?? ""}
              placeholder="10 digits"
            />
            <Field
              label="Phone"
              name="phone"
              defaultValue={agency?.phone ?? ""}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Fax" name="fax" defaultValue={agency?.fax ?? ""} />
            <Field
              label="Email"
              name="email"
              type="email"
              defaultValue={agency?.email ?? ""}
            />
          </div>

          <Field
            label="Address"
            name="address"
            defaultValue={agency?.address ?? ""}
          />
          <div className="grid grid-cols-3 gap-3">
            <Field label="City" name="city" defaultValue={agency?.city ?? ""} />
            <Field
              label="State"
              name="state"
              defaultValue={agency?.state ?? ""}
            />
            <Field label="ZIP" name="zip" defaultValue={agency?.zip ?? ""} />
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Notes</Label>
            <Textarea
              id="notes"
              name="notes"
              defaultValue={agency?.notes ?? ""}
              rows={3}
            />
          </div>

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
              {isPending ? "Saving..." : agency ? "Save changes" : "Create"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function Field({
  label,
  name,
  required,
  defaultValue,
  placeholder,
  type = "text",
}: {
  label: string;
  name: string;
  required?: boolean;
  defaultValue?: string;
  placeholder?: string;
  type?: string;
}) {
  return (
    <div className="space-y-2">
      <Label htmlFor={name}>
        {label}
        {required && <span className="ml-0.5 text-red-500">*</span>}
      </Label>
      <Input
        id={name}
        name={name}
        type={type}
        required={required}
        defaultValue={defaultValue}
        placeholder={placeholder}
      />
    </div>
  );
}
