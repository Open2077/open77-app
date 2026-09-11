import { HubShell } from "@/components/community/hub-shell";
import { NotificationInbox } from "@/components/community/notification-inbox";

export const metadata = { title: "Notifications", robots: { index: false, follow: false } };

export default function NotificationsPage() {
  return <HubShell><header className="hub-directory-head"><p className="hub-kicker">YOUR HUB INBOX</p><h1>Notifications</h1>
    <p>Review decisions and updates from the community.</p></header><NotificationInbox /></HubShell>;
}
