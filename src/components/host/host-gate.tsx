"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import type { ReactNode } from "react";

import { AuthPanel } from "@/components/account/auth-panel";
import { ShieldIcon } from "@/components/icons";
import { me, MasterApiError } from "@/lib/account/api";
import { useSession } from "@/lib/account/session";
import { canDownloadServer } from "@/lib/account/host-access";

/**
 * Developer Preview downloads are available to approved accounts and admins.
 * Consult /me rather than a role/entitlement cached at login. This is a
 * presentation gate, not CDN authorization: the versioned archives are public.
 */
export function HostGate({ children }: { children: ReactNode }) {
  const { session, ready, update, clear } = useSession();
  const [check, setCheck] = useState<{ token: string; allowed: boolean; failed: boolean } | null>(null);
  const [revision, setRevision] = useState(0);

  // Bind the result to this token, so changing accounts never reuses access.
  const token = session?.token;
  useEffect(() => {
    if (!token) return;
    let cancelled = false;
    me(token)
      .then((account) => {
        if (cancelled) return;
        setCheck({ token, allowed: canDownloadServer(account), failed: false });
        update({
          role: account.role,
          emailVerified: account.emailVerified,
          email: account.email,
          displayName: account.displayName,
        });
      })
      .catch((error: unknown) => {
        if (cancelled) return;
        setCheck({ token, allowed: false, failed: true });
        if (error instanceof MasterApiError && error.code === "invalid_session") {
          clear();
        }
      });
    return () => {
      cancelled = true;
    };
  }, [token, update, clear, revision]);

  if (!ready || (token && check?.token !== token)) {
    return (
      <section className="section" aria-busy="true">
        <div className="section-inner">
          <p className="ac-loading">Checking preview access…</p>
        </div>
      </section>
    );
  }

  if (token && check?.token === token && check.allowed) {
    return <>{children}</>;
  }

  return (
    <section className="section" id="download">
      <div className="section-inner">
        <div className="host-locked">
          <span className="hud-corners" aria-hidden="true" />
          <p className="host-locked-tag">
            <ShieldIcon size={15} />
            DEVELOPER PREVIEW
          </p>
          <h2>{check?.token === token && check?.failed ? "Unable to verify preview access." : "Server downloads for approved preview accounts."}</h2>
          <p className="host-locked-body">
            Accounts approved for alpha access can download the Windows and Linux server builds;
            a staff role is not required. Apply through <Link href="/create#developer-alpha">Create a Server</Link>
            {" "}if you do not have access yet, and follow the{" "}
            <Link href="/docs/server-licensing">licensing guide</Link> to configure your server.
          </p>
          {session ? (
            <p className="host-locked-note">
              You are signed in as <strong>{session.email ?? session.displayName}</strong>, which
              {check?.token === token && check?.failed
                ? " could not be checked. Please retry when the master is reachable."
                : " has not been granted preview access yet."}
            </p>
          ) : null}
          {session ? (
            <button className="btn btn-ghost" type="button" onClick={() => { setCheck(null); setRevision((value) => value + 1); }}>
              Check access again
            </button>
          ) : null}
        </div>
        {!session ? (
          <div className="host-locked-auth">
            <p className="ac-notice">
              <ShieldIcon size={15} />
              <span>Sign in with your approved preview account to reach the downloads.</span>
            </p>
            <AuthPanel />
          </div>
        ) : null}
      </div>
    </section>
  );
}
