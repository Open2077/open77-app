import type { Metadata } from "next";
import { Suspense } from "react";

import { AccountShell } from "@/components/account/account-shell";
import { KeysGate } from "@/components/account/keys-gate";
import { Pending } from "@/components/account/kit";
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
    <AccountShell
      eyebrow="Keymaster"
      title={["License", "keys"]}
      lead="A license key ties a dedicated server to your account. Keys are shown once at creation, stored as fingerprints, and revocable at any time."
      guestLead="Sign in to create, inspect and revoke the license keys your dedicated servers register with."
    >
      {/* useSearchParams reads the ?source= flag, so the gate hangs below a
          Suspense boundary to keep the page shell prerendered. */}
      <Suspense fallback={<Pending label="Account" />}>
        <KeysGate />
      </Suspense>
    </AccountShell>
  );
}
