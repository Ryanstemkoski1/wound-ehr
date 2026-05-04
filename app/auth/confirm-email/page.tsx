import Image from "next/image";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Mail } from "lucide-react";

export default function ConfirmEmailPage() {
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
            <Mail className="text-primary h-7 w-7" />
          </div>
          <div className="space-y-1">
            <h2 className="text-2xl font-bold tracking-tight">
              Check your email
            </h2>
            <p className="text-muted-foreground text-sm">
              We&apos;ve sent you a confirmation link.
            </p>
          </div>
        </div>

        <div className="border-border/60 bg-muted/40 text-muted-foreground rounded-xl border px-4 py-4 text-sm">
          Please click the link in the email to verify your account and complete
          the signup process.
        </div>

        <div className="space-y-3">
          <p className="text-muted-foreground text-xs font-semibold tracking-wide uppercase">
            Next steps
          </p>
          {[
            "Check your email inbox",
            "Click the confirmation link",
            "Return here and sign in",
          ].map((step, i) => (
            <div key={i} className="flex items-center gap-3">
              <div className="bg-primary/10 text-primary flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[0.6rem] font-bold">
                {i + 1}
              </div>
              <span className="text-muted-foreground text-sm">{step}</span>
            </div>
          ))}
        </div>

        <div className="rounded-xl border border-amber-200/70 bg-amber-50/70 px-4 py-3 text-sm text-amber-800 dark:border-amber-800/40 dark:bg-amber-950/30 dark:text-amber-300">
          <strong>Didn&apos;t receive it?</strong> Check your spam folder or{" "}
          <Link
            href="/auth/resend"
            className="font-medium underline underline-offset-2 hover:no-underline"
          >
            resend confirmation
          </Link>
          .
        </div>

        <div className="space-y-3">
          <Button className="h-11 w-full font-semibold" asChild>
            <Link href="/login">Go to Login</Link>
          </Button>
          <p className="text-muted-foreground text-center text-sm">
            Already confirmed?{" "}
            <Link
              href="/login"
              className="text-primary font-medium hover:underline"
            >
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
