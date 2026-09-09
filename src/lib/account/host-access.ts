import type { Account } from "./api";

/** Presentation gate only: the versioned server archives remain on a public CDN. */
export function canDownloadServer(account: Pick<Account, "role" | "alphaAccess"> | null): boolean {
  return account !== null && (account.role === "admin" || account.alphaAccess === true);
}
