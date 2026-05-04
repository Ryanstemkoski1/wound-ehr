"use client";

import { useState, useEffect, startTransition } from "react";
import { useRouter } from "next/navigation";
import { Bell, CheckCheck, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  getNotifications,
  markNotificationRead,
  markAllNotificationsRead,
  type Notification,
} from "@/app/actions/notifications";
import { cn } from "@/lib/utils";

const typeColors: Record<Notification["type"], string> = {
  correction_requested: "bg-destructive/10 text-destructive",
  note_approved:
    "bg-green-100 text-green-700 dark:bg-green-950/40 dark:text-green-300",
  ai_note_ready: "bg-primary/10 text-primary",
  patient_assigned: "bg-primary/10 text-primary",
  general: "bg-muted text-muted-foreground",
};

async function loadNotifications(
  setNotifications: (n: Notification[]) => void,
  setUnreadCount: (n: number) => void
) {
  try {
    const result = await getNotifications();
    startTransition(() => {
      setNotifications(result.notifications);
      setUnreadCount(result.unreadCount);
    });
  } catch {
    // Silently fail — notifications are non-critical
  }
}

export function NotificationBell() {
  const router = useRouter();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [open, setOpen] = useState(false);
  const [now, setNow] = useState(() => Date.now());

  // Poll notifications every 60 seconds + refresh relative times
  useEffect(() => {
    // Schedule initial load (deferred, not synchronous in effect)
    const initialTimer = setTimeout(
      () => loadNotifications(setNotifications, setUnreadCount),
      0
    );
    const pollInterval = setInterval(
      () => loadNotifications(setNotifications, setUnreadCount),
      60_000
    );
    const timeInterval = setInterval(() => setNow(Date.now()), 60_000);
    return () => {
      clearTimeout(initialTimer);
      clearInterval(pollInterval);
      clearInterval(timeInterval);
    };
  }, []);

  // Popover open/close — refresh on open (event handler, not effect)
  const handleOpenChange = (newOpen: boolean) => {
    setOpen(newOpen);
    if (newOpen) {
      loadNotifications(setNotifications, setUnreadCount);
    }
  };

  const handleClick = async (notification: Notification) => {
    if (
      !notification.read &&
      !notification.id.startsWith("ai-") &&
      !notification.id.startsWith("assign-")
    ) {
      await markNotificationRead(notification.id);
    }
    setOpen(false);
    if (notification.href) {
      router.push(notification.href);
    }
  };

  const handleMarkAllRead = async () => {
    await markAllNotificationsRead();
    await loadNotifications(setNotifications, setUnreadCount);
  };

  const formatTime = (dateStr: string) => {
    const date = new Date(dateStr);
    const diff = now - date.getTime();
    const minutes = Math.floor(diff / 60000);
    if (minutes < 1) return "just now";
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    return `${days}d ago`;
  };

  return (
    <Popover open={open} onOpenChange={handleOpenChange}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="relative"
          aria-label={`Notifications${unreadCount > 0 ? ` (${unreadCount} unread)` : ""}`}
        >
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <span className="absolute -top-0.5 -right-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[0.6rem] font-bold text-white">
              {unreadCount > 9 ? "9+" : unreadCount}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-0" align="end">
        <div className="flex items-center justify-between border-b px-4 py-3">
          <h3 className="text-sm font-semibold">Notifications</h3>
          {unreadCount > 0 && (
            <button
              type="button"
              onClick={handleMarkAllRead}
              className="text-muted-foreground hover:text-foreground flex items-center gap-1 text-xs transition-colors"
            >
              <CheckCheck className="h-3.5 w-3.5" />
              Mark all read
            </button>
          )}
        </div>

        <div className="max-h-80 overflow-y-auto">
          {notifications.length === 0 && (
            <p className="text-muted-foreground py-8 text-center text-sm">
              No notifications
            </p>
          )}
          {notifications.map((n) => (
            <button
              key={n.id}
              type="button"
              onClick={() => handleClick(n)}
              className={cn(
                "flex w-full items-start gap-3 border-b px-4 py-3 text-left transition-colors last:border-0",
                n.read
                  ? "bg-background hover:bg-muted/50"
                  : "bg-muted/30 hover:bg-muted/60"
              )}
            >
              <span
                className={cn(
                  "mt-0.5 flex h-2 w-2 shrink-0 rounded-full",
                  n.read ? "bg-transparent" : "bg-primary"
                )}
              />
              <div className="min-w-0 flex-1">
                <div className="mb-0.5 flex items-center gap-2">
                  <span
                    className={cn(
                      "rounded px-1.5 py-0.5 text-[0.6rem] font-medium uppercase",
                      typeColors[n.type]
                    )}
                  >
                    {n.title}
                  </span>
                  <span className="text-muted-foreground text-[0.65rem]">
                    {formatTime(n.createdAt)}
                  </span>
                </div>
                <p className="text-muted-foreground truncate text-xs">
                  {n.message}
                </p>
              </div>
              {n.href && (
                <ExternalLink className="text-muted-foreground mt-1 h-3 w-3 shrink-0" />
              )}
            </button>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
}
