import Link from "next/link";
import { HubPageHead, HubShell } from "@/components/community/hub-shell";
import { CreatorEditor } from "@/components/community/creator-workspace";
export const metadata = { title: "Edit creation", robots: { index: false, follow: false } };
export default async function EditCreationPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <HubShell workspace><HubPageHead kicker="CREATOR WORKSPACE" title="Edit creation" actions={<Link className="btn btn-ghost btn-small" href="/account/creations">All creations</Link>}><p>Changes stay private until they are reviewed.</p></HubPageHead><CreatorEditor id={id} /></HubShell>;
}
