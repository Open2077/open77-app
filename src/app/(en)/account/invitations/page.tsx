import { AccountShell } from "@/components/account/account-shell";
import { Button } from "@/components/ui/button";
import { InvitationInbox } from "@/components/community/invitation-inbox";

export const metadata = { title: "Project invitations", robots: { index: false, follow: false } };

export default function InvitationsPage() {
  return (
    <AccountShell
      eyebrow="Inbox"
      title={["Project", "invitations"]}
      lead="Choose which projects you help maintain. Invitations expire after seven days."
      guestLead="Sign in to accept or decline the projects you were invited to maintain."
      actions={
        <Button lines="none" border color="neutral" size="sm" href="/account/notifications">
          Notifications
        </Button>
      }
    >
      <InvitationInbox />
    </AccountShell>
  );
}
