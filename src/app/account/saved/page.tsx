import { AccountShell } from "@/components/account/account-shell";
import { Button } from "@/components/ui/button";
import { SavedProjects } from "@/components/community/saved-projects";

export const metadata = { title: "Saved creations", robots: { index: false, follow: false } };

export default function SavedPage() {
  return (
    <AccountShell
      eyebrow="Your collection"
      title={["Saved", "creations"]}
      lead="Private to you. Keep resources and showcases here for later."
      guestLead="Sign in to find the resources and showcases you saved for later."
      actions={
        <Button lines="none" border color="neutral" size="sm" href="/account/subscriptions">
          Release subscriptions
        </Button>
      }
    >
      <SavedProjects kind="save" />
    </AccountShell>
  );
}
