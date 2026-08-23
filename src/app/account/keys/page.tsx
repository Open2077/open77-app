import type { Metadata } from "next";
import { Suspense } from "react";

import { KeysGate } from "@/components/account/keys-gate";
import { Eyebrow } from "@/components/brand";
import { SiteFooter } from "@/components/site-footer";
import { pageMetadata } from "@/lib/seo";

export const metadata: Metadata = {
  ...pageMetadata({
    title: "Server license keys",
    description:
      "The OPEN//77 keymaster: create, inspect and revoke the license keys that let your dedicated servers join the platform.",
    path: "/account/keys",
  }),
  // An application surface, not content: never indexed, even in production.
  robots: { index: false, follow: false },
};

export default function KeysPage() {
  return (
    <>
      <main className="ac-main" id="main">
        <div className="ac-inner">
          <header className="ac-head">
            <Eyebrow>KEYMASTER</Eyebrow>
            <h1 className="ac-title">Server license keys.</h1>
            <p className="ac-lead">
              A license key ties a dedicated server to your account. Keys are shown once at
              creation, stored as fingerprints, and revocable at any time.
            </p>
          </header>
          {/* useSearchParams reads the ?source= flag, so the gate hangs below a
              Suspense boundary to keep the page shell prerendered. */}
          <Suspense fallback={<p className="ac-loading">Loading…</p>}>
            <KeysGate />
          </Suspense>
        </div>
      </main>
      <SiteFooter fineprint="Accounts run against the OPEN//77 master server." />
    </>
  );
}
