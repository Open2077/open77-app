import Link from "next/link";
import { HubPageHead, HubShell } from "@/components/community/hub-shell";
import { CreatorEditor } from "@/components/community/creator-workspace";
export const metadata = { title: "Share a creation", robots: { index: false, follow: false } };
export default function NewCreationPage() {
  return <HubShell><HubPageHead kicker="CREATOR WORKSPACE" title="Share a creation" actions={<Link className="btn btn-ghost btn-small" href="/account/creations">All creations</Link>}><p>Create a private draft in five steps, then submit it for review.</p></HubPageHead><CreatorEditor /></HubShell>;
}
