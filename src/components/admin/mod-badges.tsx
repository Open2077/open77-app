import { Icon } from "@/components/ui/icon";
import { arrowUpRight01 } from "@/components/ui/icons";
import type { ModContentClass, ModRedistribution, ModSafety } from "@/lib/account/mods-api";
import { Mono, StatusTag } from "./admin-kit";
import { hostOf, safeHttpUrl } from "./format";

import styles from "./mod-badges.module.css";

/**
 * The two verdict axes, rendered so they can never be mistaken for one another.
 *
 * Safety is a slanted tag, the same shape every other admin table uses for a
 * platform state. Redistribution is an upright, bar-marked mono token — a
 * different *shape*, not merely a different colour, because a reader scanning
 * the table has to see at a glance that "verified" and "granted" are answers to
 * two different questions. Merging them into a single status column is
 * precisely the mistake that turns a safety whitelist into a licensing claim.
 */

/** The bytes axis. `null` is a real answer — an unknown hash simply has no row. */
export function SafetyChip({ safety }: { safety: ModSafety | null }) {
  if (safety === null) return <StatusTag status="neutral">unknown</StatusTag>;
  return <StatusTag status={safety === "verified" ? "ok" : "danger"}>{safety}</StatusTag>;
}

/** Human wording for each licence answer, spelled out under the token. */
export const REDISTRIBUTION_NOTE: Record<ModRedistribution, string> = {
  granted: "server may host",
  unknown: "author never said",
  refused: "player fetches it",
};

/** The licence axis. Never rendered in the same shape as {@link SafetyChip}. */
export function RedistributionTag({ value }: { value: ModRedistribution }) {
  return (
    <span className={styles.perm} data-value={value}>
      {value}
    </span>
  );
}

/**
 * What the importer read inside the package. `executable` (.dll, .reds, CET
 * Lua, .asi) is the sharp case: those are refused outright while the hash is
 * unverified, so an executable request is the one that actually needs a human.
 */
export function ContentClassChip({ value }: { value: ModContentClass }) {
  return <StatusTag status={value === "executable" ? "danger" : "neutral"}>{value}</StatusTag>;
}

/**
 * The licence answers an operator can record, shared by the whitelist form and
 * the review-queue approval form so both offer exactly the same three.
 * `unknown` leads because it is the honest default: most authors never said.
 */
export const REDISTRIBUTION_OPTIONS: { value: ModRedistribution; label: string }[] = [
  { value: "unknown", label: "Unknown: the author has not said" },
  { value: "granted", label: "Granted: a server may hand this to players" },
  { value: "refused", label: "Refused: players must fetch it themselves" },
];

/** A submitted source page: a link only when it is absolute http(s), readable text otherwise. */
export function SourceCell({ url }: { url: string | null }) {
  const source = safeHttpUrl(url);
  if (source) {
    return (
      <a className={styles.source} href={source} target="_blank" rel="noreferrer noopener" title={source}>
        {hostOf(source)}
        <Icon glyph={arrowUpRight01} />
      </a>
    );
  }
  if (url) {
    // Not a link we will follow — shown as plain text so the reviewer can
    // still read what was submitted.
    return (
      <span className={styles.unsafe} title="Not an http(s) link, so it is not rendered as one">
        {url}
      </span>
    );
  }
  return <Mono tone="dim">—</Mono>;
}
