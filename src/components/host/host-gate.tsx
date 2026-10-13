"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import type { ReactNode } from "react";

import { AuthPanel } from "@/components/account/auth-panel";
import { Button } from "@/components/ui/button";
import { Loader } from "@/components/ui/feedback";
import { Icon } from "@/components/ui/icon";
import { lock, refresh, shield01 } from "@/components/ui/icons";
import { Display, Eyebrow } from "@/components/ui/typography";
import { me, MasterApiError } from "@/lib/account/api";
import { canDownloadServer } from "@/lib/account/host-access";
import { useSession } from "@/lib/account/session";
import { site } from "@/lib/site";

import styles from "./host-gate.module.css";

/**
 * Server downloads are available to all Alpha accounts and admins.
 * Consult /me rather than a role/entitlement cached at login. This is a
 * presentation gate, not CDN authorization: the versioned archives are public.
 *
 * `preview` is shown while the gate is closed: what is behind it (version,
 * platforms), never the download links.
 */
export function HostGate({ children, preview }: { children: ReactNode; preview?: ReactNode }) {
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
      <div className={styles.checking} aria-busy="true">
        <Loader label="Checking Alpha access" />
        {preview ? <div className={styles.preview}>{preview}</div> : null}
      </div>
    );
  }

  if (token && check?.token === token && check.allowed) {
    return <>{children}</>;
  }

  const failed = check?.token === token && check?.failed;

  return (
    <div className={styles.locked} data-host-locked>
      <div className={styles.copy}>
        <Eyebrow>
          <Icon glyph={lock} className={styles.eyebrowIcon} />
          Alpha access
        </Eyebrow>
        <Display as="h2" size="md" className={styles.title}>
          {failed ? "Unable to verify Alpha access." : "Server downloads for everyone with Alpha access."}
        </Display>
        <p className={styles.text}>
          Already have Alpha access? Sign in to download the Windows or Linux server and start building.{" "}
          {"No separate developer application or staff role is required."} Need access? Use <code>/alpha apply</code> in
          any channel on our{" "}
          <a href={site.links.discord ?? "https://discord.open2077.net"} target="_blank" rel="noreferrer noopener">
            Discord
          </a>
          . Follow the <Link href="/docs/server-licensing">licensing guide</Link> to configure your server.
        </p>
        {session ? (
          <p className={styles.note} role="status">
            You are signed in as <strong>{session.email ?? session.displayName}</strong>, which
            {failed ? " could not be checked. Please retry when the master is reachable." : " does not have Alpha access yet."}
          </p>
        ) : null}
        {session ? (
          <Button
            color="blue"
            border
            lines="none"
            icon={refresh}
            iconPosition="left"
            onClick={() => {
              setCheck(null);
              setRevision((value) => value + 1);
            }}
          >
            Check access again
          </Button>
        ) : null}
        {preview ? <div className={styles.preview}>{preview}</div> : null}
      </div>
      {!session ? (
        <div className={styles.auth}>
          <p className={styles.authNote}>
            <Icon glyph={shield01} />
            <span>Sign in with your Alpha account to reach the downloads.</span>
          </p>
          <AuthPanel />
        </div>
      ) : null}
    </div>
  );
}
