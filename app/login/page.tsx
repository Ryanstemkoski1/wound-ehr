"use client";

// Field surface — rebuilt login screen.
// Same auth mechanics as before (the login() server action); new
// presentation: a single centered card, WoundNote wordmark, calm
// clinical styling. On success we land on "/" and the role-aware
// root redirect decides where each user goes.

import { Suspense, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { AlertCircle, CheckCircle2 } from "lucide-react";
import { login } from "@/app/actions/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

function Wordmark() {
  return (
    <div className="text-center">
      <p className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
        Wound Care Field Visits
      </p>
      <p className="mt-1 text-3xl font-semibold tracking-tight text-foreground">
        Wound<span className="text-primary">Note</span>
      </p>
    </div>
  );
}

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const successMessage = searchParams.get("message");

  const [error, setError] = useState<string>("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(formData: FormData) {
    setLoading(true);
    setError("");

    try {
      const result = await login(formData);

      if (result?.error) {
        setError(result.error);
      } else if (result?.success) {
        // The role-aware root redirect decides where this user lands.
        router.push("/");
        return;
      }
    } catch {
      setError("An unexpected error occurred. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-dvh flex-col items-center justify-center bg-background px-4 py-12">
      <div className="w-full max-w-sm space-y-8">
        <Wordmark />

        <div className="rounded-lg border border-border bg-card p-6 shadow-sm sm:p-8">
          <div className="space-y-1.5">
            <h1 className="text-xl font-semibold tracking-tight">Sign in</h1>
            <p className="text-sm text-muted-foreground">
              Use your work email and password.
            </p>
          </div>

          {successMessage === "password_updated" && (
            <div
              role="status"
              className="mt-5 flex items-start gap-2.5 rounded-lg border border-emerald-200 bg-emerald-50 px-3.5 py-3 text-sm text-emerald-800 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-300"
            >
              <CheckCircle2
                className="mt-0.5 h-4 w-4 shrink-0"
                aria-hidden="true"
              />
              Password updated — you can now sign in.
            </div>
          )}

          {error && (
            <div
              role="alert"
              className="border-destructive/30 bg-destructive/10 text-destructive mt-5 flex items-start gap-2.5 rounded-lg border px-3.5 py-3 text-sm"
            >
              <AlertCircle
                className="mt-0.5 h-4 w-4 shrink-0"
                aria-hidden="true"
              />
              {error}
            </div>
          )}

          <form action={handleSubmit} className="mt-6 space-y-5">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                name="email"
                type="email"
                placeholder="you@example.com"
                required
                autoComplete="email"
                className="h-11"
              />
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="password">Password</Label>
                <Link
                  href="/auth/forgot-password"
                  className="text-primary hover:text-primary/80 text-xs font-medium transition-colors"
                >
                  Forgot password?
                </Link>
              </div>
              <Input
                id="password"
                name="password"
                type="password"
                required
                autoComplete="current-password"
                className="h-11"
              />
            </div>

            <Button
              type="submit"
              className="h-11 w-full font-semibold"
              disabled={loading}
            >
              {loading ? "Signing in…" : "Sign in"}
            </Button>
          </form>
        </div>

        <p className="text-center text-xs text-muted-foreground">
          Access is invite-only. Contact your administrator for an account.
        </p>
      </div>
    </div>
  );
}

function LoginFallback() {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center bg-background px-4 py-12">
      <div className="w-full max-w-sm space-y-8">
        <Wordmark />
        <p className="text-center text-sm text-muted-foreground">Loading…</p>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<LoginFallback />}>
      <LoginForm />
    </Suspense>
  );
}
