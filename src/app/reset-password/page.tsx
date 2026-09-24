import type { Metadata } from "next";
import { Suspense } from "react";

import { ResetPasswordForm } from "@/components/account/reset-password-form";
import { AuthScene, AuthLoading } from "@/components/account/auth-scene";
import { pageMetadata } from "@/lib/seo";

export const metadata: Metadata = {
  ...pageMetadata({
    title: "Reset password",
    description: "Choose a new password for your OPEN//77 platform account.",
    path: "/reset-password",
  }),
  // An application surface reached from an e-mail link — never indexed.
  robots: { index: false, follow: false },
  referrer: "no-referrer",
};

export default function ResetPasswordPage() {
  return <AuthScene kind="reset"><Suspense fallback={<AuthLoading />}><ResetPasswordForm /></Suspense></AuthScene>;
}
