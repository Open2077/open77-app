"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import type { ReactNode } from "react";

import { AuthPanel } from "@/components/account/auth-panel";
import { ShieldIcon } from "@/components/icons";
import { me, MasterApiError } from "@/lib/account/api";
import { useSession } from "@/lib/account/session";
import { canDownloadServer } from "@/lib/account/host-access";
import { site } from "@/lib/site";
import styles from "@/components/downloads/download-surface.module.css";

/**
 * Server downloads are available to all Alpha accounts and admins.
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
      <div className={styles.loading} aria-busy="true" role="status">
        <span className={styles.spinner} aria-hidden="true" />Checking Alpha access…
      </div>
    );
  }

  if (token && check?.token === token && check.allowed) {
    return <>{children}</>;
  }

  return (
    <div className={`${styles.gate} host-locked`}>
      <div className={!session ? styles.gateGrid : undefined}>
        <div className={styles.gateCopy}>
          <p className={styles.eyebrow}>
            <ShieldIcon size={15} />
            ALPHA ACCESS
          </p>
          <h2>{check?.token === token && check?.failed ? "Unable to verify Alpha access." : "Server downloads for everyone with Alpha access."}</h2>
          <p>
            Already have Alpha access? Sign in to download the Windows or Linux server and start
            building. No separate developer application or staff role is required. Need access?
            Use <code>/alpha apply</code> in any channel on our{" "}
            <a href={site.links.discord ?? "https://discord.open2077.net"} target="_blank" rel="noreferrer noopener">Discord</a>.
            {" "}Follow the{" "}
            <Link href="/docs/server-licensing">licensing guide</Link> to configure your server.
          </p>
          {session ? (
            <p className={styles.gateNote}>
              You are signed in as <strong>{session.email ?? session.displayName}</strong>, which
              {check?.token === token && check?.failed
                ? " could not be checked. Please retry when the master is reachable."
                : " does not have Alpha access yet."}
            </p>
          ) : null}
          {session ? (
            <button className={styles.secondary} type="button" onClick={() => { setCheck(null); setRevision((value) => value + 1); }}>
              Check access again
            </button>
          ) : null}
        </div>
        {!session ? (
          <div className={styles.gateAuth}>
            <p className="ac-notice">
              <ShieldIcon size={15} />
              <span>Sign in with your Alpha account to reach the downloads.</span>
            </p>
            <AuthPanel />
          </div>
        ) : null}
      </div>
    </div>
  );
}
