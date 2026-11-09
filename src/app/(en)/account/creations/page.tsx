import type { Metadata } from "next";

import { AccountShell } from "@/components/account/account-shell";
import { CreatorDashboard } from "@/components/community/creator-workspace";
import { Button } from "@/components/ui/button";
import { add01 } from "@/components/ui/icons";

export const metadata: Metadata = { title: "My creations", robots: { index: false, follow: false } };

export default function CreationsPage() {
  return (
    <AccountShell
      eyebrow="Creator workspace"
      title={["My", "creations"]}
      lead="Drafts, releases, review status and everything you have published."
      guestLead="Sign in to open your creator workspace: drafts, releases, review status and everything you have published."
      actions={<Button href="/account/creations/new" icon={add01}>New creation</Button>}
    >
      <CreatorDashboard />
    </AccountShell>
  );
}
