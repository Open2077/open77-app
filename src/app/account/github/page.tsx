import { AuthScene } from "@/components/account/auth-scene";
import { GitHubAccountConnection } from "@/components/community/github-connection";

export const metadata = { title: "GitHub connection", robots: { index: false, follow: false } };
export default function GitHubPage() {
  return <AuthScene kind="github"><GitHubAccountConnection /></AuthScene>;
}
