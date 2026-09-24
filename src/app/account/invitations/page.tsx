import Link from "next/link";
import { HubPageHead, HubShell } from "@/components/community/hub-shell";
import { InvitationInbox } from "@/components/community/invitation-inbox";

export const metadata = { title: "Project invitations", robots: { index: false, follow: false } };

export default function InvitationsPage() {
  return <HubShell><HubPageHead kicker="INBOX" title="Project invitations" actions={<Link className="btn btn-ghost btn-small" href="/account/notifications">Notifications</Link>}><p>Choose which projects you help maintain. Invitations expire after seven days.</p></HubPageHead><InvitationInbox /></HubShell>;
}
