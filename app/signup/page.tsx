"use client";

import { useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { LockKeyhole } from "lucide-react";

// SIGNUP DISABLED - Invite-only registration
// To re-enable public signup, uncomment the SignupFormComponent below
// and comment out the DisabledSignupComponent

function SignupContent() {
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
    <div className="bg-background flex min-h-screen flex-col items-center justify-center px-6 py-12">
      <div className="mb-10">
        <Image
          src="/logo.svg"
          alt="WoundNote"
          width={160}
          height={48}
          priority
        />
      </div>

      <div className="w-full max-w-[22rem] space-y-8 text-center">
        <div className="space-y-3">
          <div className="bg-primary/10 ring-primary/20 mx-auto flex h-14 w-14 items-center justify-center rounded-2xl ring-1">
            <LockKeyhole className="text-primary h-7 w-7" />
          </div>
          <div className="space-y-1">
            <h2 className="text-2xl font-bold tracking-tight">
              Invite Required
            </h2>
            <p className="text-muted-foreground text-sm">
              Public registration is disabled. This system uses invite-only
              access.
            </p>
          </div>
        </div>

        <div className="border-border/60 bg-muted/40 text-muted-foreground rounded-xl border px-4 py-4 text-left text-sm">
          <p className="text-foreground mb-1 font-medium">Need access?</p>
          <p>
            If you&apos;ve been invited, check your email for an invitation
            link. Otherwise, contact your organization administrator.
          </p>
        </div>

        <div className="space-y-3">
          <Button asChild className="h-11 w-full font-semibold">
            <Link href="/login">Go to Login</Link>
          </Button>
          <p className="text-muted-foreground text-xs">
            Already have an account? Sign in to continue.
          </p>
        </div>
      </div>
    </div>
  );
}

export default function SignupPage() {
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
      <SignupContent />
    </Suspense>
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
    <div className="flex min-h-screen items-center justify-center bg-muted/30 px-4 dark:bg-background">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1">
          <div className="mb-4 flex justify-center">
            <Image src="/logo.svg" alt="WoundNote" width={200} height={60} />
          </div>
          <CardTitle className="text-center text-2xl">
            {inviteToken ? "Accept Invitation" : "Create an account"}
          </CardTitle>
          <CardDescription className="text-center">
            {inviteToken
              ? "You've been invited to join an organization"
              : "Get started with WoundNote"}
          </CardDescription>
        </CardHeader>
        <form action={handleSubmit}>
          <CardContent className="space-y-4">
            {inviteToken && (
              <div className="rounded-md bg-primary/5 p-3 text-sm text-primary/80 border border-primary/20">
                You're signing up with an invitation
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
            <p className="text-center text-sm text-muted-foreground">
              Already have an account?{" "}
              <Link
                href="/login"
                className="font-medium text-primary hover:text-primary/80"
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
