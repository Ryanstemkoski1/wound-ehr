"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { createClient } from "@/lib/supabase/client";
import { signup } from "@/app/actions/auth";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Loader2, CheckCircle2, XCircle, Mail } from "lucide-react";
import Link from "next/link";

const signupSchema = z
  .object({
    name: z.string().min(2, "Name must be at least 2 characters"),
    email: z.string().email("Invalid email address"),
    password: z.string().min(8, "Password must be at least 8 characters"),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords don't match",
    path: ["confirmPassword"],
  });

type SignupFormData = z.infer<typeof signupSchema>;

function AcceptInviteContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const inviteToken = searchParams.get("token");

  const [isLoading, setIsLoading] = useState(false);
  const [isValidating, setIsValidating] = useState(true);
  const [inviteData, setInviteData] = useState<{
    email: string;
    role: string;
    facilityName?: string;
    invitedBy?: string;
  } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const form = useForm<SignupFormData>({
    resolver: zodResolver(signupSchema),
    defaultValues: {
      name: "",
      email: "",
      password: "",
      confirmPassword: "",
    },
  });

  // Validate invite token on mount
  useEffect(() => {
    async function validateInvite() {
      if (!inviteToken) {
        setError("No invite token provided");
        setIsValidating(false);
        return;
      }

      try {
        const supabase = createClient();

        // Check if user is already logged in
        const {
          data: { user },
        } = await supabase.auth.getUser();

        // Get invite details
        const { data: invite, error: inviteError } = await supabase
          .from("user_invites")
          .select(
            `
            *,
            facility:facilities(name)
          `
          )
          .eq("invite_token", inviteToken)
          .is("accepted_at", null)
          .single();

        if (inviteError || !invite) {
          setError("Invalid or expired invite");
          setIsValidating(false);
          return;
        }

        // Check if expired
        if (new Date(invite.expires_at) < new Date()) {
          setError("This invite has expired");
          setIsValidating(false);
          return;
        }

        // If user is already logged in with matching email, auto-accept the invite
        if (user && user.email === invite.email) {
          try {
            const { acceptInvite } = await import("@/app/actions/admin");
            const result = await acceptInvite(inviteToken);

            if (result.error) {
              setError(result.error);
              setIsValidating(false);
              return;
            }

            // Success - keep validating state, show success, then redirect
            setIsValidating(false);
            setSuccess(true);
            setTimeout(() => {
              router.push("/dashboard");
            }, 1500);
            return;
          } catch {
            setError("Failed to accept invite automatically");
            setIsValidating(false);
            return;
          }
        }

        // Set invite data for signup form
        setInviteData({
          email: invite.email,
          role: invite.role,
          facilityName: invite.facility?.name,
        });

        // Pre-fill email
        form.setValue("email", invite.email);

        setIsValidating(false);
      } catch {
        setError("Failed to validate invite");
        setIsValidating(false);
      }
    }

    validateInvite();
  }, [inviteToken, form, router]);

  const onSubmit = async (data: SignupFormData) => {
    if (!inviteToken) return;

    setIsLoading(true);
    setError(null);

    try {
      // Check if invite email matches
      if (data.email !== inviteData?.email) {
        setError("Email must match the invited email address");
        setIsLoading(false);
        return;
      }

      // Create FormData to pass to the signup server action
      const formData = new FormData();
      formData.append("name", data.name);
      formData.append("email", data.email);
      formData.append("password", data.password);
      formData.append("inviteToken", inviteToken); // Pass the invite token (must match auth.ts parameter name)

      // Call the signup server action (it will handle invite acceptance internally)
      const result = await signup(formData);

      if (result?.error) {
        throw new Error(result.error);
      }

      // Success! Redirect to dashboard
      if (result && "redirectTo" in result) {
        setSuccess(true);
        router.push(result.redirectTo as string);
      }
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "An error occurred during signup"
      );
      setIsLoading(false);
    }
  };

  const getRoleLabel = (role: string) => {
    switch (role) {
      case "tenant_admin":
        return "Tenant Administrator";
      case "facility_admin":
        return "Facility Administrator";
      case "user":
        return "User";
      default:
        return role;
    }
  };

  if (isValidating) {
    return (
      <div className="bg-background flex min-h-screen flex-col items-center justify-center px-6 py-12">
        <div className="flex flex-col items-center gap-4 py-8">
          <div className="border-primary h-8 w-8 animate-spin rounded-full border-[3px] border-t-transparent" />
          <p className="text-muted-foreground text-sm">
            Validating invitation…
          </p>
        </div>
      </div>
    );
  }

  if (error && !inviteData) {
    return (
      <div className="bg-background flex min-h-screen flex-col items-center justify-center px-6 py-12">
        <div className="w-full max-w-[22rem] space-y-8">
          <div className="space-y-3 text-center">
            <div className="bg-destructive/10 ring-destructive/20 mx-auto flex h-14 w-14 items-center justify-center rounded-2xl ring-1">
              <XCircle className="text-destructive h-7 w-7" />
            </div>
            <div className="space-y-1">
              <h2 className="text-2xl font-bold tracking-tight">
                Invalid Invitation
              </h2>
              <p className="text-muted-foreground text-sm">{error}</p>
            </div>
          </div>
          <p className="text-muted-foreground text-center text-sm">
            Please contact your administrator for a new invitation.
          </p>
          <Link href="/login">
            <Button variant="outline" className="h-11 w-full">
              Go to Login
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  if (success) {
    return (
      <div className="bg-background flex min-h-screen flex-col items-center justify-center px-6 py-12">
        <div className="w-full max-w-[22rem] space-y-6 text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-green-500/10 ring-1 ring-green-500/20">
            <CheckCircle2 className="h-7 w-7 text-green-500" />
          </div>
          <div className="space-y-1">
            <h2 className="text-2xl font-bold tracking-tight">
              Invitation Accepted!
            </h2>
            <p className="text-muted-foreground text-sm">
              Your role and credentials have been updated.
            </p>
          </div>
          <div className="text-muted-foreground flex flex-col items-center gap-2 text-sm">
            <div className="border-primary h-5 w-5 animate-spin rounded-full border-[3px] border-t-transparent" />
            Redirecting to dashboard…
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-background flex min-h-screen flex-col items-center justify-center px-6 py-12">
      <div className="w-full max-w-[24rem] space-y-8">
        <div className="space-y-1">
          <h2 className="text-2xl font-bold tracking-tight">
            Accept Invitation
          </h2>
          <p className="text-muted-foreground text-sm">
            Create your account to join the team.
          </p>
        </div>

        {inviteData && (
          <div className="border-primary/20 bg-primary/5 flex items-start gap-3 rounded-xl border px-4 py-3">
            <Mail className="text-primary mt-0.5 h-4 w-4 shrink-0" />
            <div className="space-y-0.5 text-sm">
              <p className="text-foreground font-medium">
                Invited as <strong>{getRoleLabel(inviteData.role)}</strong>
              </p>
              {inviteData.facilityName && (
                <p className="text-muted-foreground">
                  Facility: {inviteData.facilityName}
                </p>
              )}
              <p className="text-muted-foreground">{inviteData.email}</p>
            </div>
          </div>
        )}

        {error && (
          <div
            role="alert"
            className="border-destructive/30 bg-destructive/8 text-destructive flex items-center gap-3 rounded-xl border px-4 py-3 text-sm"
          >
            <XCircle className="h-4 w-4 shrink-0" />
            {error}
          </div>
        )}

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-sm font-medium">
                    Full Name
                  </FormLabel>
                  <FormControl>
                    <Input placeholder="John Doe" className="h-11" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-sm font-medium">Email</FormLabel>
                  <FormControl>
                    <Input
                      type="email"
                      placeholder="john@example.com"
                      {...field}
                      disabled
                      className="bg-muted/40 h-11"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="password"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-sm font-medium">
                    Password
                  </FormLabel>
                  <FormControl>
                    <Input
                      type="password"
                      placeholder="••••••••"
                      className="h-11"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="confirmPassword"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-sm font-medium">
                    Confirm Password
                  </FormLabel>
                  <FormControl>
                    <Input
                      type="password"
                      placeholder="••••••••"
                      className="h-11"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <Button
              type="submit"
              className="h-11 w-full font-semibold"
              disabled={isLoading}
            >
              {isLoading ? (
                <span className="flex items-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Creating Account…
                </span>
              ) : (
                "Create Account"
              )}
            </Button>
          </form>
        </Form>

        <p className="text-muted-foreground text-center text-sm">
          Already have an account?{" "}
          <Link
            href="/login"
            className="text-primary font-medium hover:underline"
          >
            Log in
          </Link>
        </p>
      </div>
    </div>
  );
}

export default function AcceptInvitePage() {
  return (
    <Suspense
      fallback={
        <div className="bg-background flex min-h-screen flex-col items-center justify-center px-6 py-12">
          <div className="flex flex-col items-center gap-4">
            <div className="border-primary h-8 w-8 animate-spin rounded-full border-[3px] border-t-transparent" />
            <p className="text-muted-foreground text-sm">Loading…</p>
          </div>
        </div>
      }
    >
      <AcceptInviteContent />
    </Suspense>
  );
}
