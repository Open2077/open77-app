import Link from "next/link";
import { HubShell } from "@/components/community/hub-shell";
import { SavedProjects } from "@/components/community/saved-projects";
export const metadata = { title: "Saved creations", robots: { index: false, follow: false } };
export default function SavedPage() {
  return <HubShell><header className="hub-directory-head"><p className="hub-kicker">YOUR PRIVATE COLLECTION</p><h1>Saved creations</h1><p>Keep resources and showcases here for later.</p><Link href="/account/subscriptions">Manage release subscriptions →</Link></header><SavedProjects kind="save" /></HubShell>;
}
