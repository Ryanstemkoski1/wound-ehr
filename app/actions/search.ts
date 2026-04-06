"use server";

import { createClient } from "@/lib/supabase/server";

export type SearchResult = {
  id: string;
  type: "patient" | "visit" | "facility";
  title: string;
  subtitle: string;
  href: string;
};

/**
 * Global search across patients, visits, and facilities.
 * Returns up to 10 results. Used by the Cmd+K search dialog.
 */
export async function globalSearch(query: string): Promise<SearchResult[]> {
  if (!query || query.trim().length < 2) return [];

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return [];

  // Sanitize for PostgREST filter syntax — escape characters that break .or()/.ilike()
  const term = query.trim().replace(/[%_\\(),.*]/g, "");
  if (!term) return [];
  const results: SearchResult[] = [];

  // Search patients (name, MRN)
  const { data: patients } = await supabase
    .from("patients")
    .select("id, first_name, last_name, mrn, dob")
    .eq("is_active", true)
    .or(
      `first_name.ilike.%${term}%,last_name.ilike.%${term}%,mrn.ilike.%${term}%`
    )
    .limit(5);

  if (patients) {
    for (const p of patients) {
      results.push({
        id: p.id,
        type: "patient",
        title: `${p.first_name} ${p.last_name}`,
        subtitle: `MRN: ${p.mrn} · DOB: ${new Date(p.dob).toLocaleDateString()}`,
        href: `/dashboard/patients/${p.id}`,
      });
    }
  }

  // Search facilities (name)
  const { data: facilities } = await supabase
    .from("facilities")
    .select("id, name, city, state")
    .ilike("name", `%${term}%`)
    .limit(3);

  if (facilities) {
    for (const f of facilities) {
      results.push({
        id: f.id,
        type: "facility",
        title: f.name,
        subtitle: [f.city, f.state].filter(Boolean).join(", ") || "Facility",
        href: `/dashboard/admin/facilities/${f.id}`,
      });
    }
  }

  return results.slice(0, 10);
}
