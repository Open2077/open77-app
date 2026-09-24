import { HubPageHead, HubShell } from "@/components/community/hub-shell";
import { NotificationInbox } from "@/components/community/notification-inbox";
import Link from "next/link";

export const metadata = { title: "Notifications", robots: { index: false, follow: false } };

export default function NotificationsPage() {
  return <HubShell><HubPageHead kicker="INBOX" title="Notifications" actions={<><Link className="btn btn-ghost btn-small" href="/account/invitations">Invitations</Link><Link className="btn btn-ghost btn-small" href="/account/subscriptions">Subscriptions</Link></>}><p>Review decisions, replies and release updates.</p></HubPageHead><NotificationInbox /></HubShell>;
}
