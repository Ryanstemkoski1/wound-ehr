// Server Actions for Facility Management
"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import prisma from "@/lib/prisma";
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
    const facility = await prisma.facility.create({
      data: {
        name: data.name,
        address: data.address || null,
        city: data.city || null,
        state: data.state || null,
        zip: data.zip || null,
        phone: data.phone || null,
        fax: data.fax || null,
        contactPerson: data.contactPerson || null,
        email: data.email || null,
        notes: data.notes || null,
      },
    });

    // Associate facility with current user
    await prisma.userFacility.create({
      data: {
        userId: user.id,
        facilityId: facility.id,
        isDefault: false, // Can be updated later
      },
    });

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
    const userFacility = await prisma.userFacility.findUnique({
      where: {
        userId_facilityId: {
          userId: user.id,
          facilityId,
        },
      },
    });

    if (!userFacility) {
      return { error: "You don't have access to this facility" };
    }

    // Update facility
    await prisma.facility.update({
      where: { id: facilityId },
      data: {
        name: data.name,
        address: data.address || null,
        city: data.city || null,
        state: data.state || null,
        zip: data.zip || null,
        phone: data.phone || null,
        fax: data.fax || null,
        contactPerson: data.contactPerson || null,
        email: data.email || null,
        notes: data.notes || null,
      },
    });

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
    const userFacility = await prisma.userFacility.findUnique({
      where: {
        userId_facilityId: {
          userId: user.id,
          facilityId,
        },
      },
    });

    if (!userFacility) {
      return { error: "You don't have access to this facility" };
    }

    // Soft delete (mark as inactive)
    await prisma.facility.update({
      where: { id: facilityId },
      data: { isActive: false },
    });

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
    const facilities = await prisma.facility.findMany({
      where: {
        isActive: true,
        users: {
          some: {
            userId: user.id,
          },
        },
      },
      include: {
        _count: {
          select: {
            patients: true,
          },
        },
      },
      orderBy: {
        name: "asc",
      },
    });

    return facilities;
  } catch (error) {
    console.error("Failed to fetch facilities:", error);
    return [];
  }
}
