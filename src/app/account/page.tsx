import type { Metadata } from "next";

import { AccountGate } from "@/components/account/account-gate";
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
  return <AccountGate />;
}
