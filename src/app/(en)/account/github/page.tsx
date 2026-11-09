import { AccountShell } from "@/components/account/account-shell";
import { ConnectionsTabs } from "@/components/account/connections-tabs";
import { GitHubAccountConnection } from "@/components/community/github-connection";

export const metadata = { title: "GitHub connection", robots: { index: false, follow: false } };

export default function GitHubPage() {
  return (
    <AccountShell
      eyebrow="Creator connections"
      title={["Connect", "GitHub"]}
      lead="Verify your public identity and import release assets into the Workshop, without granting write access to your repositories."
      guestLead="Sign in to verify your public GitHub identity and import release assets into the Workshop."
    >
      <ConnectionsTabs />
      <GitHubAccountConnection />
    </AccountShell>
  );
}
