"use client";

import { Calendar, dateFnsLocalizer, View } from "react-big-calendar";
import withDragAndDrop from "react-big-calendar/lib/addons/dragAndDrop";
import {
  format,
  parse,
  startOfWeek,
  getDay,
  startOfMonth,
  endOfMonth,
  startOfWeek as dfStartOfWeek,
  endOfWeek as dfEndOfWeek,
  startOfDay,
  endOfDay,
} from "date-fns";
import { enUS } from "date-fns/locale";
import { useState, useCallback, useEffect } from "react";
import {
  CalendarEvent,
  getCalendarEvents,
  rescheduleVisit,
  updateVisitStatus,
  deleteVisit,
} from "@/app/actions/calendar";
import { toast } from "sonner";
import { EventDetailsModal } from "./event-details-modal";
import NewVisitDialog from "./new-visit-dialog";
import "react-big-calendar/lib/css/react-big-calendar.css";
import "react-big-calendar/lib/addons/dragAndDrop/styles.css";

// Configure date-fns localizer
const locales = {
  "en-US": enUS,
};

const localizer = dateFnsLocalizer({
  format,
  parse,
  startOfWeek,
  getDay,
  locales,
});

// Create DnD Calendar with proper types
const DnDCalendar = withDragAndDrop<CalendarEvent, object>(Calendar);

type CalendarViewProps = {
  initialEvents?: CalendarEvent[];
  facilityId?: string;
  patientId?: string;
  clinicianId?: string;
};

// Color mapping for visit statuses
const statusColors: Record<
  string,
  { background: string; border: string; text: string }
> = {
  scheduled: {
    background: "oklch(0.85 0.12 192)", // light teal
    border: "oklch(0.52 0.12 192)", // primary teal
    text: "oklch(0.20 0.06 192)", // dark teal
  },
  "in-progress": {
    background: "oklch(0.90 0.08 85)", // light amber
    border: "oklch(0.70 0.12 85)", // amber
    text: "oklch(0.30 0.06 85)", // dark amber
  },
  completed: {
    background: "oklch(0.85 0.12 160)", // light green
    border: "oklch(0.55 0.15 160)", // green
    text: "oklch(0.25 0.08 160)", // dark green
  },
  cancelled: {
    background: "oklch(0.90 0.05 0)", // light gray
    border: "oklch(0.60 0.03 0)", // gray
    text: "oklch(0.40 0.02 0)", // dark gray
  },
};

