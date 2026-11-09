import { AccountShell } from "@/components/account/account-shell";
import { Button } from "@/components/ui/button";
import { ProfileEditor } from "@/components/community/profile-editor";

export const metadata = { title: "Creator profile", robots: { index: false, follow: false } };

export default function ProfilePage() {
  return (
    <AccountShell
      eyebrow="Public identity"
      title={["Creator", "profile"]}
      lead="Your handle, bio and links are public. Everything else stays private."
      guestLead="Sign in to edit the handle, bio and links other creators see on the Workshop."
      actions={
        <>
          <Button lines="none" border color="neutral" size="sm" href="/account/github">
            GitHub
          </Button>
          <Button lines="none" border color="neutral" size="sm" href="/account/connections">
            Wardens
          </Button>
        </>
      }
    >
      <ProfileEditor />
    </AccountShell>
  );
}
