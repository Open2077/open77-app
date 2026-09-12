import test from "node:test";
import assert from "node:assert/strict";
import { CreateAttempt } from "../src/lib/community/create-attempt.ts";
import { validCreatedProject, validCreatedRelease } from "../src/lib/community/create-response.ts";
import { parseFieldErrors } from "../src/lib/account/field-errors.ts";

test("lost create responses replay the admitted body despite newer local edits and refreshed auth", () => {
  const pending = new CreateAttempt();
  const content = { slug: "chairs", content: { title: "Chairs", tags: ["rp"] } };
  const admitted = pending.begin(content);
  content.content.title = "Newer unsaved title";
  admitted.body.content.tags.push("caller-mutation");
  for (const status of [0, 500, 502, 401, 403, 408, 429]) {
    pending.rejected(status);
    const retry = pending.begin(content);
    assert.equal(retry.requestId, admitted.requestId);
    assert.deepEqual(retry.body, { slug: "chairs", content: { title: "Chairs", tags: ["rp"] } });
  }
  pending.resolved();
  assert.notEqual(pending.begin(content).requestId, admitted.requestId);
});

test("definitive validation permits a corrected new request; pending release retains its original consent", () => {
  const pending = new CreateAttempt();
  const first = pending.begin({ version: "bad", distributionRightsConfirmed: true });
  pending.rejected(400);
  const corrected = pending.begin({ version: "1.0.0", distributionRightsConfirmed: true });
  assert.notEqual(first.requestId, corrected.requestId);
  pending.rejected(503);
  assert.deepEqual(pending.begin({ version: "2.0.0", distributionRightsConfirmed: false }), corrected);
});

test("empty and truncated success bodies cannot establish creation or clear retry identity", () => {
  const id = "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa";
  const pending = new CreateAttempt();
  const first = pending.begin({ slug: "chairs" });
  for (const body of [undefined, null, {}, { projectId: id }, { releaseId: id }]) {
    assert.equal(validCreatedProject(body, "chairs"), false);
    assert.equal(validCreatedRelease(body, id, "1.0.0"), false);
    assert.equal(pending.begin({ slug: "changed" }).requestId, first.requestId);
  }
  assert.equal(validCreatedProject({ projectId: id, slug: "chairs", revision: 1, content: { title: "Chairs", summary: "Two chairs", category: "maps", description: "Details", installation: "Guide", kind: "resource", maturity: "experimental", tags: [] } }, "chairs"), true);
  assert.equal(validCreatedRelease({ releaseId: id, projectId: id, version: "1.0.0", state: "uploading", channel: "stable" }, id, "1.0.0"), true);
  assert.equal(validCreatedRelease({ releaseId: id, projectId: "different", version: "1.0.0", state: "uploading", channel: "stable" }, id, "1.0.0"), false);
  assert.equal(validCreatedRelease({ releaseId: id, projectId: id, version: "2.0.0", state: "uploading", channel: "stable" }, id, "1.0.0"), false);
});

test("validation responses are bounded and reject malformed values", () => {
  assert.deepEqual(parseFieldErrors(null), {});
  assert.deepEqual(parseFieldErrors({ title: "not-an-array", summary: [null, 3, "", "Useful guidance"] }), { summary: ["Useful guidance"] });
  const fields = Object.fromEntries(Array.from({ length: 50 }, (_, i) => [`field${i}`, Array(20).fill("x".repeat(900))]));
  const parsed = parseFieldErrors(fields);
  assert.equal(Object.keys(parsed).length, 16);
  assert.equal(parsed.field0.length, 4);
  assert.equal(parsed.field0[0].length, 500);
  assert.equal(Object.hasOwn(parseFieldErrors(JSON.parse('{"__proto__":["x"]}')), "__proto__"), false);
});