export default function CalendarView({
  initialEvents = [],
  facilityId,
  patientId,
  clinicianId,
}: CalendarViewProps) {
  const [events, setEvents] = useState<CalendarEvent[]>(initialEvents);
  const [view, setView] = useState<View>("month");
  const [date, setDate] = useState(new Date());
  const [isLoading, setIsLoading] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(
    null
  );
  const [isModalOpen, setIsModalOpen] = useState(false);

  // New appointment creation state
  const [isNewAppointmentModalOpen, setIsNewAppointmentModalOpen] =
    useState(false);
  const [selectedSlot, setSelectedSlot] = useState<{
    start: Date;
    end: Date;
  } | null>(null);

  // Load events when filters change
  const loadEvents = useCallback(async () => {
    setIsLoading(true);
    try {
      // Calculate date range based on current view, including spillover days
      let start: Date;
      let end: Date;

      if (view === "week") {
        start = dfStartOfWeek(date, { locale: enUS });
        end = dfEndOfWeek(date, { locale: enUS });
      } else if (view === "day") {
        start = startOfDay(date);
        end = endOfDay(date);
      } else {
        // month view (default): include previous/next month spillover days
        const monthStart = startOfMonth(date);
        const monthEnd = endOfMonth(date);
        start = dfStartOfWeek(monthStart, { locale: enUS });
        end = dfEndOfWeek(monthEnd, { locale: enUS });
      }

      const result = await getCalendarEvents(
        start,
        end,
        facilityId,
        patientId,
        clinicianId
      );

      if (result.success) {
        // Server Actions serialize Dates as strings; coerce back to Date objects
        const coerced = result.events.map((e) => ({
          ...e,
          start: typeof e.start === "string" ? new Date(e.start) : e.start,
          end: typeof e.end === "string" ? new Date(e.end) : e.end,
        }));
        setEvents(coerced);
      } else {
        toast.error(result.error);
      }
    } catch (error) {
      console.error("Failed to load events:", error);
      toast.error("Failed to load calendar events");
    } finally {
      setIsLoading(false);
    }
  }, [date, facilityId, patientId, view]);

  useEffect(() => {
    loadEvents();
  }, [loadEvents]);

  // Handle event click - Open modal instead of navigate
  const handleSelectEvent = useCallback((event: CalendarEvent) => {
    setSelectedEvent(event);
    setIsModalOpen(true);
  }, []);

  // Handle slot selection (clicking/dragging on empty calendar space)
  const handleSelectSlot = useCallback(
    (slotInfo: {
      start: string | Date;
      end: string | Date;
      slots: Date[] | string[];
      action: "select" | "click" | "doubleClick";
    }) => {
      const startDate =
        typeof slotInfo.start === "string"
          ? new Date(slotInfo.start)
          : slotInfo.start;
      const endDate =
        typeof slotInfo.end === "string"
          ? new Date(slotInfo.end)
          : slotInfo.end;

      setSelectedSlot({
        start: startDate,
        end: endDate,
      });
      setIsNewAppointmentModalOpen(true);
    },
    []
  );

  // Handle drag-and-drop rescheduling
  const handleEventDrop = useCallback(
    async (args: {
      event: CalendarEvent;
      start: string | Date;
      end: string | Date;
    }) => {
      try {
        const startDate =
          typeof args.start === "string" ? new Date(args.start) : args.start;

        const result = await rescheduleVisit({
          visitId: args.event.resource.visitId,
          visitDate: startDate,
        });

        if (result.success) {
          toast.success(`Visit rescheduled to ${format(startDate, "PPp")}`);
          // Reload events
          await loadEvents();
        } else {
          toast.error(result.error);
        }
      } catch (error) {
        console.error("Failed to reschedule visit:", error);
        toast.error("Failed to reschedule visit");
      }
    },
    [loadEvents]
  );

  // Handle event resize
  const handleEventResize = useCallback(
    async (args: {
      event: CalendarEvent;
      start: string | Date;
      end: string | Date;
    }) => {
      try {
        const startDate =
          typeof args.start === "string" ? new Date(args.start) : args.start;

        const result = await rescheduleVisit({
          visitId: args.event.resource.visitId,
          visitDate: startDate,
        });

        if (result.success) {
          toast.success("Visit rescheduled");
          await loadEvents();
        } else {
          toast.error(result.error);
        }
      } catch (error) {
        console.error("Failed to reschedule visit:", error);
        toast.error("Failed to reschedule visit");
      }
    },
    [loadEvents]
  );

  // Custom event styling based on status
  const eventStyleGetter = useCallback((event: CalendarEvent) => {
    const colors =
      statusColors[event.resource.status] || statusColors.scheduled;

    return {
      style: {
        backgroundColor: colors.background,
        borderLeft: `4px solid ${colors.border}`,
        color: colors.text,
        borderRadius: "4px",
        padding: "2px 5px",
        fontSize: "0.875rem",
      },
    };
  }, []);

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setSelectedEvent(null);
  };

  const handleCloseNewAppointmentModal = () => {
    setIsNewAppointmentModalOpen(false);
    setSelectedSlot(null);
  };

  const handleAppointmentCreated = async () => {
    handleCloseNewAppointmentModal();
    await loadEvents();
    toast.success("Appointment created successfully");
  };

  const handleStatusChange = async (
    event: CalendarEvent,
    newStatus: string
  ) => {
    if (!event.resource?.visitId) return;

    const result = await updateVisitStatus(event.resource.visitId, newStatus);

    if (result.success) {
      toast.success("Visit status updated successfully");
      handleCloseModal();
      await loadEvents();
    } else {
      toast.error(result.error || "Failed to update visit status");
    }
  };

  const handleEdit = (event: CalendarEvent) => {
    if (!event.resource?.visitId || !event.resource?.patientId) return;

    // Navigate to visit edit page
    window.location.href = `/dashboard/patients/${event.resource.patientId}/visits/${event.resource.visitId}/edit`;
  };

  const handleDelete = async (event: CalendarEvent) => {
    if (!event.resource?.visitId) return;

    if (
      !confirm(
        "Are you sure you want to delete this visit? This action cannot be undone."
      )
    ) {
      return;
    }

    const result = await deleteVisit(event.resource.visitId);

    if (result.success) {
      toast.success("Visit deleted successfully");
      handleCloseModal();
      await loadEvents();
    } else {
      toast.error(result.error || "Failed to delete visit");
    }
  };

  return (
    <>
      <div className="h-[calc(100vh-12rem)]">
        {isLoading && (
          <div className="text-muted-foreground mb-2 text-sm">
            Loading calendar events...
          </div>
        )}
        <DnDCalendar
          localizer={localizer}
          events={events}
          startAccessor="start"
          endAccessor="end"
          view={view}
          onView={setView}
          date={date}
          onNavigate={setDate}
          onSelectEvent={handleSelectEvent}
          onSelectSlot={handleSelectSlot}
          onEventDrop={handleEventDrop}
          onEventResize={handleEventResize}
          eventPropGetter={eventStyleGetter}
          resizable
          popup
          selectable
          style={{ height: "100%" }}
          tooltipAccessor={(event) =>
            `${event.title}\n${event.resource.facilityName}\nStatus: ${event.resource.status}\nWounds: ${event.resource.woundCount}`
          }
        />
      </div>

      {/* Event Details Modal */}
      <EventDetailsModal
        event={selectedEvent}
        open={isModalOpen}
        onClose={handleCloseModal}
        onEdit={handleEdit}
        onDelete={handleDelete}
        onStatusChange={handleStatusChange}
      />

      {/* New Appointment Dialog */}
      <NewVisitDialog
        open={isNewAppointmentModalOpen}
        onOpenChange={setIsNewAppointmentModalOpen}
        initialDate={selectedSlot?.start}
        onSuccess={handleAppointmentCreated}
      />
    </>
  );
}
