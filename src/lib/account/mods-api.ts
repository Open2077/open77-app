/**
 * Browser client for the master's mod-attestation API — the data layer behind
 * /admin/mods and /admin/mods/requests.
 *
 * Same transport and error contract as api.ts and admin-api.ts: every route
 * here is an administrator route, carries the session as a bearer token, and
 * answers 403 `admin_required` otherwise.
 *
 * WHAT THE TABLE IS. Server owners host mod bytes themselves; the platform
 * never serves a mod file. What the master holds is a table keyed by SHA-256
 * saying what *we* concluded about those bytes — nothing more.
 *
 * TWO AXES, DELIBERATELY SEPARATE. `safety` is "we read these bytes and they
 * are what they claim"; `redistribution` is "the author permits a server to
 * hand this to players". A mod can pass the first and fail the second, and
 * that combination is common. They are separate fields here, separate columns
 * in the panels, and must never be merged into one status: conflating them is
 * how a whitelist quietly becomes a licensing claim we cannot support.
 *
 * PROVENANCE OF THESE SHAPES. The master routes are being written in parallel
 * (plan phase 3); at the time this module was authored none of them existed to
 * probe. Every type below is therefore an *assumption* modelled on the shapes
 * the neighbouring admin endpoints already use — bare arrays for lists,
 * camelCase fields, `…AtUtc` ISO timestamps, `{code, message}` errors. Where
 * the master ends up disagreeing, this file is the single place to correct.
 */

import { masterCall } from "./api";

/** Lowercase 64-hex SHA-256, the primary key of the whitelist. */
const SHA256_PATTERN = /^[0-9a-f]{64}$/;

/** True for a canonical lowercase 64-hex digest. Whitespace is the caller's problem. */
export function isSha256(value: string): boolean {
  return SHA256_PATTERN.test(value);
}

/** Normalises operator input (spaces, casing, a stray `sha256:` prefix) to the key form. */
export function normalizeSha256(value: string): string {
  return value.trim().replace(/^sha-?256[:=]?/i, "").replace(/\s+/g, "").toLowerCase();
}

/**
 * Axis one — the bytes. `verified` means a reviewer read them and they are what
 * they claim; `blocked` means they must never be installed. The absence of a
 * row is the third answer, "unknown", and is the overwhelmingly common one:
 * there is no `unknown` member here because an unknown hash has no row.
 */
export type ModSafety = "verified" | "blocked";

/**
 * Axis two — the licence. `granted` means the author permits a server to hand
 * the file to players; `refused` means they do not, and the launcher routes
 * players to fetch it themselves from the author's page instead of accepting a
 * server-hosted copy. `unknown` is a real, recordable state: most authors have
 * simply never said.
 */
export type ModRedistribution = "granted" | "unknown" | "refused";

/** What the importer concluded the package contains. Drives the capability cap. */
export type ModContentClass = "inert" | "executable";

/** One row of the whitelist: a verdict about one exact set of bytes. */
export type ModAttestation = {
  /** Lowercase 64-hex SHA-256 of the package. The primary key. */
  sha256: string;
  displayName: string;
  author: string | null;
  /** The author's own page (Nexus, GitHub…). Operator-supplied: never trusted. */
  sourceUrl: string | null;
  safety: ModSafety;
  redistribution: ModRedistribution;
  /** What the importer classified the contents as, when the master knows it. */
  contentClass: ModContentClass | null;
  reviewerAccountId: string | null;
  reviewerEmail: string | null;
  reviewedAtUtc: string;
  /** Free-text reviewer note; shown to operators, not to players. */
  note: string | null;
  /**
   * Set when the entry was revoked. Revocation also flips `safety` to
   * `blocked`, so the verdict and the audit trail stay in one row.
   */
  revokedAtUtc: string | null;
  revokedByEmail: string | null;
  revokedReason: string | null;
};

/** Fields an operator supplies when whitelisting a hash by hand. */
export type ModAttestationInput = {
  sha256: string;
  displayName: string;
  author?: string;
  sourceUrl?: string;
  safety: ModSafety;
  redistribution: ModRedistribution;
  note?: string;
};

