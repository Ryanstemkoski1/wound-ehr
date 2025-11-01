"use client";

import { Calendar, dateFnsLocalizer, View } from "react-big-calendar";
import withDragAndDrop from "react-big-calendar/lib/addons/dragAndDrop";
import { format, parse, startOfWeek, getDay } from "date-fns";
import { enUS } from "date-fns/locale";
import { useState, useCallback, useEffect } from "react";
import {
  CalendarEvent,
  getCalendarEvents,
  rescheduleVisit,
} from "@/app/actions/calendar";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
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
}: CalendarViewProps) {
  const router = useRouter();
  const [events, setEvents] = useState<CalendarEvent[]>(initialEvents);
  const [view, setView] = useState<View>("month");
  const [date, setDate] = useState(new Date());
  const [isLoading, setIsLoading] = useState(false);

  // Load events when filters change
  const loadEvents = useCallback(async () => {
    setIsLoading(true);
    try {
      // Calculate date range based on current view
      const start = new Date(date);
      start.setDate(1); // First day of month
      const end = new Date(date);
      end.setMonth(end.getMonth() + 1);
      end.setDate(0); // Last day of month

      const result = await getCalendarEvents(start, end, facilityId, patientId);

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
  }, [date, facilityId, patientId]);

  useEffect(() => {
    loadEvents();
  }, [loadEvents]);

  // Handle event selection (click)
  const handleSelectEvent = useCallback(
    (event: CalendarEvent) => {
      // Navigate to visit detail page
      router.push(`/dashboard/visits/${event.resource.visitId}`);
    },
    [router]
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

  return (
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
  );
}
