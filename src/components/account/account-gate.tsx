"use client";

import { useSession } from "@/lib/account/session";
import { AccountOverview } from "./account-overview";
import { AuthPanel } from "./auth-panel";
import { Pending } from "./kit";

/** The signed-in overview, or the sign-in panel when there is no session. */
export function AccountGate() {
  const { session, ready } = useSession();
  if (!ready) return <Pending label="Account" />;
  if (!session) return <AuthPanel />;
  return <AccountOverview key={session.token} session={session} />;
}
