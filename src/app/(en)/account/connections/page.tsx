import { AccountShell } from "@/components/account/account-shell";
import { ConnectionsTabs } from "@/components/account/connections-tabs";
import { Button } from "@/components/ui/button";
import { WardenConnections } from "@/components/community/warden-connections";

export const metadata = { title: "Warden connections", robots: { index: false, follow: false } };

export default function ConnectionsPage() {
  return (
    <AccountShell
      eyebrow="Creator connections"
      title={["Connected", "Wardens"]}
      lead="Server consoles allowed to publish drafts to your creator account."
      guestLead="Sign in to review and revoke the server consoles allowed to publish drafts to your creator account."
      actions={
        <Button lines="none" border color="neutral" size="sm" href="/account/profile">
          Creator profile
        </Button>
      }
    >
      <ConnectionsTabs />
      <WardenConnections />
    </AccountShell>
  );
}
