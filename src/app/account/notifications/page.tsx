import { HubShell } from "@/components/community/hub-shell";
import { NotificationInbox } from "@/components/community/notification-inbox";
import Link from "next/link";

export const metadata = { title: "Notifications", robots: { index: false, follow: false } };

export default function NotificationsPage() {
  return <HubShell><header className="hub-directory-head"><p className="hub-kicker">YOUR HUB INBOX</p><h1>Notifications</h1>
    <p>Review decisions and updates from the community.</p><div className="hub-actions"><Link href="/account/subscriptions">Manage release subscriptions →</Link><Link href="/account/invitations">Project invitations →</Link></div></header><NotificationInbox /></HubShell>;
}
