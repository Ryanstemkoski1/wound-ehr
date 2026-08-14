// Closed practice — public signup is disabled; accounts come from
// invites. Emailed invite links that still point at /signup?invite=…
// are forwarded to the invite acceptance flow; everyone else lands
// on the login screen.

import { redirect } from "next/navigation";

export default async function SignupPage({
  searchParams,
}: {
  searchParams: Promise<{ invite?: string }>;
}) {
  const { invite } = await searchParams;

  if (invite) {
    redirect(`/auth/accept-invite?token=${encodeURIComponent(invite)}`);
  }

  redirect("/login");
}
