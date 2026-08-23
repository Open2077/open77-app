import type { Metadata } from "next";

import { ForgotPasswordForm } from "@/components/account/forgot-password-form";
import { Eyebrow } from "@/components/brand";
import { SiteFooter } from "@/components/site-footer";
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
  return (
    <>
      <main className="ac-main" id="main">
        <div className="ac-inner">
          <header className="ac-head">
            <Eyebrow>PLATFORM ACCOUNT</Eyebrow>
            <h1 className="ac-title">Forgot your password?</h1>
            <p className="ac-lead">
              It happens. We&apos;ll e-mail you a single-use link to choose a new one.
            </p>
          </header>
          <ForgotPasswordForm />
        </div>
      </main>
      <SiteFooter fineprint="Accounts run against the OPEN//77 master server." />
    </>
  );
}
