export type PendingGitHubConnection = { state: string; accountId: string; verifier: string; expiresAtUtc: string };
const safeToken = /^[a-zA-Z0-9_-]{43}$/;
const base64url = (bytes: Uint8Array) => btoa(String.fromCharCode(...bytes)).replaceAll("+", "-").replaceAll("/", "_").replaceAll("=", "");
export async function githubPkce() {
  const verifier = base64url(crypto.getRandomValues(new Uint8Array(32)));
  const challenge = base64url(new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(verifier))));
  return { verifier, challenge };
}
export function githubConnectionKey(state: string) {
  if (!safeToken.test(state)) throw new Error("Invalid GitHub callback state. Start a new connection.");
  return `open77.github.connection.${state}`;
}
export function readPendingGitHubConnection(value: string | null, state: string, accountId: string, now = Date.now()): PendingGitHubConnection {
  if (!value || value.length > 2000) throw new Error("This tab has no pending GitHub connection. Start again from your account.");
  let pending: PendingGitHubConnection;
  try { pending = JSON.parse(value) as PendingGitHubConnection; } catch { throw new Error("The pending GitHub connection is invalid. Start again."); }
  if (!pending || pending.state !== state || !safeToken.test(pending.state) || !safeToken.test(pending.verifier ?? "") ||
      pending.accountId !== accountId || !Number.isFinite(Date.parse(pending.expiresAtUtc)) ||
      Date.parse(pending.expiresAtUtc) <= now || Date.parse(pending.expiresAtUtc) > now + 15 * 60000)
    throw new Error("This GitHub connection expired or belongs to a different Open77 account. Sign in with the original account or start again.");
  return pending;
}
