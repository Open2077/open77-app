"use client";

import { AccountOverview } from "@/components/account/account-overview";
import { AuthPanel } from "@/components/account/auth-panel";
import { useSession } from "@/lib/account/session";

/** Renders the signed-in account page, or the sign-in card when there is no session. */
export function AccountGate() {
  const { session, ready } = useSession();
  if (!ready) return <p className="ac-loading">Loading…</p>;
  return session ? <AccountOverview session={session} /> : <AuthPanel />;
}
