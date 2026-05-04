"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { auditPhiAccess } from "@/lib/audit-log";

const woundNoteSchema = z.object({
  woundId: z.string().min(1),
  visitId: z.string().optional(),
  note: z.string().min(1).max(5000),
});

export async function getWoundNotes(woundId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { data: null, error: "Unauthorized" };

  try {
    const { data, error } = await supabase
      .from("wound_notes")
      .select("*")
      .eq("wound_id", woundId)
      .order("created_at", { ascending: false });

    if (error) return { data: null, error: error.message };

    void auditPhiAccess({
      action: "read",
      table: "wound_notes",
      recordId: woundId,
      recordType: "wound_notes_list",
    });

    return { data };
  } catch (error) {
    console.error("Error fetching wound notes:", error);
    return { data: null, error: "Failed to fetch wound notes" };
  }
}

export async function createWoundNote(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Unauthorized" };

  const validated = woundNoteSchema.safeParse({
    woundId: formData.get("woundId"),
    visitId: formData.get("visitId") || undefined,
    note: formData.get("note"),
  });

  if (!validated.success) return { error: validated.error.issues[0].message };

  try {
    const { data, error } = await supabase
      .from("wound_notes")
      .insert({
        wound_id: validated.data.woundId,
        visit_id: validated.data.visitId || null,
        note: validated.data.note,
        created_by: user.id,
      })
      .select()
      .single();

    if (error) return { error: error.message };

    void auditPhiAccess({
      action: "create",
      table: "wound_notes",
      recordId: data.id,
      recordType: "wound_note",
    });

    revalidatePath("/dashboard/patients");
    return { success: true, data };
  } catch (error) {
    console.error("Error creating wound note:", error);
    return { error: "Failed to create wound note" };
  }
}

export async function updateWoundNote(noteId: string, note: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Unauthorized" };

  try {
    const { error } = await supabase
      .from("wound_notes")
      .update({ note })
      .eq("id", noteId)
      .eq("created_by", user.id);

    if (error) return { error: error.message };

    void auditPhiAccess({
      action: "update",
      table: "wound_notes",
      recordId: noteId,
      recordType: "wound_note",
    });

    revalidatePath("/dashboard/patients");
    return { success: true };
  } catch (error) {
    console.error("Error updating wound note:", error);
    return { error: "Failed to update wound note" };
  }
}

export async function deleteWoundNote(noteId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Unauthorized" };

  try {
    const { error } = await supabase
      .from("wound_notes")
      .delete()
      .eq("id", noteId)
      .eq("created_by", user.id);

    if (error) return { error: error.message };

    void auditPhiAccess({
      action: "delete",
      table: "wound_notes",
      recordId: noteId,
      recordType: "wound_note",
    });

    revalidatePath("/dashboard/patients");
    return { success: true };
  } catch (error) {
    console.error("Error deleting wound note:", error);
    return { error: "Failed to delete wound note" };
  }
}
