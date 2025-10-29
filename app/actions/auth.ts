// Server Actions for Authentication
"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { z } from "zod";

// Validation schemas
const signUpSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(8, "Password must be at least 8 characters"),
  name: z.string().min(2, "Name must be at least 2 characters"),
});

const signInSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(1, "Password is required"),
});

export async function signup(formData: FormData) {
  const supabase = await createClient();

  // Validate input
  const validatedFields = signUpSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
    name: formData.get("name"),
  });

  if (!validatedFields.success) {
    return {
      error: validatedFields.error.issues[0].message,
    };
  }

  const { email, password, name } = validatedFields.data;

  // Sign up the user
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        name,
      },
    },
  });

  if (error) {
    return {
      error: error.message,
    };
  }

  // Check if email confirmation is required
  // If user is not immediately confirmed, redirect to confirmation page
  if (data.user && !data.session) {
    revalidatePath("/", "layout");
    redirect("/auth/confirm-email");
  }

  // If user is auto-confirmed (email confirmation disabled in Supabase)
  revalidatePath("/", "layout");
  redirect("/dashboard");
}

export async function login(formData: FormData) {
  const supabase = await createClient();

  // Validate input
  const validatedFields = signInSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });

  if (!validatedFields.success) {
    return {
      error: validatedFields.error.issues[0].message,
    };
  }

  const { email, password } = validatedFields.data;

  // Sign in the user
  const { error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    // Provide better error message for unconfirmed email
    if (error.message.includes("Email not confirmed")) {
      return {
        error:
          "Please confirm your email address before signing in. Check your inbox for a confirmation link.",
      };
    }
    return {
      error: error.message,
    };
  }

  revalidatePath("/", "layout");
  redirect("/dashboard");
}

export async function logout() {
  const supabase = await createClient();

  const { error } = await supabase.auth.signOut();

  if (error) {
    return {
      error: error.message,
    };
  }

  revalidatePath("/", "layout");
  redirect("/login");
}

export async function resendConfirmation(formData: FormData) {
  const supabase = await createClient();

  const email = formData.get("email") as string;

  if (!email) {
    return {
      error: "Email is required",
    };
  }

  const { error } = await supabase.auth.resend({
    type: "signup",
    email,
  });

  if (error) {
    return {
      error: error.message,
    };
  }

  return {
    success: "Confirmation email sent! Check your inbox.",
  };
}
