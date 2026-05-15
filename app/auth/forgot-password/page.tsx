"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { forgotPassword } from "@/app/actions/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { KeyRound, ArrowLeft, AlertCircle, CheckCircle2 } from "lucide-react";

export default function ForgotPasswordPage() {
  const [error, setError] = useState<string>("");
  const [success, setSuccess] = useState<string>("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(formData: FormData) {
    setLoading(true);
    setError("");
    setSuccess("");

    try {
      const result = await forgotPassword(formData);

      if (result?.error) {
        setError(result.error);
      } else if (result?.success) {
        setSuccess(result.success);
      }
    } catch {
      setError("An unexpected error occurred. Please try again.");
    } finally {
      setLoading(false);
    }
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
        {/* Icon + heading */}
        <div className="space-y-3 text-center">
          <div className="bg-primary/10 ring-primary/20 mx-auto flex h-14 w-14 items-center justify-center rounded-2xl ring-1">
            <KeyRound className="text-primary h-7 w-7" />
          </div>
          <div className="space-y-1">
            <h2 className="text-2xl font-bold tracking-tight">
              Forgot password?
            </h2>
            <p className="text-muted-foreground text-sm">
              Enter your email and we&apos;ll send a reset link.
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
        {success && (
          <div
            role="status"
            className="flex items-center gap-3 rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-800 dark:border-green-800 dark:bg-green-950/40 dark:text-green-300"
          >
            <CheckCircle2 className="h-4 w-4 shrink-0 text-green-500" />
            {success}
          </div>
        )}

        {!success && (
          <form action={handleSubmit} className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="email" className="text-sm font-medium">
                Email Address
              </Label>
              <Input
                id="email"
                name="email"
                type="email"
                placeholder="you@example.com"
                required
                autoComplete="email"
                autoFocus
                className="h-11"
              />
            </div>
            <Button
              type="submit"
              className="h-11 w-full font-semibold"
              disabled={loading}
            >
              {loading ? (
                <span className="flex items-center gap-2">
                  <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                  Sending…
                </span>
              ) : (
                "Send Reset Link"
              )}
            </Button>
          </form>
        )}

        <Link
          href="/login"
          className="text-muted-foreground hover:text-foreground flex items-center justify-center gap-1.5 text-sm transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to login
        </Link>
      </div>
    </div>
  );
}
