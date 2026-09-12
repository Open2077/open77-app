import Link from "next/link";
import { HubPageHead, HubShell } from "@/components/community/hub-shell";
import { ProjectMembers } from "@/components/community/project-members";

export const metadata = { title: "Project members", robots: { index: false, follow: false } };
export default async function MembersPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <HubShell><HubPageHead kicker="PROJECT TEAM" title="Project members" actions={<Link className="btn btn-ghost btn-small" href={`/account/creations/${id}/edit`}>Back to editor</Link>}><p>Maintainers can edit drafts, upload releases and submit for review. Only the owner invites and removes members.</p></HubPageHead><ProjectMembers id={id} /></HubShell>;
}