export type ModReviewStatus = "pending" | "approved" | "declined";

/** One owner-submitted request to review a hash they are already hosting. */
export type ModReviewRequest = {
  requestId: string;
  sha256: string;
  displayName: string;
  author: string | null;
  sourceUrl: string | null;
  /** The importer's verdict on the contents — `executable` is the sharp case. */
  contentClass: ModContentClass;
  /** Which server asked. `serverName` may be absent for a delisted server. */
  serverId: string;
  serverName: string | null;
  requestedByAccountId: string | null;
  requestedByEmail: string | null;
  requestedAtUtc: string;
  sizeBytes: number | null;
  fileCount: number | null;
  status: ModReviewStatus;
  decidedAtUtc: string | null;
  decidedByEmail: string | null;
  /** Why it was declined. The owner reads this back in their Warden panel. */
  declineReason: string | null;
};

/**
 * The reviewer's decision on a queued request. Approving writes an attestation,
 * so it carries the redistribution answer: approval says the bytes are safe and
 * cannot, on its own, say anything about the licence.
 */
export type ModApprovalInput = {
  redistribution: ModRedistribution;
  /** Corrected metadata, when the submitted name or author is wrong. */
  displayName?: string;
  author?: string;
  note?: string;
};

/** The whitelist, newest verdict first. `query` matches display name or hash. */
export function modAttestations(
  token: string,
  options: { query?: string; limit?: number } = {},
): Promise<ModAttestation[]> {
  const params = new URLSearchParams({ limit: String(options.limit ?? 100) });
  if (options.query) params.set("query", options.query);
  return masterCall(`/api/v1/admin/mods/attestations?${params}`, { token });
}

/** Whitelists one hash. Returns the stored row, so the table can redraw without a refetch. */
/** What POST /admin/mods/attestations echoes back — the decision, not the row. */
export type ModAttestationAck = Pick<ModAttestation, "sha256" | "safety" | "redistribution">;

export function createModAttestation(
  token: string,
  input: ModAttestationInput,
): Promise<ModAttestationAck> {
  // A minimal acknowledgement, NOT the stored row: the master echoes back only the
  // three fields it decided. Anything else the caller wants to show, it already has
  // — it just submitted it.
  return masterCall("/api/v1/admin/mods/attestations", { method: "POST", token, body: input });
}

/**
 * Revokes a verdict: the row flips to `safety: "blocked"` and every launcher
 * learns on its next attest call. No launcher release is involved — that is the
 * whole point of keeping the whitelist as data.
 */
export function revokeModAttestation(
  token: string,
  sha256: string,
  reason: string,
): Promise<void> {
  // 204 No Content — masterCall yields undefined, so callers must refetch rather
  // than splice a returned row into the table.
  return masterCall(`/api/v1/admin/mods/attestations/${encodeURIComponent(sha256)}/revoke`, {
    method: "POST",
    token,
    body: { reason },
  });
}

/** The owner-submitted queue, oldest request first so the backlog drains in order. */
export function modReviewRequests(
  token: string,
  options: { status?: ModReviewStatus; limit?: number } = {},
): Promise<ModReviewRequest[]> {
  const params = new URLSearchParams({ limit: String(options.limit ?? 100) });
  if (options.status) params.set("status", options.status);
  return masterCall(`/api/v1/admin/mods/review-requests?${params}`, { token });
}

/** Approves a request. Writes the attestation and returns both halves of the result. */
export function approveModReviewRequest(
  token: string,
  requestId: string,
  input: ModApprovalInput,
): Promise<{ request: ModReviewRequest; attestation: ModAttestation }> {
  return masterCall(`/api/v1/admin/mods/review-requests/${encodeURIComponent(requestId)}/approve`, {
    method: "POST",
    token,
    body: input,
  });
}

/** Declines a request. The reason is shown to the owner in their Warden panel. */
export function declineModReviewRequest(
  token: string,
  requestId: string,
  reason: string,
): Promise<ModReviewRequest> {
  return masterCall(`/api/v1/admin/mods/review-requests/${encodeURIComponent(requestId)}/decline`, {
    method: "POST",
    token,
    body: { reason },
  });
}
