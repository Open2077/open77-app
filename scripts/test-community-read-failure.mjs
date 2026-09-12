import assert from "node:assert/strict";
import { test } from "node:test";
import { hubReadFailure } from "../src/lib/community/read-failure.ts";

test("denied, removed and missing reads remain distinct and never offer retry", () => {
  const denied = hubReadFailure(403);
  const removed = hubReadFailure(410);
  const missing = hubReadFailure(404);
  assert.equal(denied.label, "ACCESS DENIED");
  assert.equal(removed.label, "CONTENT REMOVED");
  assert.equal(missing.label, "CONTENT NOT FOUND");
  for (const result of [denied, removed, missing, hubReadFailure(401)]) assert.equal(result.retry, false);
});

test("retry is reserved for network, timeout, rate limit and server failures", () => {
  for (const status of [undefined, 408, 429, 500, 502, 503, 504, 599]) assert.equal(hubReadFailure(status).retry, true, String(status));
  for (const status of [400, 402, 405, 409, 422, 451, 600]) assert.equal(hubReadFailure(status).retry, false, String(status));
  assert.match(hubReadFailure(429).description, /wait/);
});
