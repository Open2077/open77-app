import Link from "next/link";
import { HubPageHead, HubShell } from "@/components/community/hub-shell";
import { SavedProjects } from "@/components/community/saved-projects";
export const metadata = { title: "Saved creations", robots: { index: false, follow: false } };
export default function SavedPage() {
  return <HubShell><HubPageHead kicker="YOUR COLLECTION" title="Saved creations" actions={<Link className="btn btn-ghost btn-small" href="/account/subscriptions">Release subscriptions</Link>}><p>Private to you. Keep resources and showcases here for later.</p></HubPageHead><SavedProjects kind="save" /></HubShell>;
}
