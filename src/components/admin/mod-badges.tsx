import type { ModContentClass, ModRedistribution, ModSafety } from "@/lib/account/mods-api";

/**
 * The two verdict axes, rendered so they can never be mistaken for one another.
 *
 * Safety is a filled chip, the same shape every other admin table uses for a
 * platform state. Redistribution is a bar-marked mono token — a different
 * *shape*, not merely a different colour, because a reader scanning the table
 * has to see at a glance that "verified" and "granted" are answers to two
 * different questions. Merging them into a single status column is precisely
 * the mistake that turns a safety whitelist into a licensing claim.
 */

const SAFETY_CHIP: Record<ModSafety, string> = {
  verified: "adm-chip-ok",
  blocked: "adm-chip-warn",
};

/** The bytes axis. `null` is a real answer — an unknown hash simply has no row. */
export function SafetyChip({ safety }: { safety: ModSafety | null }) {
  if (safety === null) {
    return <span className="adm-chip adm-chip-dim">unknown</span>;
  }
  return <span className={`adm-chip ${SAFETY_CHIP[safety]}`}>{safety}</span>;
}

const REDISTRIBUTION_CLASS: Record<ModRedistribution, string> = {
  granted: "adm-perm-yes",
  unknown: "adm-perm-maybe",
  refused: "adm-perm-no",
};

/** Human wording for each licence answer, spelled out under the token. */
export const REDISTRIBUTION_NOTE: Record<ModRedistribution, string> = {
  granted: "server may host",
  unknown: "author never said",
  refused: "player fetches it",
};

/** The licence axis. Never rendered in the same shape as {@link SafetyChip}. */
export function RedistributionTag({ value }: { value: ModRedistribution }) {
  return <span className={`adm-perm ${REDISTRIBUTION_CLASS[value]}`}>{value}</span>;
}

/**
 * What the importer read inside the package. `executable` (.dll, .reds, CET
 * Lua, .asi) is the sharp case: those are refused outright while the hash is
 * unverified, so an executable request is the one that actually needs a human.
 */
export function ContentClassChip({ value }: { value: ModContentClass }) {
  return (
    <span className={`adm-chip ${value === "executable" ? "adm-chip-warn" : "adm-chip-dim"}`}>
      {value}
    </span>
  );
}

/**
 * The licence answers an operator can record, shared by the whitelist form and
 * the review-queue approval form so both offer exactly the same three.
 * `unknown` leads because it is the honest default: most authors never said.
 */
export const REDISTRIBUTION_OPTIONS: { value: ModRedistribution; label: string }[] = [
  { value: "unknown", label: "Unknown — the author has not said" },
  { value: "granted", label: "Granted — a server may hand this to players" },
  { value: "refused", label: "Refused — players must fetch it themselves" },
];
