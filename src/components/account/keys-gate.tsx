"use client";

import { useSearchParams } from "next/navigation";

import { useSession } from "@/lib/account/session";
import { AuthPanel } from "./auth-panel";
import { Keymaster, ServerLaunchBrief } from "./keymaster";
import { Pending } from "./kit";

import styles from "./keymaster.module.css";

/**
 * The keymaster behind its sign-in gate.
 *
 * A dedicated server launched without a license key sends its operator to
 * `/account/keys?source=server-launch`; the flag survives the sign-in step
 * because it lives in the URL, so the walkthrough is already on screen when
 * the session begins.
 */
export function KeysGate() {
  const { session, ready } = useSession();
  const serverLaunch = useSearchParams().get("source") === "server-launch";

  if (!ready) return <Pending label="Account" />;

  if (!session) {
    return (
      <>
        {serverLaunch ? (
          <ServerLaunchBrief>
            <p className={styles.briefText}>
              Sign in, or create an account, and the keymaster will walk you through creating the license key your dedicated server asked
              for.
            </p>
          </ServerLaunchBrief>
        ) : null}
        <AuthPanel />
      </>
    );
  }

  return <Keymaster session={session} serverLaunch={serverLaunch} />;
}
