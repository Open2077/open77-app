import { HubShell } from "@/components/community/hub-shell";
import { ProfileEditor } from "@/components/community/profile-editor";
import Link from "next/link";

export const metadata = { title: "Creator profile", robots: { index: false, follow: false } };
export default function ProfilePage() {
  return <HubShell><header className="hub-directory-head"><p className="hub-kicker">YOUR PUBLIC IDENTITY</p><h1>Creator profile</h1><p>Introduce yourself and give people a place to find your creations.</p><Link href="/account/github">Manage GitHub connection →</Link></header><ProfileEditor /></HubShell>;
}
