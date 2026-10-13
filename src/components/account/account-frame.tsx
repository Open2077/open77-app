"use client";

import Image from "next/image";
import type { CSSProperties, ReactNode } from "react";

import { cx } from "@/components/ui/cx";
import { GlitchFrame } from "@/components/ui/glitch-frame";
import { Page } from "@/components/ui/page";
import { Display, Eyebrow, Lead } from "@/components/ui/typography";

import styles from "./account-frame.module.css";

export type SceneArt = {
  background: string;
  /** Cut-out characters framing the gate, as on the home hero. */
  characters: Array<{ src: string; width: number; height: number; side: "left" | "right" }>;
  /** Giant outlined word behind the title. */
  watermark: string;
  /** Background focal point. */
  position?: string;
};

export const SCENES = {
  players: {
    background: "/home/img/players-bg.webp",
    characters: [
      { src: "/home/img/hero-v-left.webp", width: 1092, height: 1251, side: "left" },
      { src: "/home/img/hero-v-right.webp", width: 1784, height: 2048, side: "right" },
    ],
    watermark: "Jack in",
    position: "center 40%",
  },
  recovery: {
    background: "/home/img/players-bg.webp",
    characters: [{ src: "/home/img/hero-v-right.webp", width: 1784, height: 2048, side: "right" }],
    watermark: "Reboot",
    position: "30% 40%",
  },
  verify: {
    background: "/home/img/players-bg.webp",
    characters: [{ src: "/home/img/players-character.webp", width: 1202, height: 1818, side: "right" }],
    watermark: "Confirm",
    position: "center 45%",
  },
  creator: {
    background: "/home/img/creators-bg.webp",
    characters: [{ src: "/home/img/creators-character.webp", width: 1261, height: 1253, side: "left" }],
    watermark: "Connect",
    position: "center 40%",
  },
} satisfies Record<string, SceneArt>;

export type SceneName = keyof typeof SCENES;

/**
 * The account area's one layout, in two moods.
 *
 * - `member`: the signed-in workspace. A key-art band carries the page title
 *   and the identity card; below it, the section navigation and the content.
 * - `guest`: entering Night City. Full-height key art, and the content (a
 *   sign-in panel, a consent, a reset form) as the focused stage: beside the
 *   title on wide screens, so the form is in the first screen even on a short
 *   window, with the characters framing the pair; under it on narrow ones.
 * - `pending`: the session is not known yet; the member band without the
 *   navigation, so neither mood is claimed as fact.
 *
 * The children always sit in the same place in the tree, so switching moods
 * (a session ending mid-edit, a sign-in completing) never remounts them.
 */
export function AccountFrame({
  mode,
  scene = "players",
  eyebrow,
  title,
  accent,
  lead,
  actions,
  aside,
  nav,
  footnote,
  children,
  width = "default",
}: {
  mode: "member" | "guest" | "pending";
  scene?: SceneName;
  eyebrow: ReactNode;
  title: string[];
  accent?: number[];
  lead?: ReactNode;
  actions?: ReactNode;
  /** Right of the title in the member band: the identity card. */
  aside?: ReactNode;
  /** Section navigation, member mode only. */
  nav?: ReactNode;
  /** Under the stage in guest mode. */
  footnote?: ReactNode;
  children: ReactNode;
  width?: "default" | "wide";
}) {
  const art: SceneArt = SCENES[scene];
  const guest = mode === "guest";
  // The guest title shrinks with its column so its longest word always fits ("notifications").
  const longest = Math.max(...title.flatMap((line) => line.split(/\s+/)).map((word) => word.length));
  return (
    <Page tone="yellow" className={styles.page}>
      <div
        className={cx(styles.frame, styles[mode], width === "wide" && styles.wide)}
        style={{ "--longest": longest } as CSSProperties}
        data-account-mode={mode}
      >
        <div className={styles.backdrop} aria-hidden="true">
          <div className={styles.art}>
            <Image
              src={art.background}
              alt=""
              fill
              sizes="100vw"
              quality={75}
              preload
              className={styles.artImage}
              style={art.position ? { objectPosition: art.position } : undefined}
            />
            <div className={styles.watermark}>{art.watermark}</div>
            {guest
              ? art.characters.map((character) => (
                  <div
                    key={character.src}
                    className={cx(styles.character, styles[character.side])}
                    style={
                      { "--ratio": `${character.width} / ${character.height}`, "--inverse": character.height / character.width } as CSSProperties
                    }
                  >
                    <GlitchFrame>
                      <Image src={character.src} alt="" width={character.width} height={character.height} quality={90} draggable={false} />
                    </GlitchFrame>
                  </div>
                ))
              : null}
          </div>
        </div>

        <header className={styles.intro}>
          <div className={styles.copy}>
            <Eyebrow>{eyebrow}</Eyebrow>
            <Display as="h1" size="lg" lines={title} accent={accent ?? [title.length - 1]} glitch className={styles.title} />
            {lead ? <Lead className={styles.lead}>{lead}</Lead> : null}
            {actions && mode === "member" ? <div className={styles.introActions}>{actions}</div> : null}
          </div>
          {aside && mode === "member" ? <div className={styles.aside}>{aside}</div> : null}
        </header>

        {mode === "member" ? <div className={styles.nav}>{nav}</div> : null}

        <div className={styles.content}>{children}</div>
        {/* After the stage in the tree; on wide screens it sits under the title, beside the form. */}
        {guest && footnote ? <div className={styles.footnote}>{footnote}</div> : null}
      </div>
    </Page>
  );
}
