"use client";

import { useEffect } from "react";
import type { ReactNode } from "react";

import { AuthPanel } from "@/components/account/auth-panel";
import { Button } from "@/components/admin/admin-button";
import { Loader } from "@/components/ui/feedback";
import { Icon } from "@/components/ui/icon";
import { activity01, arrowLeft01, shield01, user } from "@/components/ui/icons";
import { Panel } from "@/components/ui/panel";
import { Display, Eyebrow, Lead } from "@/components/ui/typography";
import { me, MasterApiError } from "@/lib/account/api";
import { useSession } from "@/lib/account/session";
import { AdminActivityProvider } from "./admin-activity";
import { AdminWorkspace } from "./admin-workspace";

import styles from "./admin-shell.module.css";

/** What a staff member should know before signing in. */
const FACTS = [
  { glyph: shield01, text: "Every admin route is re-checked by the master on each request." },
  { glyph: activity01, text: "Decisions taken here are written to the audit log with their author." },
];

/**
 * Chrome and gate of the operations console.
 *
 * The role check here is presentation only — every admin route on the master
 * re-checks the session per request and answers 403 `admin_required`. The
 * gate's job is a clean staff experience: sign-in when signed out, an honest
 * denial for non-administrators, and the console for staff.
 */
export function AdminShell({ children }: { children: ReactNode }) {
  const { session, ready, update, clear } = useSession();

  // The stored role is captured at login; a promotion (or demotion) on the
  // master won't show until we re-sync. Refresh from /me whenever a session is
  // present so staff access reflects the current role without a re-login.
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
        // A 401 means the session is gone on the master — drop it locally too.
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
      <Gate>
        <Loader label="Checking staff session" />
      </Gate>
    );
  }

  if (!session) {
    return (
      <Gate aside={<AuthPanel />}>
        <Lead>The operations console requires a staff sign-in.</Lead>
        <ul className={styles.facts}>
          {FACTS.map((fact) => (
            <li key={fact.text}>
              <Icon glyph={fact.glyph} className={styles.factIcon} />
              <span>{fact.text}</span>
            </li>
          ))}
        </ul>
      </Gate>
    );
  }

  if (session.role !== "admin") {
    const who = session.email ?? session.displayName;
    return (
      <Gate operator={who}>
        <Panel as="section" brackets padding="lg" className={styles.denied} aria-labelledby="admin-denied-title">
          <span className={styles.deniedMark} aria-hidden="true">
            <Icon glyph={shield01} />
          </span>
          <Eyebrow>403 · admin_required</Eyebrow>
          <Display as="h2" size="sm" id="admin-denied-title">
            Administrator account required
          </Display>
          <p className={styles.deniedText}>
            You are signed in as <strong>{who}</strong>, which is not an administrator account. If you believe you
            should have access, contact the platform team.
          </p>
          <div className={styles.deniedActions}>
            <Button href="/account" size="sm" color="red" lines="none" icon={user} iconPosition="left">
              Your account
            </Button>
            <Button href="/" size="sm" color="neutral" border lines="none" icon={arrowLeft01} iconPosition="left">
              Back to website
            </Button>
          </div>
        </Panel>
      </Gate>
    );
  }

  return (
    <AdminActivityProvider key={session.token}>
      <AdminWorkspace operator={session.displayName || session.email || "Administrator"}>{children}</AdminWorkspace>
    </AdminActivityProvider>
  );
}

/** The console's front door: title on one side, the way in (or the reason why not) on the other. */
function Gate({ children, aside, operator }: { children: ReactNode; aside?: ReactNode; operator?: string }) {
  return (
    <div className={styles.gate} data-has-aside={aside ? "" : undefined}>
      <div className={styles.watermark} aria-hidden="true">
        OPS
      </div>
      <div className={styles.copy}>
        <Eyebrow>OPEN//77 · Operations</Eyebrow>
        <Display as="h1" size="lg" lines={["Admin", "console."]} accent={[1]} />
        {operator ? (
          <p className={styles.operator}>
            operator <strong>{operator}</strong>
          </p>
        ) : null}
        {children}
      </div>
      {aside ? <div className={styles.aside}>{aside}</div> : null}
    </div>
  );
}
