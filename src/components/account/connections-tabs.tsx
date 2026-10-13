"use client";

import { Tabs } from "@/components/ui/tabs";
import { useSession } from "@/lib/account/session";

/** Wardens and GitHub: the two kinds of service allowed to act for a creator. Signed-in only. */
export function ConnectionsTabs() {
  const { session } = useSession();
  if (!session) return null;
  return (
    <Tabs
      label="Connection types"
      exact
      items={[
        { href: "/account/connections", label: "Wardens" },
        { href: "/account/github", label: "GitHub" },
      ]}
    />
  );
}
