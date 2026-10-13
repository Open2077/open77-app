"use client";

import type { ReactNode } from "react";

import { Icon } from "@/components/ui/icon";
import { arrowRight01, shield01 } from "@/components/ui/icons";
import { Loader } from "@/components/ui/feedback";
import { SmartLink } from "@/components/ui/smart-link";
import { AccountFrame, type SceneName } from "./account-frame";

import styles from "./auth-scene.module.css";

type Kind = "account" | "forgot" | "reset" | "verify" | "launcher" | "github" | "warden";

const KINDS: Record<Kind, { eyebrow: string; title: string[]; lead: string; scene: SceneName; notes?: string[] }> = {
  account: {
    eyebrow: "// Platform account",
    title: ["Your", "account"],
    lead: "One account for the whole platform: the server browser, your game identities, your Workshop creations, and the license keys your servers run on.",
    scene: "players",
  },
  forgot: {
    eyebrow: "// Account recovery",
    title: ["Lost your", "password?"],
    lead: "It happens. We'll e-mail you a single-use link to choose a new one.",
    scene: "recovery",
    notes: ["Use the latest e-mail: links are single-use and expire after a short while.", "Keep the link to yourself. Nobody from OPEN//77 will ever ask you for it."],
  },
  reset: {
    eyebrow: "// Account recovery",
    title: ["New", "password"],
    lead: "You followed a reset link from your inbox. Choose the new password for your account and sign in with it.",
    scene: "recovery",
    notes: ["Use the latest e-mail: links are single-use and expire after a short while.", "Keep the link to yourself. Nobody from OPEN//77 will ever ask you for it."],
  },
  verify: {
    eyebrow: "// Platform account",
    title: ["Verify your", "e-mail"],
    lead: "One click and your address is confirmed. Verification is required before you can create server license keys.",
    scene: "verify",
    notes: ["Use the latest e-mail: links are single-use and expire after a short while."],
  },
  launcher: {
    eyebrow: "// Launcher",
    title: ["Authorize", "launcher"],
    lead: "Connect the OPEN//77 launcher running on this device to your platform account. The launcher never sees your password.",
    scene: "players",
    notes: ["Approve only what you started: if you did not open this page from the launcher, close it.", "The launcher receives a short-lived code. Your password never leaves this page."],
  },
  github: {
    eyebrow: "// Creator connections",
    title: ["Connect", "GitHub"],
    lead: "Verify your public identity and import release assets into the Workshop, without granting write access to your repositories.",
    scene: "creator",
    notes: ["Approve only what you started: if you did not open this page from GitHub, close it.", "Read access to your public identity and releases. No write permissions."],
  },
  warden: {
    eyebrow: "// Creator connections",
    title: ["Approve", "Warden"],
    lead: "Let your server's Warden prepare Workshop resource drafts under your account. Review exactly what it asks for before you approve it.",
    scene: "creator",
    notes: ["Approve only what you started: if you did not open this page from your Warden, close it.", "A scoped token for the project you pick, revocable from your account."],
  },
};

/**
 * Entering Night City: full-height key art, characters framing the title, and
 * the page's form as the focused stage. Used by sign-in, recovery, e-mail
 * verification and the launcher, GitHub and Warden consents.
 */
export function AuthScene({ kind, children }: { kind: Kind; children: ReactNode }) {
  const scene = KINDS[kind];
  return (
    <AccountFrame
      mode="guest"
      scene={scene.scene}
      eyebrow={scene.eyebrow}
      title={scene.title}
      lead={scene.lead}
      footnote={<AuthFootnote notes={scene.notes} />}
    >
      {children}
    </AccountFrame>
  );
}

/** Under every gate: the safety notes of the flow, and what an account does and does not include. */
export function AuthFootnote({ notes }: { notes?: string[] }) {
  return (
    <div className={styles.footnote}>
      {notes?.length ? (
        <ul className={styles.notes}>
          {notes.map((note) => (
            <li key={note}>
              <Icon glyph={shield01} />
              <span>{note}</span>
            </li>
          ))}
        </ul>
      ) : null}
      <p className={styles.alpha}>
        <span>Creating an account is free. Alpha access is a separate step to play and host.</span>{" "}
        <SmartLink href="/docs/alpha-access" className={styles.alphaLink}>
          How Alpha access works
          <Icon glyph={arrowRight01} />
        </SmartLink>
      </p>
      <p className={styles.master}>Accounts run against the OPEN//77 master server.</p>
    </div>
  );
}

/** The stage while the session or a link is being checked. */
export function AuthLoading({ children = "Loading your account" }: { children?: string }) {
  return (
    <div className={styles.loading}>
      <Loader label={children.replace(/…$/, "")} />
    </div>
  );
}
