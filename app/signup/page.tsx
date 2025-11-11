"use client";

import { useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { AlertCircle } from "lucide-react";

// SIGNUP DISABLED - Invite-only registration
// To re-enable public signup, uncomment the SignupFormComponent below
// and comment out the DisabledSignupComponent

export default function SignupPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const inviteToken = searchParams.get("invite");

  // If there's an invite token, redirect to invite acceptance page
  useEffect(() => {
    if (inviteToken) {
      router.push(`/auth/accept-invite?token=${inviteToken}`);
    }
  }, [inviteToken, router]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-50 px-4 dark:bg-zinc-950">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1">
          <div className="mb-4 flex justify-center">
            <Image src="/logo.svg" alt="Wound EHR" width={200} height={60} />
          </div>
          <CardTitle className="text-center text-2xl">
            Registration Disabled
          </CardTitle>
          <CardDescription className="text-center">
            This system uses invite-only registration
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col items-center space-y-4 py-8 text-center">
            <AlertCircle className="h-16 w-16 text-teal-600 dark:text-teal-400" />
            <div className="space-y-2">
              <h3 className="text-lg font-semibold">Invite Required</h3>
              <p className="text-sm text-zinc-600 dark:text-zinc-400">
                Public registration is disabled for security reasons.
              </p>
              <p className="text-sm text-zinc-600 dark:text-zinc-400">
                If you&apos;ve been invited to join an organization, please
                check your email for an invitation link.
              </p>
            </div>
          </div>

          <div className="space-y-2 rounded-lg border border-zinc-200 bg-zinc-50 p-4 dark:border-zinc-800 dark:bg-zinc-900">
            <p className="text-sm font-medium">Need access?</p>
            <p className="text-sm text-zinc-600 dark:text-zinc-400">
              Contact your organization administrator to request an invitation.
            </p>
          </div>

          <div className="flex flex-col space-y-3 pt-4">
            <Button asChild className="w-full">
              <Link href="/login">Go to Login</Link>
            </Button>
            <p className="text-center text-xs text-zinc-500 dark:text-zinc-500">
              Already have an account? Sign in to continue.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// ========================================
// ORIGINAL SIGNUP FORM (DISABLED)
// To re-enable public signup, uncomment this component
// and replace the DisabledSignupComponent above
// ========================================

/*
import { useState } from "react";
import { signup } from "@/app/actions/auth";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CardFooter } from "@/components/ui/card";

export default function SignupPage() {
  const searchParams = useSearchParams();
  const inviteToken = searchParams.get("invite");
  
  const [error, setError] = useState<string>("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(formData: FormData) {
    setLoading(true);
    setError("");

    if (inviteToken) {
      formData.append("inviteToken", inviteToken);
    }

    const result = await signup(formData);

    if (result?.error) {
      setError(result.error);
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-50 px-4 dark:bg-zinc-950">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1">
          <div className="mb-4 flex justify-center">
            <Image src="/logo.svg" alt="Wound EHR" width={200} height={60} />
          </div>
          <CardTitle className="text-center text-2xl">
            {inviteToken ? "Accept Invitation" : "Create an account"}
          </CardTitle>
          <CardDescription className="text-center">
            {inviteToken
              ? "You've been invited to join an organization"
              : "Get started with Wound EHR"}
          </CardDescription>
        </CardHeader>
        <form action={handleSubmit}>
          <CardContent className="space-y-4">
            {inviteToken && (
              <div className="rounded-md bg-blue-50 p-3 text-sm text-blue-800 dark:bg-blue-950 dark:text-blue-200">
                ✉️ You're signing up with an invitation
              </div>
            )}
            {error && (
              <div className="rounded-md bg-red-50 p-3 text-sm text-red-800 dark:bg-red-950 dark:text-red-200">
                {error}
              </div>
            )}
            <div className="space-y-2">
              <Label htmlFor="name">Full Name</Label>
              <Input
                id="name"
                name="name"
                type="text"
                placeholder="Dr. Jane Smith"
                required
                autoComplete="name"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                name="email"
                type="email"
                placeholder="your@email.com"
                required
                autoComplete="email"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                name="password"
                type="password"
                placeholder="At least 8 characters"
                required
                autoComplete="new-password"
              />
            </div>
          </CardContent>
          <CardFooter className="flex flex-col space-y-4">
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? "Creating account..." : "Create account"}
            </Button>
            <p className="text-center text-sm text-zinc-600 dark:text-zinc-400">
              Already have an account?{" "}
              <Link
                href="/login"
                className="font-medium text-teal-600 hover:text-teal-500 dark:text-teal-400"
              >
                Sign in
              </Link>
            </p>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
}
*/
