"use client";

import { useState } from "react";
import { format } from "date-fns";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Calendar,
  Clock,
  MapPin,
  User,
  Edit,
  Trash2,
  Building2,
} from "lucide-react";
import { CalendarEvent } from "@/app/actions/calendar";
import { toast } from "sonner";

type EventDetailsModalProps = {
  event: CalendarEvent | null;
  open: boolean;
  onClose: () => void;
  onEdit?: (event: CalendarEvent) => void;
  onDelete?: (event: CalendarEvent) => void;
  onStatusChange?: (event: CalendarEvent, newStatus: string) => void;
};

const STATUS_OPTIONS = [
  { value: "scheduled", label: "Scheduled", color: "blue" },
  { value: "in-progress", label: "In Progress", color: "amber" },
  { value: "completed", label: "Completed", color: "green" },
  { value: "cancelled", label: "Cancelled", color: "gray" },
  { value: "no-show", label: "No Show", color: "red" },
];

const STATUS_COLORS = {
  scheduled: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
  "in-progress":
    "bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200",
  completed:
    "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
  cancelled: "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200",
  "no-show": "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
};

export function EventDetailsModal({
  event,
  open,
  onClose,
  onEdit,
  onDelete,
  onStatusChange,
}: EventDetailsModalProps) {
  const [isChangingStatus, setIsChangingStatus] = useState(false);

  if (!event) return null;

  const handleStatusChange = async (newStatus: string) => {
    setIsChangingStatus(true);
    try {
      if (onStatusChange) {
        await onStatusChange(event, newStatus);
        toast.success("Status updated successfully");
      }
    } catch (error) {
      console.error("Failed to update status:", error);
      toast.error("Failed to update status");
    } finally {
      setIsChangingStatus(false);
    }
  };

  const handleDelete = () => {
    if (
      confirm(
        "Are you sure you want to delete this appointment? This action cannot be undone."
      )
    ) {
      if (onDelete) {
        onDelete(event);
      }
      onClose();
    }
  };

  const handleEdit = () => {
    if (onEdit) {
      onEdit(event);
    }
    onClose();
  };

  const statusColor =
    STATUS_COLORS[event.resource.status as keyof typeof STATUS_COLORS] ||
    STATUS_COLORS.scheduled;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5 text-teal-600" />
            Visit Details
          </DialogTitle>
          <DialogDescription>
            View and manage appointment information
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Patient Info */}
          <div className="flex items-start gap-3 rounded-lg border border-zinc-200 bg-zinc-50 p-4 dark:border-zinc-800 dark:bg-zinc-900">
            <User className="h-5 w-5 text-zinc-500 dark:text-zinc-400" />
            <div className="flex-1">
              <p className="font-medium text-zinc-900 dark:text-zinc-100">
                {event.resource.patientName}
              </p>
              <p className="text-sm text-zinc-500 dark:text-zinc-400">
                Patient ID: {event.resource.patientId.substring(0, 8)}...
              </p>
            </div>
            <Badge className={statusColor}>{event.resource.status}</Badge>
          </div>

          {/* Date & Time */}
          <div className="grid grid-cols-2 gap-3">
            <div className="flex items-center gap-2 rounded-lg border border-zinc-200 bg-zinc-50 p-3 dark:border-zinc-800 dark:bg-zinc-900">
              <Calendar className="h-4 w-4 text-zinc-500" />
              <div>
                <p className="text-xs text-zinc-500 dark:text-zinc-400">
                  Date
                </p>
                <p className="text-sm font-medium">
                  {format(event.start, "MMM dd, yyyy")}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 rounded-lg border border-zinc-200 bg-zinc-50 p-3 dark:border-zinc-800 dark:bg-zinc-900">
              <Clock className="h-4 w-4 text-zinc-500" />
              <div>
                <p className="text-xs text-zinc-500 dark:text-zinc-400">
                  Time
                </p>
                <p className="text-sm font-medium">
                  {format(event.start, "h:mm a")}
                </p>
              </div>
            </div>
          </div>

          {/* Facility */}
          {event.resource.facilityName && (
            <div className="flex items-center gap-2 rounded-lg border border-zinc-200 bg-zinc-50 p-3 dark:border-zinc-800 dark:bg-zinc-900">
              <Building2 className="h-4 w-4 text-zinc-500" />
              <div>
                <p className="text-xs text-zinc-500 dark:text-zinc-400">
                  Facility
                </p>
                <p className="text-sm font-medium">
                  {event.resource.facilityName}
                </p>
              </div>
            </div>
          )}

          {/* Wound Count */}
          {event.resource.woundCount > 0 && (
            <div className="rounded-lg border border-zinc-200 bg-zinc-50 p-3 dark:border-zinc-800 dark:bg-zinc-900">
              <div className="flex items-center gap-2">
                <MapPin className="h-4 w-4 text-zinc-500" />
                <div>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400">
                    Wounds
                  </p>
                  <p className="text-sm font-medium">
                    {event.resource.woundCount}{" "}
                    {event.resource.woundCount === 1 ? "wound" : "wounds"} to
                    assess
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Status Change */}
          <div className="rounded-lg border border-zinc-200 bg-zinc-50 p-3 dark:border-zinc-800 dark:bg-zinc-900">
            <label className="mb-2 block text-xs font-medium text-zinc-500 dark:text-zinc-400">
              Change Status
            </label>
            <Select
              value={event.resource.status}
              onValueChange={handleStatusChange}
              disabled={isChangingStatus}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {STATUS_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <DialogFooter className="flex gap-2 sm:justify-between">
          <div className="flex gap-2">
            {onEdit && (
              <Button
                variant="outline"
                onClick={handleEdit}
                className="gap-2"
              >
                <Edit className="h-4 w-4" />
                Edit
              </Button>
            )}
            {onDelete && (
              <Button
                variant="outline"
                onClick={handleDelete}
                className="gap-2 text-red-600 hover:bg-red-50 hover:text-red-700 dark:text-red-400 dark:hover:bg-red-950"
              >
                <Trash2 className="h-4 w-4" />
                Delete
              </Button>
            )}
          </div>
          <Button onClick={onClose}>Close</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
