// Server Actions for Authentication
"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { z } from "zod";
import { headers } from "next/headers";
import { rateLimit, clientKey } from "@/lib/rate-limit";
import { auditPhiAccess } from "@/lib/audit-log";

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
    }
  }

  // Return redirect target (no email confirmation needed for invite-only system)
  revalidatePath("/", "layout");
  return { success: true, redirectTo: "/dashboard" };
}

export async function login(formData: FormData) {
  const supabase = await createClient();

  // Rate limit login attempts: 10 per 15 minutes per IP. Prevents
  // credential stuffing / brute-force without locking real users out.
  try {
    const h = await headers();
    const rl = rateLimit(clientKey(h, "login"), 10, 15 * 60_000);
    if (!rl.allowed) {
      return {
        error: `Too many login attempts. Try again in ${Math.ceil(
          rl.retryAfterMs / 1000
        )}s.`,
      };
    }
  } catch {
    // headers() unavailable — skip rate limit rather than block login
  }

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
    // For unconfirmed-email errors, surface a clearer message when an
    // outstanding *valid* invite exists. NOTE: this branch does NOT
    // auto-confirm the email (security: would bypass Supabase email
    // verification). Operators must confirm via the admin client.
    if (error.message.includes("Email not confirmed")) {
      const { data: invites } = await supabase
        .from("user_invites")
        .select("id, expires_at, accepted_at")
        .eq("email", email)
        .is("accepted_at", null)
        .gt("expires_at", new Date().toISOString())
        .order("created_at", { ascending: false })
        .limit(1);

      const hasValidInvite = (invites?.length ?? 0) > 0;

      return {
        error: hasValidInvite
          ? "Your email needs to be confirmed. Please contact your administrator to confirm your account."
          : "Please confirm your email address before signing in. Check your inbox for a confirmation link.",
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
    try {
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
    } catch {
      // Service client unavailable (missing SUPABASE_SERVICE_ROLE_KEY)
      // Fall through - allow login, RLS will still protect data
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

  // Audit successful login (HIPAA: track session start)
  if (data.user) {
    void auditPhiAccess({
      action: "read",
      table: "auth.users",
      recordId: data.user.id,
      recordType: "login",
      reason: "User authenticated",
    });
  }

  revalidatePath("/", "layout");
  return { success: true, redirectTo: "/dashboard" };
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
  return { success: true, redirectTo: "/login" };
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
  return { success: true, redirectTo: "/login?message=password_updated" };
}
