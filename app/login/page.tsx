"use client";

import { useState, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { login } from "@/app/actions/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CheckCircle2, AlertCircle, Activity, Shield, Mic } from "lucide-react";

function LoginForm() {
  const searchParams = useSearchParams();
  const router = useRouter();
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
      } else if (result && "redirectTo" in result && result.redirectTo) {
        router.push(result.redirectTo);
        return;
      }
    } catch {
      setError("An unexpected error occurred. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen">
      {/* ── Left panel — brand + features (desktop only) ── */}
      <div
        className="relative hidden flex-col justify-between overflow-hidden p-12 lg:flex lg:w-[46%]"
        style={{
          background:
            "linear-gradient(150deg, oklch(0.22 0.055 168) 0%, oklch(0.17 0.052 176) 55%, oklch(0.13 0.04 186) 100%)",
        }}
      >
        {/* Decorative circles */}
        <div
          className="pointer-events-none absolute -top-24 -right-24 h-80 w-80 rounded-full opacity-20"
          style={{
            background:
              "radial-gradient(circle, oklch(0.72 0.14 174) 0%, transparent 70%)",
          }}
          aria-hidden="true"
        />
        <div
          className="pointer-events-none absolute -bottom-32 -left-16 h-72 w-72 rounded-full opacity-15"
          style={{
            background:
              "radial-gradient(circle, oklch(0.65 0.14 285) 0%, transparent 70%)",
          }}
          aria-hidden="true"
        />

        {/* Logo */}
        <div className="relative z-10">
          <Image
            src="/logo.svg"
            alt="WoundNote"
            width={160}
            height={48}
            priority
          />
        </div>

        {/* Hero copy */}
        <div className="relative z-10 space-y-6">
          <div className="space-y-3">
            <p className="text-sm font-semibold tracking-widest text-[oklch(0.72_0.14_174)] uppercase">
              Clinical Documentation Platform
            </p>
            <h1 className="text-4xl leading-tight font-bold tracking-tight text-white">
              Wound care documentation, simplified.
            </h1>
            <p className="text-lg leading-relaxed text-white/60">
              Spend less time charting, more time caring. AI-assisted notes,
              e-signatures, and real-time clinical workflows — all in one place.
            </p>
          </div>

          {/* Feature list */}
          <ul className="space-y-3.5">
            {[
              {
                icon: Mic,
                text: "AI voice transcription for hands-free charting",
              },
              { icon: Shield, text: "HIPAA-compliant with full audit trails" },
              { icon: Activity, text: "Real-time wound healing analytics" },
            ].map(({ icon: Icon, text }) => (
              <li key={text} className="flex items-center gap-3">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white/10">
                  <Icon className="h-4 w-4 text-[oklch(0.72_0.14_174)]" />
                </div>
                <span className="text-sm text-white/75">{text}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* Footer note */}
        <div className="relative z-10">
          <p className="text-xs text-white/30">
            © {new Date().getFullYear()} The Wound Well Co. — Invite-only
            platform.
          </p>
        </div>
      </div>

      {/* ── Right panel — form ── */}
      <div className="bg-background flex flex-1 flex-col items-center justify-center px-6 py-12">
        {/* Mobile logo */}
        <div className="mb-10 lg:hidden">
          <Image
            src="/logo.svg"
            alt="WoundNote"
            width={160}
            height={48}
            priority
          />
        </div>

        <div className="w-full max-w-[22rem] space-y-8">
          {/* Heading */}
          <div className="space-y-1.5">
            <h2 className="text-2xl font-bold tracking-tight">Welcome back</h2>
            <p className="text-muted-foreground text-sm">
              Sign in to your WoundNote account
            </p>
          </div>

          {/* Alerts */}
          {successMessage === "password_updated" && (
            <div
              role="status"
              className="flex items-center gap-3 rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-800 dark:border-green-800 dark:bg-green-950/40 dark:text-green-300"
            >
              <CheckCircle2 className="h-4 w-4 shrink-0 text-green-500" />
              Password updated — you can now sign in.
            </div>
          )}
          {error && (
            <div
              role="alert"
              className="border-destructive/30 bg-destructive/8 text-destructive dark:bg-destructive/15 flex items-center gap-3 rounded-xl border px-4 py-3 text-sm"
            >
              <AlertCircle className="h-4 w-4 shrink-0" />
              {error}
            </div>
          )}

          {/* Form */}
          <form action={handleSubmit} className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="email" className="text-sm font-medium">
                Email
              </Label>
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
                <Label htmlFor="password" className="text-sm font-medium">
                  Password
                </Label>
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
              className="h-11 w-full text-base font-semibold"
              disabled={loading}
            >
              {loading ? (
                <span className="flex items-center gap-2">
                  <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                  Signing in…
                </span>
              ) : (
                "Sign in"
              )}
            </Button>
          </form>

          {/* Footer */}
          <p className="text-muted-foreground/70 text-center text-xs">
            Access is invite-only. Contact your administrator for an account.
          </p>
        </div>
      </div>
    </div>
  );
}

function LoginFallback() {
  return (
    <div className="bg-background flex min-h-screen items-center justify-center">
      <div className="w-full max-w-[22rem] space-y-4 px-6">
        <div className="flex justify-center">
          <Image
            src="/logo.svg"
            alt="WoundNote"
            width={160}
            height={48}
            priority
          />
        </div>
        <p className="text-muted-foreground text-center text-sm">Loading…</p>
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
