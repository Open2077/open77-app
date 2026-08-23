import type { Metadata } from "next";

import { AccountGate } from "@/components/account/account-gate";
import { Eyebrow } from "@/components/brand";
import { SiteFooter } from "@/components/site-footer";
import { pageMetadata } from "@/lib/seo";

export const metadata: Metadata = {
  ...pageMetadata({
    title: "Account",
    description:
      "Your OPEN//77 platform account: profile, e-mail verification, linked game identities and server license keys.",
    path: "/account",
  }),
  // An application surface, not content: never indexed, even in production.
  robots: { index: false, follow: false },
};

export default function AccountPage() {
  return (
    <>
      <main className="ac-main" id="main">
        <div className="ac-inner">
          <header className="ac-head">
            <Eyebrow>PLATFORM ACCOUNT</Eyebrow>
            <h1 className="ac-title">Your account.</h1>
            <p className="ac-lead">
              One account for the whole platform — the server browser, your game identities, and
              the license keys your servers run on.
            </p>
          </header>
          <AccountGate />
        </div>
      </main>
      <SiteFooter fineprint="Accounts run against the OPEN//77 master server." />
    </>
  );
}
