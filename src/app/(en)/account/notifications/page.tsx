import { AccountShell } from "@/components/account/account-shell";
import { Button } from "@/components/ui/button";
import { NotificationInbox } from "@/components/community/notification-inbox";

export const metadata = { title: "Notifications", robots: { index: false, follow: false } };

export default function NotificationsPage() {
  return (
    <AccountShell
      eyebrow="Inbox"
      title={["Your", "notifications"]}
      lead="Review decisions, replies and release updates."
      guestLead="Sign in to read review decisions, replies and release updates."
      actions={
        <>
          <Button lines="none" border color="neutral" size="sm" href="/account/invitations">
            Invitations
          </Button>
          <Button lines="none" border color="neutral" size="sm" href="/account/subscriptions">
            Subscriptions
          </Button>
        </>
      }
    >
      <NotificationInbox />
    </AccountShell>
  );
}
