"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { resetPassword } from "@/app/actions/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Lock, AlertCircle, CheckCircle2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

export default function ResetPasswordPage() {
  const router = useRouter();
  const [error, setError] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [validSession, setValidSession] = useState(false);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    // Check if user came from valid reset link
    const checkSession = async () => {
      try {
        const supabase = createClient();
        const {
          data: { user },
        } = await supabase.auth.getUser();

        if (user) {
          setValidSession(true);
        } else {
          setError(
            "Invalid or expired reset link. Please request a new password reset."
          );
        }
      } catch {
        setError("Failed to verify reset link. Please try again.");
      } finally {
        setChecking(false);
      }
    };

    checkSession();
  }, []);

  async function handleSubmit(formData: FormData) {
    setLoading(true);
    setError("");

    try {
      const result = await resetPassword(formData);

      if (result?.error) {
        setError(result.error);
      } else if (result && "redirectTo" in result) {
        router.push(result.redirectTo as string);
        return;
      }
    } catch {
      setError("An unexpected error occurred. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  const PageShell = ({ children }: { children: React.ReactNode }) => (
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
      <div className="w-full max-w-[22rem] space-y-8">{children}</div>
    </div>
  );

  if (checking) {
    return (
      <PageShell>
        <div className="flex flex-col items-center gap-4 py-8">
          <div className="border-primary h-8 w-8 animate-spin rounded-full border-[3px] border-t-transparent" />
          <p className="text-muted-foreground text-sm">Verifying reset link…</p>
        </div>
      </PageShell>
    );
  }

  if (!validSession) {
    return (
      <PageShell>
        <div className="space-y-3 text-center">
          <div className="bg-destructive/10 ring-destructive/20 mx-auto flex h-14 w-14 items-center justify-center rounded-2xl ring-1">
            <AlertCircle className="text-destructive h-7 w-7" />
          </div>
          <div className="space-y-1">
            <h2 className="text-2xl font-bold tracking-tight">
              Invalid Reset Link
            </h2>
            <p className="text-muted-foreground text-sm">{error}</p>
          </div>
        </div>
        <div className="space-y-3">
          <Link href="/auth/forgot-password" className="block">
            <Button className="h-11 w-full font-semibold">
              Request New Reset Link
            </Button>
          </Link>
          <Link
            href="/login"
            className="text-muted-foreground hover:text-foreground flex justify-center text-sm transition-colors"
          >
            Back to login
          </Link>
        </div>
      </PageShell>
    );
  }

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

      <div className="w-full max-w-[22rem] space-y-8">
        <div className="space-y-3 text-center">
          <div className="bg-primary/10 ring-primary/20 mx-auto flex h-14 w-14 items-center justify-center rounded-2xl ring-1">
            <Lock className="text-primary h-7 w-7" />
          </div>
          <div className="space-y-1">
            <h2 className="text-2xl font-bold tracking-tight">
              Reset your password
            </h2>
            <p className="text-muted-foreground text-sm">
              Enter your new password below.
            </p>
          </div>
        </div>

        {error && (
          <div
            role="alert"
            className="border-destructive/30 bg-destructive/8 text-destructive flex items-center gap-3 rounded-xl border px-4 py-3 text-sm"
          >
            <AlertCircle className="h-4 w-4 shrink-0" />
            {error}
          </div>
        )}

        <form action={handleSubmit} className="space-y-5">
          <div className="space-y-2">
            <Label htmlFor="password" className="text-sm font-medium">
              New Password
            </Label>
            <Input
              id="password"
              name="password"
              type="password"
              placeholder="At least 8 characters"
              required
              autoComplete="new-password"
              autoFocus
              minLength={8}
              className="h-11"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="confirmPassword" className="text-sm font-medium">
              Confirm Password
            </Label>
            <Input
              id="confirmPassword"
              name="confirmPassword"
              type="password"
              placeholder="Re-enter your password"
              required
              autoComplete="new-password"
              minLength={8}
              className="h-11"
            />
          </div>
          <div className="bg-muted/60 text-muted-foreground flex items-start gap-2 rounded-lg px-3 py-2.5 text-xs">
            <CheckCircle2 className="text-primary/70 mt-0.5 h-3.5 w-3.5 shrink-0" />
            <span>
              At least 8 characters. Mix of letters and numbers recommended.
            </span>
          </div>
          <Button
            type="submit"
            className="h-11 w-full font-semibold"
            disabled={loading}
          >
            {loading ? (
              <span className="flex items-center gap-2">
                <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                Resetting…
              </span>
            ) : (
              "Reset Password"
            )}
          </Button>
        </form>

        <Link
          href="/login"
          className="text-muted-foreground hover:text-foreground flex justify-center text-sm transition-colors"
        >
          Back to login
        </Link>
      </div>
    </div>
  );
}
