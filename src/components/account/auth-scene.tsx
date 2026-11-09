"use client";

import type { ReactNode } from "react";

import { Icon } from "@/components/ui/icon";
import { arrowRight01, shield01 } from "@/components/ui/icons";
import { Loader } from "@/components/ui/feedback";
import { SmartLink } from "@/components/ui/smart-link";
import { useMessages } from "@/i18n/client";
import { AccountFrame, type SceneName } from "./account-frame";

import styles from "./auth-scene.module.css";

type Kind = "account" | "forgot" | "reset" | "verify" | "launcher" | "github" | "warden";

/** Which key art each flow enters through; the words come from the `auth` messages. */
const SCENE_FOR: Record<Kind, SceneName> = {
  account: "players",
  forgot: "recovery",
  reset: "recovery",
  verify: "verify",
  launcher: "players",
  github: "creator",
  warden: "creator",
};

/**
 * Entering Night City: full-height key art, characters framing the title, and
 * the page's form as the focused stage. Used by sign-in, recovery, e-mail
 * verification and the launcher, GitHub and Warden consents.
 */
export function AuthScene({ kind, children }: { kind: Kind; children: ReactNode }) {
  const scene: { eyebrow: string; title: string[]; lead: string; notes?: string[] } = useMessages("auth").scenes[kind];
  return (
    <AccountFrame
      mode="guest"
      scene={SCENE_FOR[kind]}
      eyebrow={kind === "account" ? `// ${scene.eyebrow}` : scene.eyebrow}
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
  const m = useMessages("auth").footnote;
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
        <span>{m.alpha}</span>{" "}
        <SmartLink href="/docs/alpha-access" className={styles.alphaLink}>
          {m.alphaLink}
          <Icon glyph={arrowRight01} />
        </SmartLink>
      </p>
      <p className={styles.master}>{m.master}</p>
    </div>
  );
}

/** The stage while the session or a link is being checked. */
export function AuthLoading({ children }: { children?: string }) {
  const fallback = useMessages("auth").loading;
  return (
    <div className={styles.loading}>
      <Loader label={(children ?? fallback).replace(/…$/, "")} />
    </div>
  );
}
