import type { Metadata } from "next";

import { ForgotPasswordForm } from "@/components/account/forgot-password-form";
import { AuthScene } from "@/components/account/auth-scene";
import { pageMetadata } from "@/lib/seo";

export const metadata: Metadata = {
  ...pageMetadata({
    title: "Forgot password",
    description: "Request a password-reset link for your OPEN//77 platform account.",
    path: "/forgot-password",
  }),
  // An application surface, not content: never indexed, even in production.
  robots: { index: false, follow: false },
};

export default function ForgotPasswordPage() {
  return <AuthScene kind="forgot"><ForgotPasswordForm /></AuthScene>;
}
