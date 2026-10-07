/**
 * Browser client for the NCWE closed beta on the master: applying from /ncwe
 * (session required) and reviewing from /admin/ncwe-beta (administrators).
 * Same transport and error contract as api.ts.
 */

import { masterCall } from "./api";

export type NcweAvailability = "lt2" | "2to5" | "5to10" | "10plus";
export type NcweBetaStatusValue = "pending" | "approved" | "rejected";

export const NCWE_AVAILABILITY: ReadonlyArray<readonly [NcweAvailability, string]> = [
  ["lt2", "Less than 2 hours a week"],
  ["2to5", "2 to 5 hours a week"],
  ["5to10", "5 to 10 hours a week"],
  ["10plus", "More than 10 hours a week"],
];

/** Lengths the master enforces (NcweBetaRules). */
export const NCWE_LIMITS = { motivation: 40, plans: 20, experience: 10, answerMax: 2000, noteMax: 500, portfolioMax: 300 } as const;

export type NcweDiscordProfile = {
  userId: string;
  username: string;
  displayName: string | null;
  avatarUrl: string | null;
  joinedServerAtUtc: string | null;
};

export type NcweBetaApplication = {
  accountId: string;
  discord: NcweDiscordProfile;
  motivation: string;
  plans: string;
  experience: string;
  availability: NcweAvailability;
  portfolioUrl: string | null;
  status: NcweBetaStatusValue;
  revision: number;
  createdAtUtc: string;
  updatedAtUtc: string;
  decidedAtUtc: string | null;
  decisionNote: string | null;
};

export type NcweBetaState = {
  open: boolean;
  discordReady: boolean;
  discordInviteUrl: string;
  emailVerified: boolean;
  application: NcweBetaApplication | null;
};

/** The Discord account an applicant typed, as the bot sees it on the Open//77 server. */
export type NcweDiscordLookup = {
  userId: string;
  username: string;
  displayName: string | null;
  avatarUrl: string;
  joinedServerAtUtc: string | null;
  accountCreatedAtUtc: string;
};

export type NcweBetaAnswers = {
  discordUserId: string;
  motivation: string;
  plans: string;
  experience: string;
  availability: NcweAvailability;
  portfolioUrl: string;
  acceptRules: boolean;
};

export function ncweBetaState(token: string, signal?: AbortSignal): Promise<NcweBetaState> {
  return masterCall("/api/v1/ncwe/beta", { token, signal });
}

export function lookupNcweDiscord(token: string, discordUserId: string): Promise<NcweDiscordLookup> {
  return masterCall("/api/v1/ncwe/beta/discord", { method: "POST", token, body: { discordUserId } });
}

export function submitNcweApplication(token: string, answers: NcweBetaAnswers): Promise<NcweBetaApplication> {
  return masterCall("/api/v1/ncwe/beta/application", {
    method: "PUT",
    token,
    body: { ...answers, portfolioUrl: answers.portfolioUrl.trim() || null },
  });
}

export function withdrawNcweApplication(token: string): Promise<void> {
  return masterCall("/api/v1/ncwe/beta/application", { method: "DELETE", token });
}

// ── Review (administrators) ────────────────────────────────────────────────

export type NcweDiscordState = "done" | "failed" | "skipped";

export type AdminNcweBetaRow = {
  application: NcweBetaApplication;
  email: string;
  emailVerified: boolean;
  displayName: string;
  role: string;
  accountStatus: string;
  accountCreatedAtUtc: string;
  decidedBy: string | null;
  decidedByName: string | null;
  discordState: NcweDiscordState | null;
  discordError: string | null;
  discordDoneAtUtc: string | null;
};

export type AdminNcweBetaPage = {
  page: number;
  pageSize: number;
  total: number;
  pending: number;
  approved: number;
  rejected: number;
  items: AdminNcweBetaRow[];
};

export type AdminNcweBetaDecision = {
  row: AdminNcweBetaRow;
  discordState: NcweDiscordState | null;
  discordError: string | null;
};

export function adminNcweBeta(token: string, status: NcweBetaStatusValue | undefined, query: string, page: number): Promise<AdminNcweBetaPage> {
  const params = new URLSearchParams({ page: String(page), pageSize: "20" });
  if (status) params.set("status", status);
  if (query) params.set("query", query);
  return masterCall(`/api/v1/admin/ncwe-beta?${params}`, { token });
}

/** approve gives the Discord role and (unless announce is false) welcomes the member; reject takes an approved role back. */
export function decideNcweBeta(
  token: string,
  accountId: string,
  decision: "approve" | "reject" | "reopen",
  input: { revision: number; note?: string; announce?: boolean },
): Promise<AdminNcweBetaDecision> {
  return masterCall(`/api/v1/admin/ncwe-beta/${accountId}/${decision}`, {
    method: "POST",
    token,
    body: { revision: input.revision, note: input.note?.trim() || null, announce: input.announce ?? true },
  });
}

/** Gives the role and the welcome again after a Discord failure. */
export function retryNcweDiscord(token: string, accountId: string, announce = true): Promise<AdminNcweBetaDecision> {
  return masterCall(`/api/v1/admin/ncwe-beta/${accountId}/discord`, { method: "POST", token, body: { announce } });
}
