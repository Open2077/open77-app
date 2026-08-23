"use client";

import { useSearchParams } from "next/navigation";

import { AuthPanel } from "@/components/account/auth-panel";
import { Keymaster } from "@/components/account/keymaster";
import { ServerRackIcon } from "@/components/icons";
import { useSession } from "@/lib/account/session";

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

  if (!ready) return <p className="ac-loading">Loading…</p>;

  if (!session) {
    return (
      <>
        {serverLaunch ? (
          <section className="ac-launch" aria-label="Server launch">
            <h2>
              <ServerRackIcon size={19} />
              Your server needs a license key
            </h2>
            <p>
              Sign in — or create an account — and the keymaster will walk you through creating the
              license key your dedicated server asked for.
            </p>
          </section>
        ) : null}
        <AuthPanel />
      </>
    );
  }

  return <Keymaster session={session} serverLaunch={serverLaunch} />;
}
