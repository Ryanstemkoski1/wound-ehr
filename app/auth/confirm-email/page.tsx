import Image from "next/image";
import Link from "next/link";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Mail } from "lucide-react";

export default function ConfirmEmailPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-50 px-4 dark:bg-zinc-950">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1">
          <div className="mb-4 flex justify-center">
            <Image src="/logo.svg" alt="Wound EHR" width={200} height={60} />
          </div>
          <div className="flex justify-center">
            <div className="rounded-full bg-teal-50 p-3 dark:bg-teal-950">
              <Mail className="h-6 w-6 text-teal-600 dark:text-teal-400" />
            </div>
          </div>
          <CardTitle className="text-center text-2xl">
            Check your email
          </CardTitle>
          <CardDescription className="text-center">
            We&apos;ve sent you a confirmation link
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="rounded-lg border border-zinc-200 bg-zinc-50 p-4 dark:border-zinc-800 dark:bg-zinc-900">
            <p className="text-sm text-zinc-600 dark:text-zinc-400">
              We sent a confirmation link to your email address. Please click
              the link in the email to verify your account and complete the
              signup process.
            </p>
          </div>

          <div className="space-y-2">
            <h4 className="text-sm font-medium">Next steps:</h4>
            <ol className="list-inside list-decimal space-y-1 text-sm text-zinc-600 dark:text-zinc-400">
              <li>Check your email inbox</li>
              <li>Click the confirmation link</li>
              <li>Return here and sign in</li>
            </ol>
          </div>

          <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 dark:border-amber-900 dark:bg-amber-950">
            <p className="text-sm text-amber-800 dark:text-amber-200">
              <strong>Didn&apos;t receive the email?</strong> Check your spam
              folder or{" "}
              <Link
                href="/auth/resend"
                className="font-medium underline hover:no-underline"
              >
                resend confirmation email
              </Link>
              .
            </p>
          </div>
        </CardContent>
        <CardFooter className="flex flex-col space-y-4">
          <Link href="/login" className="w-full">
            <Button className="w-full">Go to Login</Button>
          </Link>
          <p className="text-center text-sm text-zinc-600 dark:text-zinc-400">
            Already confirmed?{" "}
            <Link
              href="/login"
              className="font-medium text-teal-600 hover:text-teal-500 dark:text-teal-400"
            >
              Sign in
            </Link>
          </p>
        </CardFooter>
      </Card>
    </div>
  );
}
