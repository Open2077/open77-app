import assert from "node:assert/strict";
import { test } from "node:test";
import { mergeDraft } from "../src/lib/community/draft-merge.ts";

const base = { title: "Taxi", summary: "Ride anywhere", description: "Original", installation: "", category: "scripts", kind: "resource", maturity: "experimental", tags: [] };
test("independent edits preserve both contributors without mutating their snapshots", () => {
  const local = { ...base, description: "Local guide" }, remote = { ...base, summary: "Remote summary" };
  const result = mergeDraft(base, local, remote);
  assert.deepEqual(result.conflicts, []);
  assert.equal(result.merged.description, local.description);
  assert.equal(result.merged.summary, remote.summary);
  assert.equal(base.description, "Original");
  assert.equal(remote.description, "Original");
});
test("overlapping text edits require a choice, identical retries do not", () => {
  assert.deepEqual(mergeDraft(base, { ...base, title: "Mine" }, { ...base, title: "Theirs" }).conflicts, ["title"]);
  assert.deepEqual(mergeDraft(base, { ...base, title: "Mine" }, { ...base, title: "Mine" }).conflicts, []);
});
test("removals and reordered galleries stay explicit conflicts", () => {
  const withMedia = { ...base, media: [{ mediaId: "a", altText: "A" }, { mediaId: "b", altText: "B" }] };
  const local = { ...withMedia, media: [] };
  const remote = { ...withMedia, media: [...withMedia.media].reverse() };
  const result = mergeDraft(withMedia, local, remote);
  assert.deepEqual(result.conflicts, ["media"]);
  assert.deepEqual(result.merged.media, []);
});
test("absent optional fields and null are equivalent; a new remote field survives", () => {
  const result = mergeDraft(base, { ...base, sourceUrl: null }, { ...base, sourceUrl: "https://github.com/example/taxi" });
  assert.deepEqual(result.conflicts, []);
  assert.equal(result.merged.sourceUrl, "https://github.com/example/taxi");
});
