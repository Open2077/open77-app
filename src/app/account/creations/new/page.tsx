import { HubShell } from "@/components/community/hub-shell";
import { CreatorEditor } from "@/components/community/creator-workspace";
export const metadata = { title: "Share a creation", robots: { index: false, follow: false } };
export default function NewCreationPage() {
  return <HubShell><header className="hub-directory-head"><p className="hub-kicker">SHARE WHAT YOU BUILD</p><h1>Start something others can build on.</h1><p>Create a private draft, then prepare it for the community.</p></header><CreatorEditor /></HubShell>;
}
