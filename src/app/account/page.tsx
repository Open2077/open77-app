import type { Metadata } from "next";

import { AccountGate } from "@/components/account/account-gate";
import { AccountShell } from "@/components/account/account-shell";
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
    <AccountShell
      eyebrow="Platform account"
      title={["Your", "account"]}
      lead="One account for the whole platform: the server browser, your game identities, your Workshop creations, and the license keys your servers run on."
    >
      <AccountGate />
    </AccountShell>
  );
}
