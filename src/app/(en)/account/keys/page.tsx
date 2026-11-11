import type { Metadata } from "next";
import { Suspense } from "react";

import { AccountShell } from "@/components/account/account-shell";
import { KeysGate } from "@/components/account/keys-gate";
import { Pending } from "@/components/account/kit";
import { pageMetadata } from "@/lib/seo";

export const metadata: Metadata = {
  ...pageMetadata({
    title: "Server owner workspace",
    description:
      "Manage server licenses, inspect attached servers and submit upcoming community launches for staff review.",
    path: "/account/keys",
  }),
  // An application surface, not content: never indexed, even in production.
  robots: { index: false, follow: false },
};

export default function KeysPage() {
  return (
    <AccountShell
      eyebrow="Server owner workspace"
      title={["Your servers.", "Your community."]}
      lead="Manage your licenses, see your last attached servers and prepare your community's launch. Up to 5 active licenses and 5 creations per UTC day."
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
