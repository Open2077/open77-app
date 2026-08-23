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
