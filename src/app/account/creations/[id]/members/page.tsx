import type { Metadata } from "next";

import { AccountShell } from "@/components/account/account-shell";
import { ProjectMembers } from "@/components/community/project-members";
import { Button } from "@/components/ui/button";
import { arrowLeft01 } from "@/components/ui/icons";

export const metadata: Metadata = { title: "Project members", robots: { index: false, follow: false } };

export default async function MembersPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return (
    <AccountShell
      eyebrow="Project team"
      title={["Project", "members"]}
      lead="Maintainers can edit drafts, upload releases and submit for review. Only the owner invites and removes members."
      guestLead="Sign in with a project member's account to see who works on this creation."
      actions={<Button lines="none" color="neutral" border icon={arrowLeft01} iconPosition="left" href={`/account/creations/${id}/edit`}>Back to editor</Button>}
    >
      <ProjectMembers id={id} />
    </AccountShell>
  );
}
