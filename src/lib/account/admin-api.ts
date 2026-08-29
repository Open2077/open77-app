/**
 * Browser client for the master's admin API — the operations console's data
 * layer. Same transport and error contract as api.ts; every route requires an
 * administrator session and answers 403 `admin_required` otherwise, which is
 * the real enforcement behind the panel's client-side gate.
 */

import { masterCall } from "./api";

export type AdminOverview = {
  usersTotal: number;
  serversActive: number;
  playersOnline: number;
  licensesActive: number;
  bansActive: number;
};

export type AdminServer = {
  serverId: string;
  name: string;
  connectEndpoint: string;
  connectedPlayers: number;
  maximumPlayers: number;
  lastHeartbeatUtc: string;
  licenseId?: string | null;
  licenseLabel?: string | null;
  ownerAccountId?: string | null;
  ownerEmail?: string | null;
};

export type AdminUser = {
  accountId: string;
  email: string;
  displayName: string;
  role: string;
  status: string;
  emailVerified: boolean;
  createdAtUtc: string;
};

export type AdminLicense = {
  licenseId: string;
  label: string;
  keyHint: string;
  ownerAccountId: string;
  ownerEmail: string;
  createdAtUtc: string;
  revokedAtUtc: string | null;
};

export type AdminAuditEntry = {
  id: number;
  atUtc: string;
  actorAccountId?: string | null;
  action: string;
  subject?: string | null;
  detailsJson?: string | null;
};

export type BuildKind = "client" | "server" | "launcher";
export type BuildStatus = "active" | "deprecated" | "revoked";

export type AuthorizedBuild = {
  buildId: string;
  kind: BuildKind;
  version: string;
  sha256: string;
  gameBuild: number | null;
  status: BuildStatus;
  releasedAtUtc: string;
  notes: string | null;
};

export type Enforcement = {
  rejectRevokedBuilds: boolean;
  rejectUnknownClientBuilds: boolean;
  rejectUnknownServerBuilds: boolean;
  requiredGameBuild: string;
  requiredGameSha256: string;
  /** Public CDN root, e.g. "https://cdn.open2077.net". */
  cdnBaseUrl: string;
  /** Mod CDN base, e.g. "https://cdn.open2077.net/mod". */
  modCdnBaseUrl: string;
};

export type ModManifestSummary = {
  version: string;
  issuedAtMs: number;
  fileCount: number;
  requiredGameBuild: string;
  baseUrl: string;
  /** True for the manifest currently served at GET /api/v1/mod/manifest. */
  current: boolean;
};

/**
 * One account as the closed-alpha whitelist lists it.
 *
 * `alphaAccess` is the *effective* answer the connect-ticket path enforces;
 * `alphaAccessImplicit` says it comes from `role = "admin"` rather than from a
 * grant, which is why an administrator legitimately shows access with no
 * granter and no timestamp. The two are not exclusive — an administrator who
 * was also granted explicitly carries both, and that explicit grant is what
 * survives a later demotion.
 */
export type AlphaAccessRow = {
  accountId: string;
  email: string;
  displayName: string;
  role: string;
  status: string;
  emailVerified: boolean;
  alphaAccess: boolean;
  alphaAccessImplicit: boolean;
  grantedAtUtc: string | null;
  grantedByAccountId: string | null;
  grantedByEmail: string | null;
  createdAtUtc: string;
};

/** A page of the whitelist. `alphaAccessRequired` mirrors GET /enforcement. */
export type AlphaAccessPage = {
  /** False when the gate is off: grants are recorded but decide nothing today. */
  alphaAccessRequired: boolean;
  page: number;
  pageSize: number;
  total: number;
  items: AlphaAccessRow[];
};

export type BanScope = "global" | "server";
export type BanSubjectKind = "account" | "identity" | "identity_key" | "license";

export type AdminBan = {
  banId: string;
  scope: BanScope;
  serverId?: string | null;
  subjectKind: BanSubjectKind;
  subjectValue: string;
  reason: string;
  issuedByAccountId?: string | null;
  issuedAtUtc: string;
  expiresAtUtc?: string | null;
  liftedAtUtc?: string | null;
};

export function overview(token: string): Promise<AdminOverview> {
  return masterCall("/api/v1/admin/overview", { token });
}

export function servers(token: string): Promise<AdminServer[]> {
  return masterCall("/api/v1/admin/servers", { token });
}

export function users(token: string, query: string, limit = 50): Promise<AdminUser[]> {
  const params = new URLSearchParams({ limit: String(limit) });
  if (query) params.set("query", query);
  return masterCall(`/api/v1/admin/users?${params}`, { token });
}

export function suspendUser(token: string, accountId: string): Promise<void> {
  return masterCall(`/api/v1/admin/users/${accountId}/suspend`, { method: "POST", token });
}

