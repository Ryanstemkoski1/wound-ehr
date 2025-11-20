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
  const inviteToken = formData.get("inviteToken") as string | null;

  // Sign up the user (with email confirmation disabled for invite-only system)
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        name,
      },
      emailRedirectTo: undefined, // Disable email confirmation redirect
    },
  });

  if (error) {
    return {
      error: error.message,
    };
  }

  // If invite token is provided, accept the invite
  if (inviteToken && data.user) {
    const { acceptInvite } = await import("./admin");
    const inviteResult = await acceptInvite(inviteToken);

    if (inviteResult.error) {
      // If invite acceptance fails, still proceed with signup
      console.error("Failed to accept invite:", inviteResult.error);
    }
  }

  // Redirect to dashboard (no email confirmation needed for invite-only system)
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
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    // For invited users with unconfirmed emails, auto-confirm them
    if (error.message.includes("Email not confirmed")) {
      // Check if this user was invited
      const { data: invite } = await supabase
        .from("user_invites")
        .select("id")
        .eq("email", email)
        .single();
      
      if (invite) {
        // User was invited, so we should auto-confirm their email
        return {
          error:
            "Your email needs to be confirmed. Please contact your administrator or run: UPDATE auth.users SET email_confirmed_at = NOW() WHERE email = '" + email + "';",
        };
      }
      
      return {
        error:
          "Please confirm your email address before signing in. Check your inbox for a confirmation link.",
      };
    }
    
    if (error.message.includes("Invalid login credentials")) {
      return {
        error:
          "Invalid email or password. Please check your credentials and try again.",
      };
    }

    if (error.message.includes("User not found")) {
      return {
        error:
          "No account found with this email address. Please sign up first.",
      };
    }

    return {
      error: error.message,
    };
  }

  // Check if user exists in our users table (in case auth user exists but was removed from tenant)
  if (data.user) {
    // Use service role to bypass RLS for user existence check
    const { createServiceClient } = await import("@/lib/supabase/service");
    const serviceClient = createServiceClient();
    const { data: userRecord } = await serviceClient
      .from("users")
      .select("id")
      .eq("id", data.user.id)
      .single();

    if (!userRecord) {
      // User exists in auth but not in our database - they were removed
      await supabase.auth.signOut();
      return {
        error:
          "Your account has been removed from this organization. Please contact an administrator.",
      };
    }

    // Check if user has any roles assigned
    const { data: userRoles } = await supabase
      .from("user_roles")
      .select("id")
      .eq("user_id", data.user.id);

    if (!userRoles || userRoles.length === 0) {
      // User exists but has no roles - they were removed from all tenants
      await supabase.auth.signOut();
      return {
        error:
          "Your account has been removed from this organization. Please contact an administrator.",
      };
    }
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

export async function forgotPassword(formData: FormData) {
  const supabase = await createClient();

  const email = formData.get("email") as string;

  if (!email) {
    return {
      error: "Email is required",
    };
  }

  // Validate email format
  const emailSchema = z.string().email("Invalid email address");
  const validatedEmail = emailSchema.safeParse(email);

  if (!validatedEmail.success) {
    return {
      error: "Invalid email address",
    };
  }

  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/auth/reset-password`,
  });

  if (error) {
    return {
      error: error.message,
    };
  }

  return {
    success: "Password reset email sent! Check your inbox for the reset link.",
  };
}

export async function resetPassword(formData: FormData) {
  const supabase = await createClient();

  const password = formData.get("password") as string;
  const confirmPassword = formData.get("confirmPassword") as string;

  if (!password || !confirmPassword) {
    return {
      error: "Both password fields are required",
    };
  }

  if (password !== confirmPassword) {
    return {
      error: "Passwords do not match",
    };
  }

  if (password.length < 8) {
    return {
      error: "Password must be at least 8 characters",
    };
  }

  const { error } = await supabase.auth.updateUser({
    password: password,
  });

  if (error) {
    return {
      error: error.message,
    };
  }

  revalidatePath("/", "layout");
  redirect("/login?message=password_updated");
}
