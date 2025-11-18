// Server Actions for Facility Management
"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

// Validation schema for facility
const facilitySchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  address: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  zip: z.string().optional(),
  phone: z.string().optional(),
  fax: z.string().optional(),
  contactPerson: z.string().optional(),
  email: z.string().email("Invalid email").optional().or(z.literal("")),
  notes: z.string().optional(),
});

export async function createFacility(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Unauthorized" };
  }

  // Validate input
  const validatedFields = facilitySchema.safeParse({
    name: formData.get("name"),
    address: formData.get("address"),
    city: formData.get("city"),
    state: formData.get("state"),
    zip: formData.get("zip"),
    phone: formData.get("phone"),
    fax: formData.get("fax"),
    contactPerson: formData.get("contactPerson"),
    email: formData.get("email"),
    notes: formData.get("notes"),
  });

  if (!validatedFields.success) {
    return {
      error: validatedFields.error.issues[0].message,
    };
  }

  const data = validatedFields.data;

  try {
    // Create facility
    const { data: facility, error: facilityError } = await supabase
      .from("facilities")
      .insert({
        name: data.name,
        address: data.address || null,
        city: data.city || null,
        state: data.state || null,
        zip: data.zip || null,
        phone: data.phone || null,
        fax: data.fax || null,
        contact_person: data.contactPerson || null,
        email: data.email || null,
        notes: data.notes || null,
      })
      .select("id")
      .single();

    if (facilityError) {
      throw facilityError;
    }

    // Associate facility with current user
    const { error: userFacilityError } = await supabase
      .from("user_facilities")
      .insert({
        user_id: user.id,
        facility_id: facility.id,
        is_default: false,
      });

    if (userFacilityError) {
      throw userFacilityError;
    }

    revalidatePath("/dashboard/facilities");
    return { success: true, facilityId: facility.id };
  } catch (error) {
    console.error("Failed to create facility:", error);
    return { error: "Failed to create facility" };
  }
}

export async function updateFacility(facilityId: string, formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Unauthorized" };
  }

  // Validate input
  const validatedFields = facilitySchema.safeParse({
    name: formData.get("name"),
    address: formData.get("address"),
    city: formData.get("city"),
    state: formData.get("state"),
    zip: formData.get("zip"),
    phone: formData.get("phone"),
    fax: formData.get("fax"),
    contactPerson: formData.get("contactPerson"),
    email: formData.get("email"),
    notes: formData.get("notes"),
  });

  if (!validatedFields.success) {
    return {
      error: validatedFields.error.issues[0].message,
    };
  }

  const data = validatedFields.data;

  try {
    // Check if user has access to this facility
    const { data: userFacility, error: checkError } = await supabase
      .from("user_facilities")
      .select("*")
      .eq("user_id", user.id)
      .eq("facility_id", facilityId)
      .maybeSingle();

    if (checkError || !userFacility) {
      return { error: "You don't have access to this facility" };
    }

    // Update facility
    const { error: updateError } = await supabase
      .from("facilities")
      .update({
        name: data.name,
        address: data.address || null,
        city: data.city || null,
        state: data.state || null,
        zip: data.zip || null,
        phone: data.phone || null,
        fax: data.fax || null,
        contact_person: data.contactPerson || null,
        email: data.email || null,
        notes: data.notes || null,
      })
      .eq("id", facilityId);

    if (updateError) {
      throw updateError;
    }

    revalidatePath("/dashboard/facilities");
    return { success: true };
  } catch (error) {
    console.error("Failed to update facility:", error);
    return { error: "Failed to update facility" };
  }
}

export async function deleteFacility(facilityId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Unauthorized" };
  }

  try {
    // Check if user has access to this facility
    const { data: userFacility, error: checkError } = await supabase
      .from("user_facilities")
      .select("*")
      .eq("user_id", user.id)
      .eq("facility_id", facilityId)
      .maybeSingle();

    if (checkError || !userFacility) {
      return { error: "You don't have access to this facility" };
    }

    // Soft delete (mark as inactive)
    const { error: updateError } = await supabase
      .from("facilities")
      .update({ is_active: false })
      .eq("id", facilityId);

    if (updateError) {
      throw updateError;
    }

    revalidatePath("/dashboard/facilities");
    return { success: true };
  } catch (error) {
    console.error("Failed to delete facility:", error);
    return { error: "Failed to delete facility" };
  }
}

export async function getUserFacilities() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return [];
  }

  try {
    const { data: userFacilities, error: userError } = await supabase
      .from("user_facilities")
      .select("facility_id")
      .eq("user_id", user.id);

    if (userError) {
      throw userError;
    }

    const facilityIds = userFacilities?.map((uf) => uf.facility_id) || [];

    if (facilityIds.length === 0) {
      return [];
    }

    const { data: facilities, error } = await supabase
      .from("facilities")
      .select(
        `
        *,
        patients!left(id)
      `
      )
      .in("id", facilityIds)
      .order("name", { ascending: true });
    
    if (error) {
      throw error;
    }

    // Transform to include _count and camelCase
    return (
      facilities?.map((facility) => ({
        id: facility.id,
        name: facility.name,
        address: facility.address,
        city: facility.city,
        state: facility.state,
        zip: facility.zip,
        phone: facility.phone,
        fax: facility.fax,
        contactPerson: facility.contact_person,
        email: facility.email,
        notes: facility.notes,
        isActive: facility.is_active,
        createdAt: facility.created_at,
        updatedAt: facility.updated_at,
        _count: {
          patients: facility.patients?.length || 0,
        },
      })) || []
    );
  } catch (error) {
    console.error("Failed to fetch facilities:", error);
    return [];
  }
}
