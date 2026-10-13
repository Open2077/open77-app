import Image from "next/image";
import type { ReactNode } from "react";

import { cx } from "@/components/ui/cx";
import { Breadcrumbs } from "@/components/ui/data";
import { GlitchFrame } from "@/components/ui/glitch-frame";
import { Lead } from "@/components/ui/typography";

import styles from "./workshop-hero.module.css";

/**
 * Display titles render one span per line with no whitespace between them, so
 * "Find your" + "next idea" reads "Find yournext idea" to search engines and
 * assistive tech. A trailing space on every line but the last keeps the words apart.
 */
export function spaced(lines: string[]): string[] {
  return lines.map((line, index) => (index < lines.length - 1 ? `${line} ` : line));
}

type Art = {
  src: string;
  alt?: string;
  position?: string;
  /** A creation's media from the asset origin: never through the optimizer, shown as a blurred wash. */
  remote?: boolean;
};

/**
 * The top of a Workshop page, in the language of the home scenes: key art under
 * the header, an optional character cut-out with the hover glitch, a giant
 * outlined watermark, and the title block. Pages pass their own title so long
 * creation names can pick a safe size.
 */
export function WorkshopHero({
  title,
  eyebrow,
  lead,
  crumbs,
  actions,
  aside,
  art,
  character,
  cover,
  watermark,
  strip,
  size = "default",
  flush = false,
  className,
  children,
}: {
  title: ReactNode;
  eyebrow?: ReactNode;
  lead?: ReactNode;
  crumbs?: Array<{ label: string; href?: string }>;
  actions?: ReactNode;
  aside?: ReactNode;
  art?: Art;
  character?: { src: string; width: number; height: number };
  /** A creation's own picture, framed as a slanted key-art panel on the right (wide screens). */
  cover?: { src: string; alt?: string };
  watermark?: string;
  /** A band along the bottom edge, over the art (the home's trending resources). */
  strip?: ReactNode;
  size?: "full" | "default" | "compact";
  /** No bottom hairline: the page continues with its own rule (tabs). */
  flush?: boolean;
  className?: string;
  children?: ReactNode;
}) {
  return (
    <section className={cx(styles.hero, styles[size], flush && styles.flush, strip ? styles.withStrip : undefined, className)}>
      {art ? (
        <div className={cx(styles.art, art.remote && styles.blurred)} aria-hidden="true">
          {art.remote ? (
            <Image unoptimized src={art.src} alt="" fill sizes="100vw" loading="eager" referrerPolicy="no-referrer" />
          ) : (
            <Image
              src={art.src}
              alt={art.alt ?? ""}
              fill
              sizes="100vw"
              quality={75}
              preload={size === "full"}
              loading={size === "full" ? undefined : "eager"}
              style={art.position ? { objectPosition: art.position } : undefined}
            />
          )}
        </div>
      ) : null}
      {character ? (
        <div className={styles.character} aria-hidden="true">
          <GlitchFrame>
            <Image src={character.src} alt="" width={character.width} height={character.height} quality={75} draggable={false} />
          </GlitchFrame>
        </div>
      ) : null}
      {cover ? (
        <div className={styles.cover} aria-hidden="true">
          <Image unoptimized src={cover.src} alt="" width={960} height={540} loading="eager" referrerPolicy="no-referrer" />
        </div>
      ) : null}
      {watermark ? (
        <div className={styles.watermark} aria-hidden="true">
          {watermark}
        </div>
      ) : null}
      <div className={styles.inner}>
        {crumbs ? <Breadcrumbs className={styles.crumbs} items={crumbs} /> : null}
        <div className={styles.row}>
          <div className={styles.copy}>
            {eyebrow}
            {title}
            {lead ? <Lead className={styles.lead}>{lead}</Lead> : null}
            {children}
            {actions ? <div className={styles.actions}>{actions}</div> : null}
          </div>
          {aside ? <div className={styles.aside}>{aside}</div> : null}
        </div>
      </div>
      {strip ? <div className={styles.strip}>{strip}</div> : null}
    </section>
  );
}
