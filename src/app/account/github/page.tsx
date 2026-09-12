import Link from "next/link";
import { HubPageHead, HubShell } from "@/components/community/hub-shell";
import { GitHubAccountConnection } from "@/components/community/github-connection";

export const metadata = { title: "GitHub connection", robots: { index: false, follow: false } };
export default function GitHubPage() {
  return <HubShell><HubPageHead kicker="CREATOR CONNECTIONS" title="GitHub account" actions={<Link className="btn btn-ghost btn-small" href="/account/profile">Creator profile</Link>}><p>Verify your public identity and import release assets, without granting write access.</p></HubPageHead><GitHubAccountConnection /></HubShell>;
}
