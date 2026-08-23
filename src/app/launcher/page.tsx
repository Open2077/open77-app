import type { Metadata } from "next";
import { Suspense } from "react";

import { LauncherConsent } from "@/components/account/launcher-consent";
import { Eyebrow } from "@/components/brand";
import { SiteFooter } from "@/components/site-footer";
import { pageMetadata } from "@/lib/seo";

export const metadata: Metadata = {
  ...pageMetadata({
    title: "Authorize launcher",
    description:
      "Sign in to connect the OPEN//77 launcher on your device to your platform account.",
    path: "/launcher",
  }),
  // An application surface handing a code to a desktop app — never indexed.
  robots: { index: false, follow: false },
};

export default function LauncherPage() {
  return (
    <>
      <main className="ac-main" id="main">
        <div className="ac-inner">
          <header className="ac-head">
            <Eyebrow>LAUNCHER</Eyebrow>
            <h1 className="ac-title">Authorize your launcher.</h1>
            <p className="ac-lead">
              Connect the OPEN//77 launcher running on this device to your platform account. The
              launcher never sees your password.
            </p>
          </header>
          {/* The launcher's redirect_uri / code_challenge / state ride in the
              query string, so the consent flow hangs below Suspense to keep the
              page shell prerendered. */}
          <Suspense fallback={<p className="ac-loading">Loading…</p>}>
            <LauncherConsent />
          </Suspense>
        </div>
      </main>
      <SiteFooter fineprint="Accounts run against the OPEN//77 master server." />
    </>
  );
}
