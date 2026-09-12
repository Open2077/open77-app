import Link from "next/link";
import { HubPageHead, HubShell } from "@/components/community/hub-shell";
import { CreatorDashboard } from "@/components/community/creator-workspace";
export const metadata = { title: "My creations", robots: { index: false, follow: false } };
export default function CreationsPage() {
  return <HubShell><HubPageHead kicker="CREATOR WORKSPACE" title="My creations" actions={<Link className="btn btn-primary btn-small" href="/account/creations/new">New creation</Link>}><p>Drafts, releases, review status and everything you have published.</p></HubPageHead><CreatorDashboard /></HubShell>;
}
