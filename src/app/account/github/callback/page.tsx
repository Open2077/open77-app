import type { Metadata } from "next";
import { AuthScene } from "@/components/account/auth-scene";
import { GitHubCallback } from "@/components/community/github-callback";

export const metadata: Metadata = { title: "Connect GitHub", referrer: "no-referrer", robots: { index: false, follow: false } };
export default function GitHubCallbackPage() {
  return <AuthScene kind="github"><GitHubCallback /></AuthScene>;
}
