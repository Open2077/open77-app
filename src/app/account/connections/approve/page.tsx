import { AuthScene } from "@/components/account/auth-scene";
import { WardenConnections } from "@/components/community/warden-connections";

export const metadata = { title: "Approve Warden", robots: { index: false, follow: false } };
export default function ApproveWardenPage() {
  return <AuthScene kind="warden"><WardenConnections approve /></AuthScene>;
}
