import type { Metadata } from "next";
import { HubShell } from "@/components/community/hub-shell";
import { GitHubCallback } from "@/components/community/github-callback";

export const metadata: Metadata = { title: "Connect GitHub", referrer: "no-referrer", robots: { index: false, follow: false } };
export default function GitHubCallbackPage() {
  return <HubShell><header className="hub-directory-head"><h1>Connecting GitHub</h1></header><GitHubCallback /></HubShell>;
}
