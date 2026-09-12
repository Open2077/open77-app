import type { Metadata } from "next";
import { HubPageHead, HubShell } from "@/components/community/hub-shell";
import { GitHubCallback } from "@/components/community/github-callback";

export const metadata: Metadata = { title: "Connect GitHub", referrer: "no-referrer", robots: { index: false, follow: false } };
export default function GitHubCallbackPage() {
  return <HubShell><HubPageHead kicker="CREATOR CONNECTIONS" title="Connecting GitHub" /><GitHubCallback /></HubShell>;
}
