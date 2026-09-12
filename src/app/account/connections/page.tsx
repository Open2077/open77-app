import Link from "next/link";
import { HubPageHead, HubShell } from "@/components/community/hub-shell";
import { WardenConnections } from "@/components/community/warden-connections";

export const metadata = { title: "Warden connections", robots: { index: false, follow: false } };
export default function ConnectionsPage() {
  return <HubShell><HubPageHead kicker="CREATOR CONNECTIONS" title="Connected Wardens" actions={<Link className="btn btn-ghost btn-small" href="/account/profile">Creator profile</Link>}><p>Server consoles allowed to publish drafts to your creator account.</p></HubPageHead><WardenConnections /></HubShell>;
}
