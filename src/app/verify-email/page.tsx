import type { Metadata } from "next";
import { Suspense } from "react";

import { EmailVerifier } from "@/components/account/email-verifier";
import { Eyebrow } from "@/components/brand";
import { SiteFooter } from "@/components/site-footer";
import { pageMetadata } from "@/lib/seo";

export const metadata: Metadata = {
  ...pageMetadata({
    title: "Verify e-mail",
    description: "Confirm the e-mail address on your OPEN//77 platform account.",
    path: "/verify-email",
  }),
  // An application surface reached from an e-mail link — never indexed.
  robots: { index: false, follow: false },
};

export default function VerifyEmailPage() {
  return (
    <>
      <main className="ac-main" id="main">
        <div className="ac-inner">
          <header className="ac-head">
            <Eyebrow>PLATFORM ACCOUNT</Eyebrow>
            <h1 className="ac-title">Verify your e-mail.</h1>
            <p className="ac-lead">
              One click and your address is confirmed — verification is required before you can
              create server license keys.
            </p>
          </header>
          {/* The verification token and address ride in the query string, so the
              verifier hangs below Suspense to keep the page shell prerendered. */}
          <Suspense fallback={<p className="ac-loading">Loading…</p>}>
            <EmailVerifier />
          </Suspense>
        </div>
      </main>
      <SiteFooter fineprint="Accounts run against the OPEN//77 master server." />
    </>
  );
}
