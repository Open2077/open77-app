import { cx } from "./cx";

import styles from "./icon.module.css";

/**
 * An inline stroke glyph, sized by the surrounding font size (1em) unless
 * `size` says otherwise. Pass a body from `./icons` (`<Icon glyph={search01} />`)
 * or any 24×24 SVG body of the same stroke style.
 *
 * Decorative by default; give it a `label` when the icon is the only content
 * of a control that has no other accessible name.
 */
export function Icon({
  glyph,
  className,
  size,
  label,
}: {
  glyph: string;
  className?: string;
  size?: number | string;
  label?: string;
}) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      className={cx("iconify iconify--hugeicons", styles.icon, className)}
      width={size ?? "1em"}
      height={size ?? "1em"}
      viewBox="0 0 24 24"
      {...(label ? { role: "img", "aria-label": label } : { "aria-hidden": true })}
      dangerouslySetInnerHTML={{ __html: glyph }}
    />
  );
}
