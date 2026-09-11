import { HubShell } from "@/components/community/hub-shell";
import { ProjectMembers } from "@/components/community/project-members";

export const metadata = { title: "Project members", robots: { index: false, follow: false } };
export default async function MembersPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <HubShell><header className="hub-directory-head"><p className="hub-kicker">YOUR PROJECT TEAM</p><h1>Project members</h1>
    <p>Maintainers can edit drafts, upload releases and submit work for review. Only the owner can invite and remove other members.</p></header><ProjectMembers id={id} /></HubShell>;
}
