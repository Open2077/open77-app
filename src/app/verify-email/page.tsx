import type { Metadata } from "next";
import { Suspense } from "react";

import { EmailVerifier } from "@/components/account/email-verifier";
import { AuthScene, AuthLoading } from "@/components/account/auth-scene";
import { pageMetadata } from "@/lib/seo";

export const metadata: Metadata = {
  ...pageMetadata({
    title: "Verify e-mail",
    description: "Confirm the e-mail address on your OPEN//77 platform account.",
    path: "/verify-email",
  }),
  // An application surface reached from an e-mail link — never indexed.
  robots: { index: false, follow: false },
  referrer: "no-referrer",
};

export default function VerifyEmailPage() {
  return <AuthScene kind="verify"><Suspense fallback={<AuthLoading>Verifying your e-mail…</AuthLoading>}><EmailVerifier /></Suspense></AuthScene>;
}
