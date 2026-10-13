"use client";

import { useState, type ReactNode } from "react";

import { Button } from "@/components/ui/button";
import { Avatar } from "@/components/ui/data";
import { logout03 } from "@/components/ui/icons";
import * as master from "@/lib/account/api";
import { useSession } from "@/lib/account/session";
import { AccountFrame, type SceneName } from "./account-frame";
import { AccountNav } from "./account-nav";
import { AuthFootnote } from "./auth-scene";

import styles from "./account-shell.module.css";

/**
 * Every signed-in account page: the key-art band with the page title and the
 * identity card, the section navigation, then the page. Without a session the
 * same page becomes a Night City gate around its own sign-in panel; the page
 * components keep deciding what a visitor sees, the shell only sets the mood.
 */
export function AccountShell({
  eyebrow,
  title,
  accent,
  lead,
  guestLead,
  actions,
  children,
  width,
  scene = "players",
}: {
  eyebrow: string;
  title: string[];
  accent?: number[];
  lead?: ReactNode;
  /** What signing in leads to, shown to visitors without a session. */
  guestLead?: ReactNode;
  actions?: ReactNode;
  children: ReactNode;
  width?: "default" | "wide";
  scene?: SceneName;
}) {
  const { session, ready } = useSession();
  const mode = !ready ? "pending" : session ? "member" : "guest";
  return (
    <AccountFrame
      mode={mode}
      scene={scene}
      eyebrow={mode === "guest" ? `// ${eyebrow}` : eyebrow}
      title={title}
      accent={accent}
      lead={mode === "guest" ? (guestLead ?? lead) : lead}
      actions={actions}
      aside={session ? <Identity key={session.token} /> : null}
      nav={<AccountNav />}
      footnote={<AuthFootnote />}
      width={width}
    >
      {children}
    </AccountFrame>
  );
}

/** Who is signed in, from the cached session (never an entitlement), and the way out. */
function Identity() {
  const { session, clear } = useSession();
  const [busy, setBusy] = useState(false);
  if (!session) return null;
  const name = session.displayName || session.email || "Player";

  async function signOut() {
    if (busy || !session) return;
    setBusy(true);
    try {
      await master.logout(session.token);
    } catch {
      // A revoked or offline session is still cleared locally.
    } finally {
      clear();
    }
  }

  return (
    <div className={styles.identity} data-account-identity>
      <Avatar name={name} size={56} className={styles.avatar} />
      <div className={styles.who}>
        <p className={styles.kicker}>Signed in</p>
        <p className={styles.name}>{name}</p>
        {session.email ? <p className={styles.email}>{session.email}</p> : null}
      </div>
      <Button key={busy ? "Signing out…" : "Sign out"}
        lines="none"
        color="neutral"
        border
        size="sm"
        icon={logout03}
        iconPosition="left"
        busy={busy}
        onClick={() => void signOut()}
        className={styles.signOut}
      >
        {busy ? "Signing out…" : "Sign out"}
      </Button>
    </div>
  );
}
