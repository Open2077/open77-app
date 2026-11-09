import { AccountShell } from "@/components/account/account-shell";
import { Button } from "@/components/ui/button";
import { SavedProjects } from "@/components/community/saved-projects";

export const metadata = { title: "Release subscriptions", robots: { index: false, follow: false } };

export default function SubscriptionsPage() {
  return (
    <AccountShell
      eyebrow="Your collection"
      title={["Release", "subscriptions"]}
      lead="Creations you follow. New releases land in your inbox."
      guestLead="Sign in to see the creations you follow. Their new releases land in your inbox."
      actions={
        <Button lines="none" border color="neutral" size="sm" href="/account/saved">
          Saved creations
        </Button>
      }
    >
      <SavedProjects kind="subscription" />
    </AccountShell>
  );
}
