import { HubShell } from "@/components/community/hub-shell";
import { SavedProjects } from "@/components/community/saved-projects";
export const metadata = { title: "Release subscriptions", robots: { index: false, follow: false } };
export default function SubscriptionsPage() {
  return <HubShell><header className="hub-directory-head"><p className="hub-kicker">FOLLOWING RELEASES</p><h1>Release subscriptions</h1><p>Manage the creations you follow for release updates in your Hub inbox.</p></header><SavedProjects kind="subscription" /></HubShell>;
}
