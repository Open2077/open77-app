import Image from "next/image";
import type { CSSProperties, ReactNode } from "react";

import { cx } from "@/components/ui/cx";
import { GlitchFrame } from "@/components/ui/glitch-frame";
import { Display, Eyebrow, Lead } from "@/components/ui/typography";

import styles from "./product-hero.module.css";

export type HeroFigure = {
  src: string;
  width: number;
  height: number;
  /** `character` stands on the hero floor; `object` (the server rack) floats in the art. */
  kind?: "character" | "object";
};

/**
 * The top of a product page, in the language of the home hero: key art faded
 * into the page, a render on the right with the WebGL hover glitch, a display
 * title with the RGB split, and the page's first action in the copy column.
 * `strip` sits along the bottom edge (the at-a-glance facts).
 */
export function ProductHero({
  eyebrow,
  title,
  accent = [],
  lead,
  children,
  art,
  backdrop,
  figure,
  strip,
  titleId,
  watermark,
  wide = false,
  titleSize = "xl",
  className,
}: {
  eyebrow: ReactNode;
  /** One entry per line. */
  title: string[];
  accent?: number[];
  lead?: ReactNode;
  /** Actions, notes, the release card: everything under the lead. */
  children?: ReactNode;
  /** Key art, faded into the page. */
  art?: { src: string; position?: string };
  /** A live background in place of `art` (the NCWE trailer). It owns its own accessibility. */
  backdrop?: ReactNode;
  figure?: HeroFigure;
  strip?: ReactNode;
  titleId?: string;
  /** A giant outlined word behind the copy ("404"). */
  watermark?: string;
  /** No render on the right: let the copy column run wider. */
  wide?: boolean;
  /** `lg` (the status page size) for utility pages such as the 404; `xl` for product landings. */
  titleSize?: "xl" | "lg";
  className?: string;
}) {
  return (
    <section className={cx(styles.hero, figure?.kind === "object" && styles.withObject, wide && styles.wide, !figure && styles.bare, className)} aria-labelledby={titleId}>
      {backdrop ? (
        <div className={styles.art}>{backdrop}</div>
      ) : art ? (
        <div className={styles.art} aria-hidden="true">
          <Image
            src={art.src}
            alt=""
            fill
            sizes="100vw"
            quality={75}
            preload
            style={art.position ? { objectPosition: art.position } : undefined}
          />
        </div>
      ) : null}
      {watermark ? (
        <div className={styles.watermark} aria-hidden="true">
          {watermark}
        </div>
      ) : null}
      {figure ? (
        <div
          className={cx(styles.figure, figure.kind === "object" ? styles.object : styles.character)}
          style={{ aspectRatio: `${figure.width} / ${figure.height}`, "--figure-ratio": figure.width / figure.height } as CSSProperties}
          aria-hidden="true"
        >
          <GlitchFrame>
            <Image
              src={figure.src}
              alt=""
              width={figure.width}
              height={figure.height}
              sizes="(max-width: 1084px) 80vw, 45vw"
              quality={100}
              preload
              draggable={false}
            />
          </GlitchFrame>
        </div>
      ) : null}
      <div className={styles.inner}>
        <div className={styles.copy}>
          <Eyebrow>{eyebrow}</Eyebrow>
          <Display as="h1" id={titleId} size={titleSize} lines={title} accent={accent} glitch className={cx(styles.title, titleSize === "lg" && styles.titleLg)} />
          {lead ? <Lead className={styles.lead}>{lead}</Lead> : null}
          {children}
        </div>
      </div>
      {strip ? <div className={styles.strip}>{strip}</div> : null}
    </section>
  );
}
