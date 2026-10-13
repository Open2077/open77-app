import { Fragment } from "react";

import { cx } from "@/components/ui/cx";
import { Display } from "@/components/ui/typography";

import styles from "./doc-title.module.css";

/** Titles longer than this are set a size down, so they stay a few lines tall. */
const LONG_TITLE = 36;

/**
 * Splits a title into the pieces the RGB split is drawn on.
 *
 * The glitch layers keep each piece on one row (`white-space: nowrap`), so the
 * title is cut into words up front and the browser breaks between them only
 * where the column runs out. An identifier longer than `max` characters
 * (`Open77.vehicles`) breaks after its dots. Each piece knows whether a space
 * separates it from the one before.
 */
function titlePieces(title: string, max: number): Array<{ text: string; spaced: boolean }> {
  return title
    .trim()
    .split(/\s+/)
    .flatMap((word) => (word.length > max ? word.split(/(?<=\.)/) : [word]).map((text, index) => ({ text, spaced: index === 0 })));
}

/**
 * The h1 of a documentation page: Druk display words with the RGB split, sized
 * by the width of its column (a container query) so the longest word always
 * fits. The words run on together, so a title is one line whenever it fits.
 * Pieces that still cannot fit (one very long word) drop the split and wrap
 * instead of overflowing.
 */
export function DocTitle({
  title,
  max = 16,
  accentLast = false,
  verbatim = false,
  className,
  id,
}: {
  title: string;
  /** Longest unbroken piece, in characters: longer identifiers break after their dots. */
  max?: number;
  /** Draws the last word in the page tone. */
  accentLast?: boolean;
  /** Keeps the title's own case: identifiers (`Open77.vehicles`) are case-sensitive. */
  verbatim?: boolean;
  className?: string;
  id?: string;
}) {
  const pieces = titlePieces(title, max);
  return (
    <div className={cx(styles.wrap, className)}>
      <Display as="h1" size="lg" className={cx(styles.title, title.length > LONG_TITLE && styles.long, verbatim && styles.verbatim)} id={id}>
        {pieces.map((piece, index) => (
          <Fragment key={`${piece.text}-${index}`}>
            {/* The space keeps the heading's text (and its accessible name)
                reading as words, not "andhooks", and is where lines break. */}
            {index > 0 && piece.spaced ? " " : null}
            <span
              className={cx(styles.line, accentLast && index === pieces.length - 1 && pieces.length > 1 && styles.accent)}
              data-glitch={piece.text.length <= max ? piece.text : undefined}
            >
              {piece.text}
            </span>
          </Fragment>
        ))}
      </Display>
    </div>
  );
}
