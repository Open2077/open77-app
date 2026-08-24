"use client";

import Link from "next/link";
import { useEffect } from "react";
import type { ReactNode } from "react";

import { AuthPanel } from "@/components/account/auth-panel";
import { ShieldIcon } from "@/components/icons";
import { me, MasterApiError } from "@/lib/account/api";
import { useSession } from "@/lib/account/session";

/**
 * TODO(go-public): the server download is admin-only while the release
 * pipeline is being proven. When it opens to every server owner, delete this
 * component and unwrap its children in `src/app/host/page.tsx` — the page
 * content and its data source (the public CDN) already assume no session, so
 * removing the wrapper is the whole change. Remember to also drop the
 * `robots: noindex` override in that page's metadata.
 *
 * Like the admin console's shell, the role check here is presentation only —
 * the download URL is on a public CDN, so nothing behind this gate is secret.
 * It exists to keep the page honest while the button should only be pressed
 * by staff.
 */
export function HostGate({ children }: { children: ReactNode }) {
  const { session, ready, update, clear } = useSession();

  // The stored role is captured at login; re-sync from /me so a promotion on
  // the master shows without a re-login (same pattern as the admin shell).
  const token = session?.token;
  useEffect(() => {
    if (!token) return;
    let cancelled = false;
    me(token)
      .then((account) => {
        if (cancelled) return;
        update({
          role: account.role,
          emailVerified: account.emailVerified,
          email: account.email,
          displayName: account.displayName,
        });
      })
      .catch((error: unknown) => {
        if (!cancelled && error instanceof MasterApiError && error.code === "invalid_session") {
          clear();
        }
      });
    return () => {
      cancelled = true;
    };
  }, [token, update, clear]);

  if (!ready) {
    return (
      <section className="section" aria-busy="true">
        <div className="section-inner">
          <p className="ac-loading">Loading…</p>
        </div>
      </section>
    );
  }

  if (session?.role === "admin") {
    return <>{children}</>;
  }

  return (
    <section className="section" id="download">
      <div className="section-inner">
        <div className="host-locked">
          <span className="hud-corners" aria-hidden="true" />
          <p className="host-locked-tag">
            <ShieldIcon size={15} />
            EARLY ACCESS — STAFF ONLY
          </p>
          <h2>The server download opens to everyone soon.</h2>
          <p className="host-locked-body">
            Dedicated-server builds are being rolled out to platform administrators first, while
            the release pipeline is proven end to end. Nothing else changes when it opens: hosting
            starts at <Link href="/create">Create a Server</Link>, and the{" "}
            <Link href="/docs/server-licensing">licensing guide</Link> already walks through
            everything your server will need.
          </p>
          {session ? (
            <p className="host-locked-note">
              You are signed in as <strong>{session.email ?? session.displayName}</strong>, which
              is not a staff account.
            </p>
          ) : null}
        </div>
        {!session ? (
          <div className="host-locked-auth">
            <p className="ac-notice">
              <ShieldIcon size={15} />
              <span>Platform staff can sign in below to reach the download.</span>
            </p>
            <AuthPanel />
          </div>
        ) : null}
      </div>
    </section>
  );
}
