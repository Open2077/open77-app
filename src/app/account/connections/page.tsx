import { HubShell } from "@/components/community/hub-shell";
import { WardenConnections } from "@/components/community/warden-connections";

export const metadata = { title: "Warden connections", robots: { index: false, follow: false } };
export default function ConnectionsPage() {
  return <HubShell><header className="hub-directory-head"><p className="hub-kicker">CREATOR CONNECTIONS</p><h1>Connected Wardens</h1></header><WardenConnections /></HubShell>;
}
