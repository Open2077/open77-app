import { HubShell } from "@/components/community/hub-shell";
import { CreatorEditor } from "@/components/community/creator-workspace";
export const metadata = { title: "Edit creation", robots: { index: false, follow: false } };
export default async function EditCreationPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <HubShell><header className="hub-directory-head"><p className="hub-kicker">YOUR CREATOR WORKSPACE</p><h1>Make it ready to share.</h1><p>Your changes stay private until they’re reviewed.</p></header><CreatorEditor id={id} /></HubShell>;
}
