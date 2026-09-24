"use client";

import { AccountOverview } from "@/components/account/account-overview";
import { AuthPanel } from "@/components/account/auth-panel";
import { AuthScene, AuthLoading } from "@/components/account/auth-scene";
import { SiteFooter } from "@/components/site-footer";
import { useSession } from "@/lib/account/session";

/** Renders the signed-in account page, or the sign-in card when there is no session. */
export function AccountGate() {
  const { session, ready } = useSession();
  if (!ready || !session) return <AuthScene kind="account">{ready ? <AuthPanel /> : <AuthLoading />}</AuthScene>;
  return <><main className="account-dashboard" id="main"><div className="account-dashboard-inner">
    <AccountOverview key={session.token} session={session} />
  </div></main><SiteFooter tone="dark" fineprint="Accounts run against the OPEN//77 master server." /></>;
}
