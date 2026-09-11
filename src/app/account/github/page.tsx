import { HubShell } from "@/components/community/hub-shell";
import { GitHubAccountConnection } from "@/components/community/github-connection";

export const metadata = { title: "GitHub connection", robots: { index: false, follow: false } };
export default function GitHubPage() {
  return <HubShell><header className="hub-directory-head"><p className="hub-kicker">CREATOR CONNECTIONS</p><h1>GitHub account</h1>
    <p>Verify your public identity without granting repository write access.</p></header><GitHubAccountConnection /></HubShell>;
}
