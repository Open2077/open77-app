import { HubShell } from "@/components/community/hub-shell";
import { WardenConnections } from "@/components/community/warden-connections";

export const metadata = { title: "Approve Warden", robots: { index: false, follow: false } };
export default function ApproveWardenPage() {
  return <HubShell><header className="hub-directory-head"><p className="hub-kicker">CREATOR CONNECTIONS</p><h1>Connect your Warden</h1></header><WardenConnections approve /></HubShell>;
}
