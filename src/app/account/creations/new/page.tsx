import type { Metadata } from "next";

import { AccountShell } from "@/components/account/account-shell";
import { CreatorEditor } from "@/components/community/creator-workspace";
import { Button } from "@/components/ui/button";
import { arrowLeft01 } from "@/components/ui/icons";

export const metadata: Metadata = { title: "Share a creation", robots: { index: false, follow: false } };

export default function NewCreationPage() {
  return (
    <AccountShell
      eyebrow="Creator workspace"
      title={["Share a", "creation"]}
      lead="Create a private draft in five steps, then submit it for review."
      guestLead="Sign in to start a private draft. It stays yours until you submit it for review."
      actions={<Button lines="none" color="neutral" border icon={arrowLeft01} iconPosition="left" href="/account/creations">All creations</Button>}
      width="wide"
    >
      <CreatorEditor />
    </AccountShell>
  );
}
