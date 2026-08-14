// Field surface — auth helpers.
// Sign-out for the (field) shell: reuses the core logout action
// (Supabase signOut + layout revalidation) and always lands the
// user on /login, even if the session was already gone.
"use server";

import { redirect } from "next/navigation";
import { logout } from "./auth";

export async function signOutField(): Promise<void> {
  await logout();
  redirect("/login");
}