export function reinstateUser(token: string, accountId: string): Promise<void> {
  return masterCall(`/api/v1/admin/users/${accountId}/reinstate`, { method: "POST", token });
}

export function licenses(token: string, query: string, limit = 50): Promise<AdminLicense[]> {
  const params = new URLSearchParams({ limit: String(limit) });
  if (query) params.set("query", query);
  return masterCall(`/api/v1/admin/licenses?${params}`, { token });
}

export function revokeLicense(
  token: string,
  licenseId: string,
): Promise<{ licenseId: string; serversRevoked: number }> {
  return masterCall(`/api/v1/admin/licenses/${licenseId}/revoke`, { method: "POST", token });
}

/**
 * A page of the closed-alpha whitelist, newest account first. `query` matches
 * e-mail, display name or an exact account ID; `granted` filters on effective
 * access, so administrators count as granted.
 */
export function alphaAccess(
  token: string,
  options: { query?: string; granted?: boolean; page?: number; pageSize?: number } = {},
): Promise<AlphaAccessPage> {
  const params = new URLSearchParams();
  if (options.query) params.set("query", options.query);
  if (options.granted !== undefined) params.set("granted", String(options.granted));
  if (options.page !== undefined) params.set("page", String(options.page));
  if (options.pageSize !== undefined) params.set("pageSize", String(options.pageSize));
  const search = params.toString();
  const suffix = search ? `?${search}` : "";
  return masterCall(`/api/v1/admin/alpha-access${suffix}`, { token });
}

/**
 * Grants alpha access. Idempotent — re-granting answers 200 and keeps the
 * original granter and timestamp. Returns the resulting row, so one line can be
 * redrawn without refetching the page.
 */
export function grantAlphaAccess(token: string, accountId: string): Promise<AlphaAccessRow> {
  return masterCall(`/api/v1/admin/alpha-access/${accountId}/grant`, { method: "POST", token });
}

/** Revokes the explicit grant. Also idempotent, and also returns the row. */
export function revokeAlphaAccess(token: string, accountId: string): Promise<AlphaAccessRow> {
  return masterCall(`/api/v1/admin/alpha-access/${accountId}/revoke`, { method: "POST", token });
}

/** The anti-crack allowlist: every registered build, newest first. */
export function builds(token: string, kind?: BuildKind, limit = 100): Promise<AuthorizedBuild[]> {
  const params = new URLSearchParams({ limit: String(limit) });
  if (kind) params.set("kind", kind);
  return masterCall(`/api/v1/admin/builds?${params}`, { token });
}

/** Flip a build between active / deprecated / revoked. Revoking a client build is the kill switch. */
export function setBuildStatus(token: string, buildId: string, status: BuildStatus): Promise<void> {
  return masterCall(`/api/v1/admin/builds/${buildId}/status`, {
    method: "POST",
    token,
    body: { status },
  });
}

/** The master's current build-registry enforcement posture and CDN roots. */
export function enforcement(token: string): Promise<Enforcement> {
  return masterCall("/api/v1/admin/enforcement", { token });
}

/** Every published mod manifest (the rollback candidates), newest first, live one flagged. */
export function modManifests(token: string): Promise<ModManifestSummary[]> {
  return masterCall("/api/v1/admin/mod/manifests", { token });
}

/** Re-publish a prior mod manifest as the live one. Returns the re-served signed JSON. */
export function rollbackMod(token: string, version: string): Promise<unknown> {
  return masterCall("/api/v1/admin/mod/rollback", {
    method: "POST",
    token,
    body: { version },
  });
}

export function audit(
  token: string,
  options: { limit?: number; beforeId?: number } = {},
): Promise<AdminAuditEntry[]> {
  const params = new URLSearchParams({ limit: String(options.limit ?? 30) });
  if (options.beforeId !== undefined) params.set("beforeId", String(options.beforeId));
  return masterCall(`/api/v1/admin/audit?${params}`, { token });
}

export function bans(
  token: string,
  options: { includeLifted?: boolean; limit?: number } = {},
): Promise<AdminBan[]> {
  const params = new URLSearchParams({ limit: String(options.limit ?? 50) });
  if (options.includeLifted) params.set("includeLifted", "true");
  return masterCall(`/api/v1/admin/bans?${params}`, { token });
}

export function createBan(
  token: string,
  input: {
    scope: BanScope;
    serverId?: string;
    subjectKind: BanSubjectKind;
    subjectValue: string;
    reason: string;
    expiresAtUtc?: string;
  },
): Promise<{ banId: string }> {
  return masterCall("/api/v1/admin/bans", { method: "POST", token, body: input });
}

export function liftBan(token: string, banId: string): Promise<void> {
  return masterCall(`/api/v1/admin/bans/${banId}/lift`, { method: "POST", token });
}
