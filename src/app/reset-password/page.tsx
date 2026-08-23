import type { Metadata } from "next";
import { Suspense } from "react";

import { ResetPasswordForm } from "@/components/account/reset-password-form";
import { Eyebrow } from "@/components/brand";
import { SiteFooter } from "@/components/site-footer";
import { pageMetadata } from "@/lib/seo";

export const metadata: Metadata = {
  ...pageMetadata({
    title: "Reset password",
    description: "Choose a new password for your OPEN//77 platform account.",
    path: "/reset-password",
  }),
  // An application surface reached from an e-mail link — never indexed.
  robots: { index: false, follow: false },
};

export default function ResetPasswordPage() {
  return (
    <>
      <main className="ac-main" id="main">
        <div className="ac-inner">
          <header className="ac-head">
            <Eyebrow>PLATFORM ACCOUNT</Eyebrow>
            <h1 className="ac-title">Set a new password.</h1>
            <p className="ac-lead">
              You followed a reset link from your inbox — choose the new password for your account
              below.
            </p>
          </header>
          {/* The reset token and address ride in the query string, so the form
              hangs below Suspense to keep the page shell prerendered. */}
          <Suspense fallback={<p className="ac-loading">Loading…</p>}>
            <ResetPasswordForm />
          </Suspense>
        </div>
      </main>
      <SiteFooter fineprint="Accounts run against the OPEN//77 master server." />
    </>
  );
}
