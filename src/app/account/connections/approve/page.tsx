import { HubPageHead, HubShell } from "@/components/community/hub-shell";
import { WardenConnections } from "@/components/community/warden-connections";

export const metadata = { title: "Approve Warden", robots: { index: false, follow: false } };
export default function ApproveWardenPage() {
  return <HubShell><HubPageHead kicker="CREATOR CONNECTIONS" title="Connect your Warden" /><WardenConnections approve /></HubShell>;
}
