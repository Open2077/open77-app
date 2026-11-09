"use client";

import { useMessages } from "@/i18n/client";
import { useSession } from "@/lib/account/session";
import { AccountOverview } from "./account-overview";
import { AuthPanel } from "./auth-panel";
import { Pending } from "./kit";

/** The signed-in overview, or the sign-in panel when there is no session. */
export function AccountGate() {
  const { session, ready } = useSession();
  const label = useMessages("auth").pending;
  if (!ready) return <Pending label={label} />;
  if (!session) return <AuthPanel />;
  return <AccountOverview key={session.token} session={session} />;
}
