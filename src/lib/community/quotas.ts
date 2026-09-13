import { masterCall } from "@/lib/account/api";

export type Quotas = { draftProjectsPerAccount: number; activeUploadsPerAccount: number; pendingBytesPerAccount: number; gitHubImportsPerDay: number };
export type QuotaOverrides = { [K in keyof Quotas]: number | null };
export type AccountQuota = { accountId: string; revision: number; overrides: QuotaOverrides; effective: Quotas };
export type UploadLimits = { packageBytes: number; imageBytes: number; expandedBytes: number; archiveEntries: number; imagePixels: number; clipBytes?: number; clipSeconds?: number };
export const myQuotas = (token: string, signal: AbortSignal) => masterCall<AccountQuota>("/api/v1/community/me/quotas", { token, signal });
export const uploadLimits = (signal: AbortSignal) => masterCall<{ limits: UploadLimits }>("/api/v1/community/catalog", { signal });
export const accountQuotas = (token: string, id: string, signal: AbortSignal) => masterCall<AccountQuota>(`/api/v1/admin/community/accounts/${encodeURIComponent(id)}/quotas`, { token, signal });
export const saveAccountQuotas = (token: string, id: string, revision: number, overrides: QuotaOverrides, reason: string, signal: AbortSignal) => masterCall<AccountQuota>(`/api/v1/admin/community/accounts/${encodeURIComponent(id)}/quotas`, { token, method: "PUT", body: { revision, overrides, reason }, signal });
export const quotaFields: { key: keyof Quotas; label: string; maximum: number }[] = [
  { key: "draftProjectsPerAccount", label: "Unpublished projects", maximum: 30 },
  { key: "activeUploadsPerAccount", label: "Active uploads", maximum: 10 },
  { key: "pendingBytesPerAccount", label: "Reserved upload bytes", maximum: 1073741824 },
  { key: "gitHubImportsPerDay", label: "GitHub imports per day", maximum: 20 },
];
