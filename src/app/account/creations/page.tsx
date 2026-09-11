import Link from "next/link";
import { HubShell } from "@/components/community/hub-shell";
import { CreatorDashboard } from "@/components/community/creator-workspace";
export const metadata = { title: "My creations", robots: { index: false, follow: false } };
export default function CreationsPage() {
  return <HubShell><header className="hub-directory-head"><p className="hub-kicker">YOUR CREATOR WORKSPACE</p><h1>What will you build next?</h1><p>Manage your drafts, releases and community creations.</p><Link className="btn btn-primary" href="/account/creations/new">New creation ↗</Link></header><CreatorDashboard /></HubShell>;
}
