import { HubPageHead, HubShell } from "@/components/community/hub-shell";
import { ProfileEditor } from "@/components/community/profile-editor";
import Link from "next/link";

export const metadata = { title: "Creator profile", robots: { index: false, follow: false } };
export default function ProfilePage() {
  return <HubShell><HubPageHead kicker="PUBLIC IDENTITY" title="Creator profile" actions={<><Link className="btn btn-ghost btn-small" href="/account/github">GitHub</Link><Link className="btn btn-ghost btn-small" href="/account/connections">Wardens</Link></>}><p>Your handle, bio and links are public. Everything else stays private.</p></HubPageHead><ProfileEditor /></HubShell>;
}
