"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { resendConfirmation } from "@/app/actions/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Mail } from "lucide-react";

export default function ResendConfirmationPage() {
  const [error, setError] = useState<string>("");
  const [success, setSuccess] = useState<string>("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(formData: FormData) {
    setLoading(true);
    setError("");
    setSuccess("");

    const result = await resendConfirmation(formData);

    if (result?.error) {
      setError(result.error);
    } else if (result?.success) {
      setSuccess(result.success);
    }

    setLoading(false);
  }

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
            Resend confirmation
          </CardTitle>
          <CardDescription className="text-center">
            Enter your email to receive a new confirmation link
          </CardDescription>
        </CardHeader>
        <form action={handleSubmit}>
          <CardContent className="space-y-4">
            {error && (
              <div className="rounded-md bg-red-50 p-3 text-sm text-red-800 dark:bg-red-950 dark:text-red-200">
                {error}
              </div>
            )}
            {success && (
              <div className="rounded-md bg-teal-50 p-3 text-sm text-teal-800 dark:bg-teal-950 dark:text-teal-200">
                {success}
              </div>
            )}
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
          </CardContent>
          <CardFooter className="flex flex-col space-y-4">
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? "Sending..." : "Send confirmation email"}
            </Button>
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
        </form>
      </Card>
    </div>
  );
}
