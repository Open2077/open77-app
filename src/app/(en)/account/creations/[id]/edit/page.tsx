import type { Metadata } from "next";

import { AccountShell } from "@/components/account/account-shell";
import { CreatorEditor } from "@/components/community/creator-workspace";
import { Button } from "@/components/ui/button";
import { arrowLeft01 } from "@/components/ui/icons";

export const metadata: Metadata = { title: "Edit creation", robots: { index: false, follow: false } };

export default async function EditCreationPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return (
    <AccountShell
      eyebrow="Creator workspace"
      title={["Edit", "creation"]}
      lead="Changes stay private until they are reviewed."
      guestLead="Sign in with the account that owns or maintains this creation to keep editing."
      actions={<Button lines="none" color="neutral" border icon={arrowLeft01} iconPosition="left" href="/account/creations">All creations</Button>}
      width="wide"
    >
      <CreatorEditor id={id} />
    </AccountShell>
  );
}
