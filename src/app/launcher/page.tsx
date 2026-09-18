import type { Metadata } from "next";
import { Suspense } from "react";

import { LauncherConsent } from "@/components/account/launcher-consent";
import { AuthScene, AuthLoading } from "@/components/account/auth-scene";
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
  referrer: "no-referrer",
};

export default function LauncherPage() {
  return <AuthScene kind="launcher"><Suspense fallback={<AuthLoading />}><LauncherConsent /></Suspense></AuthScene>;
}
