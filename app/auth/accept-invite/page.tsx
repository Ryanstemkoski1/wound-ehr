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
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
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

        // Set invite data
        setInviteData({
          email: invite.email,
          role: invite.role,
          facilityName: invite.facility?.name,
        });

        // Pre-fill email
        form.setValue("email", invite.email);

        setIsValidating(false);
      } catch (err) {
        console.error("Error validating invite:", err);
        setError("Failed to validate invite");
        setIsValidating(false);
      }
    }

    validateInvite();
  }, [inviteToken, form]);

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

      // Success! The signup action will handle redirect
      // But we still show success state briefly
      setSuccess(true);
    } catch (err) {
      console.error("Signup error:", err);
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
      <div className="flex min-h-screen items-center justify-center bg-zinc-50 px-4 dark:bg-zinc-950">
        <Card className="w-full max-w-md">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-teal-600" />
            <p className="mt-4 text-sm text-zinc-600 dark:text-zinc-400">
              Validating invitation...
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error && !inviteData) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-zinc-50 px-4 dark:bg-zinc-950">
        <Card className="w-full max-w-md">
          <CardHeader>
            <div className="flex items-center gap-2">
              <XCircle className="h-6 w-6 text-red-600" />
              <CardTitle>Invalid Invitation</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="rounded-lg border border-red-200 bg-red-50 p-4 dark:border-red-900 dark:bg-red-950">
              <p className="text-sm text-red-800 dark:text-red-200">{error}</p>
            </div>
            <div className="text-center">
              <p className="mb-4 text-sm text-zinc-600 dark:text-zinc-400">
                Please contact your administrator for a new invitation.
              </p>
              <Link href="/login">
                <Button variant="outline">Go to Login</Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (success) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-zinc-50 px-4 dark:bg-zinc-950">
        <Card className="w-full max-w-md">
          <CardHeader>
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-6 w-6 text-green-600" />
              <CardTitle>Account Created!</CardTitle>
            </div>
            <CardDescription>
              Your account has been successfully created
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="rounded-lg bg-green-50 p-4 dark:bg-green-950/20">
              <p className="text-sm text-green-800 dark:text-green-200">
                Please check your email to verify your account, then you can log in.
              </p>
            </div>
            <div className="text-center">
              <p className="text-sm text-zinc-600 dark:text-zinc-400">
                Redirecting to dashboard...
              </p>
              <Loader2 className="mx-auto mt-2 h-5 w-5 animate-spin text-teal-600" />
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-50 px-4 py-12 dark:bg-zinc-950">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Accept Invitation</CardTitle>
          <CardDescription>
            Create your account to join the team
          </CardDescription>
        </CardHeader>
        <CardContent>
          {inviteData && (
            <div className="mb-6 rounded-lg bg-teal-50 p-4 dark:bg-teal-950/20">
              <div className="flex items-start gap-3">
                <Mail className="h-5 w-5 text-teal-600 dark:text-teal-400" />
                <div className="flex-1 space-y-1">
                  <p className="text-sm font-medium text-teal-900 dark:text-teal-100">
                    You've been invited as{" "}
                    <strong>{getRoleLabel(inviteData.role)}</strong>
                  </p>
                  {inviteData.facilityName && (
                    <p className="text-xs text-teal-700 dark:text-teal-300">
                      Facility: {inviteData.facilityName}
                    </p>
                  )}
                  <p className="text-xs text-teal-600 dark:text-teal-400">
                    Email: {inviteData.email}
                  </p>
                </div>
              </div>
            </div>
          )}

          {error && (
            <div className="mb-4 rounded-lg border border-red-200 bg-red-50 p-4 dark:border-red-900 dark:bg-red-950">
              <p className="text-sm text-red-800 dark:text-red-200">{error}</p>
            </div>
          )}

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Full Name</FormLabel>
                    <FormControl>
                      <Input placeholder="John Doe" {...field} />
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
                    <FormLabel>Email</FormLabel>
                    <FormControl>
                      <Input
                        type="email"
                        placeholder="john@example.com"
                        {...field}
                        disabled
                        className="bg-zinc-100 dark:bg-zinc-900"
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
                    <FormLabel>Password</FormLabel>
                    <FormControl>
                      <Input
                        type="password"
                        placeholder="••••••••"
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
                    <FormLabel>Confirm Password</FormLabel>
                    <FormControl>
                      <Input
                        type="password"
                        placeholder="••••••••"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <Button
                type="submit"
                className="w-full"
                disabled={isLoading}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Creating Account...
                  </>
                ) : (
                  "Create Account"
                )}
              </Button>
            </form>
          </Form>

          <div className="mt-4 text-center text-sm">
            <span className="text-zinc-600 dark:text-zinc-400">
              Already have an account?{" "}
            </span>
            <Link
              href="/login"
              className="font-medium text-teal-600 hover:text-teal-700 dark:text-teal-400 dark:hover:text-teal-300"
            >
              Log in
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default function AcceptInvitePage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-zinc-50 px-4 dark:bg-zinc-950">
          <Card className="w-full max-w-md">
            <CardContent className="flex flex-col items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-teal-600" />
              <p className="mt-4 text-sm text-zinc-600 dark:text-zinc-400">
                Loading...
              </p>
            </CardContent>
          </Card>
        </div>
      }
    >
      <AcceptInviteContent />
    </Suspense>
  );
}
