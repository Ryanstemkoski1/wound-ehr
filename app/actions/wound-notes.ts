"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

const woundNoteSchema = z.object({
  woundId: z.string().min(1),
  visitId: z.string().optional(),
  note: z.string().min(1).max(5000),
});

export async function getWoundNotes(woundId: string) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("wound_notes")
    .select("*")
    .eq("wound_id", woundId)
    .order("created_at", { ascending: false });
  return { data };
}

export async function createWoundNote(formData: FormData) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Unauthorized" };

  const validated = woundNoteSchema.safeParse({
    woundId: formData.get("woundId"),
    visitId: formData.get("visitId") || undefined,
    note: formData.get("note"),
  });

  if (!validated.success) return { error: validated.error.issues[0].message };

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

  revalidatePath("/patients");
  return { success: true, data };
}

export async function updateWoundNote(noteId: string, note: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Unauthorized" };

  const { error } = await supabase
    .from("wound_notes")
    .update({ note })
    .eq("id", noteId)
    .eq("created_by", user.id);

  if (error) return { error: error.message };

  revalidatePath("/patients");
  return { success: true };
}

export async function deleteWoundNote(noteId: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Unauthorized" };

  const { error } = await supabase
    .from("wound_notes")
    .delete()
    .eq("id", noteId)
    .eq("created_by", user.id);

  if (error) return { error: error.message };

  revalidatePath("/patients");
  return { success: true };
}
