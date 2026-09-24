import Link from "next/link";
import { HubPageHead, HubShell } from "@/components/community/hub-shell";
import { SavedProjects } from "@/components/community/saved-projects";
export const metadata = { title: "Release subscriptions", robots: { index: false, follow: false } };
export default function SubscriptionsPage() {
  return <HubShell><HubPageHead kicker="YOUR COLLECTION" title="Release subscriptions" actions={<Link className="btn btn-ghost btn-small" href="/account/saved">Saved creations</Link>}><p>Creations you follow. New releases land in your inbox.</p></HubPageHead><SavedProjects kind="subscription" /></HubShell>;
}
