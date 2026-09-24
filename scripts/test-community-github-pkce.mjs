import test from "node:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { githubPkce, githubConnectionKey, readPendingGitHubConnection } from "../src/lib/community/github-pkce.ts";

test("browser PKCE uses fresh S256 challenges and URL-safe entropy", async () => {
  const first = await githubPkce();
  const second = await githubPkce();
  assert.match(first.verifier, /^[a-zA-Z0-9_-]{43}$/);
  assert.notEqual(first.verifier, second.verifier);
  assert.equal(first.challenge, createHash("sha256").update(first.verifier).digest("base64url"));
});

test("pending callbacks bind state, tab, account and expiration", () => {
  const now = Date.now();
  const pending = { state: "s".repeat(43), verifier: "v".repeat(43), accountId: "account-a", expiresAtUtc: new Date(now + 600000).toISOString() };
  assert.deepEqual(readPendingGitHubConnection(JSON.stringify(pending), pending.state, "account-a", now), pending);
  assert.throws(() => readPendingGitHubConnection(JSON.stringify(pending), pending.state, "account-b", now));
  assert.throws(() => readPendingGitHubConnection(JSON.stringify(pending), "x".repeat(43), "account-a", now));
  assert.throws(() => readPendingGitHubConnection(JSON.stringify(pending), pending.state, "account-a", now + 600001));
  assert.throws(() => readPendingGitHubConnection(JSON.stringify(pending), pending.state, "account-a", now - 900001));
  assert.throws(() => readPendingGitHubConnection(null, pending.state, "account-a", now));
});

test("malformed callback storage cannot become a key or verifier", () => {
  assert.throws(() => githubConnectionKey("../account"));
  for (const value of ["null", "{}", "[]", "not-json", "x".repeat(2001)])
    assert.throws(() => readPendingGitHubConnection(value, "s".repeat(43), "account-a"));
  assert.equal(githubConnectionKey("s".repeat(43)), "open77.github.connection." + "s".repeat(43));
});
