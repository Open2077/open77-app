import { HubShell } from "@/components/community/hub-shell";
import { InvitationInbox } from "@/components/community/invitation-inbox";

export const metadata = { title: "Project invitations", robots: { index: false, follow: false } };

export default function InvitationsPage() {
  return <HubShell><header className="hub-directory-head"><p className="hub-kicker">BUILD TOGETHER</p><h1>Project invitations</h1>
    <p>Choose which projects you help maintain. Invitations expire after seven days.</p></header><InvitationInbox /></HubShell>;
}
