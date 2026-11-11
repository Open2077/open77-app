import { masterCall, type License } from "./api";

export type UpcomingServerProfile = {
  enabled: boolean;
  name: string;
  community: string;
  languages: string[];
  opensAtUtc: string | null;
  discord: string | null;
  website: string | null;
  description: string | null;
  iconUrl: string | null;
  bannerUrl: string | null;
};
export type OwnerServer = {
  serverId: string;
  name: string;
  connectEndpoint: string | null;
  lastSeenAtUtc: string | null;
  online: boolean;
  revoked: boolean;
};
export type OwnerUpcomingRequest = {
  requestId: string;
  licenseId: string;
  submittedServerId: string;
  profile: UpcomingServerProfile;
  status: "pending" | "approved" | "rejected" | "launched";
  revision: number;
  submittedAtUtc: string;
  reviewedAtUtc: string | null;
  reason: string | null;
};
export type OwnerLicense = License & { lastServer: OwnerServer | null; upcoming: OwnerUpcomingRequest | null };
export type LicenseQuota = { active: number; createdToday: number; maximumActive: number; maximumDailyCreations: number; resetsAtUtc: string };
export type OwnerLicenseWorkspace = { licenses: OwnerLicense[]; quota: LicenseQuota };
export type UpcomingReview = {
  request: OwnerUpcomingRequest;
  ownerAccountId: string;
  ownerEmail: string;
  licenseLabel: string;
  licenseRevokedAtUtc: string | null;
  lastServer: OwnerServer | null;
};
export type UpcomingReviewPage = { items: UpcomingReview[]; total: number; page: number; pageSize: number };

export function licenseWorkspace(token: string): Promise<OwnerLicenseWorkspace> {
  return masterCall("/api/v1/accounts/licenses/workspace", { token });
}
export function submitUpcoming(token: string, licenseId: string, profile: UpcomingServerProfile, revision: number): Promise<OwnerLicenseWorkspace> {
  return masterCall(`/api/v1/accounts/licenses/${licenseId}/upcoming`, { method: "POST", token, body: { profile, revision } });
}
export function upcomingReviews(token: string, status: string, page: number): Promise<UpcomingReviewPage> {
  return masterCall(`/api/v1/admin/upcoming-requests?${new URLSearchParams({ status, page: String(page), pageSize: "25" })}`, { token });
}
export function decideUpcoming(token: string, requestId: string, approve: boolean, revision: number, reason: string): Promise<void> {
  return masterCall(`/api/v1/admin/upcoming-requests/${requestId}/decision`, { method: "POST", token, body: { approve, revision, reason: reason.trim() || null } });
}
export function completeUpcoming(token: string, requestId: string, revision: number): Promise<void> {
  return masterCall(`/api/v1/admin/upcoming-requests/${requestId}/launch`, { method: "POST", token, body: { revision } });
}
