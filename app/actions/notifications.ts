"use server";

import { createClient } from "@/lib/supabase/server";

export type Notification = {
  id: string;
  type:
    | "correction_requested"
    | "note_approved"
    | "ai_note_ready"
    | "patient_assigned"
    | "general";
  title: string;
  message: string;
  href: string | null;
  read: boolean;
  createdAt: string;
};

/**
 * Fetch unread and recent notifications for the current user.
 * Sources: addendum_notifications, approval status changes, AI transcripts.
 * Returns the latest 20 notifications.
 */
export async function getNotifications(): Promise<{
  notifications: Notification[];
  unreadCount: number;
}> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { notifications: [], unreadCount: 0 };

  const notifications: Notification[] = [];

  // 1. Addendum notifications (correction requests)
  const { data: addendumNotifs } = await supabase
    .from("addendum_notifications")
    .select(
      `
      id,
      notification_type,
      message,
      is_read,
      created_at,
      visit_id,
      visits!inner(patient_id)
    `
    )
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(10);

  if (addendumNotifs) {
    for (const n of addendumNotifs) {
      const visit = n.visits as unknown as { patient_id: string };
      notifications.push({
        id: n.id,
        type:
          n.notification_type === "correction_requested"
            ? "correction_requested"
            : "note_approved",
        title:
          n.notification_type === "correction_requested"
            ? "Correction Requested"
            : "Note Approved",
        message: n.message || "A visit note has been updated.",
        href: visit?.patient_id
          ? `/dashboard/patients/${visit.patient_id}/visits/${n.visit_id}`
          : null,
        read: n.is_read || false,
        createdAt: n.created_at,
      });
    }
  }

  // 2. AI transcript completions (visit_transcripts where status = completed, recent)
  const { data: transcripts } = await supabase
    .from("visit_transcripts")
    .select("id, visit_id, status, created_at, visits!inner(patient_id)")
    .eq("created_by", user.id)
    .eq("status", "completed")
    .order("created_at", { ascending: false })
    .limit(5);

  if (transcripts) {
    for (const t of transcripts) {
      const visit = t.visits as unknown as { patient_id: string };
      // Only show if created in the last 24 hours
      const age = Date.now() - new Date(t.created_at).getTime();
      if (age < 24 * 60 * 60 * 1000) {
        notifications.push({
          id: `ai-${t.id}`,
          type: "ai_note_ready",
          title: "AI Note Ready",
          message: "Your AI clinical note has been generated.",
          href: visit?.patient_id
            ? `/dashboard/patients/${visit.patient_id}/visits/${t.visit_id}`
            : null,
          read: false, // No read tracking for these yet
          createdAt: t.created_at,
        });
      }
    }
  }

  // 3. Patient assignments (patient_clinicians, recent)
  const { data: assignments } = await supabase
    .from("patient_clinicians")
    .select("id, patient_id, created_at, patients!inner(first_name, last_name)")
    .eq("clinician_id", user.id)
    .order("created_at", { ascending: false })
    .limit(5);

  if (assignments) {
    for (const a of assignments) {
      const patient = a.patients as unknown as {
        first_name: string;
        last_name: string;
      };
      const age = Date.now() - new Date(a.created_at).getTime();
      if (age < 7 * 24 * 60 * 60 * 1000) {
        // Last 7 days
        notifications.push({
          id: `assign-${a.id}`,
          type: "patient_assigned",
          title: "New Patient Assigned",
          message: `${patient.first_name} ${patient.last_name} has been assigned to you.`,
          href: `/dashboard/patients/${a.patient_id}`,
          read: false,
          createdAt: a.created_at,
        });
      }
    }
  }

  // Sort by date descending
  notifications.sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );

  const unreadCount = notifications.filter((n) => !n.read).length;

  return {
    notifications: notifications.slice(0, 20),
    unreadCount,
  };
}

/**
 * Mark a notification as read (only works for addendum_notifications).
 */
export async function markNotificationRead(notificationId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;

  // Only addendum_notifications have is_read column
  await supabase
    .from("addendum_notifications")
    .update({ is_read: true })
    .eq("id", notificationId)
    .eq("user_id", user.id);
}

/**
 * Mark all addendum notifications as read for current user.
 */
export async function markAllNotificationsRead() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;

  await supabase
    .from("addendum_notifications")
    .update({ is_read: true })
    .eq("user_id", user.id)
    .eq("is_read", false);
}
