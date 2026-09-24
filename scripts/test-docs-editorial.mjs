import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { editorialIssues, reviewApiEntries, readGuideForSync } from "./docs-editorial.mjs";
import { isAppOwned } from "./wiki-exclusions.mjs";

test("rejects development diaries and publication notes in public prose", () => {
  for (const text of [
    "Implemented and tested locally on 17 September 2026.",
    "**Client availability:** not yet published on the CDN.",
    "Reviewed on **2026-09-17**.",
    "Live acceptance remains pending.",
    "Declared rig bindings. Status: asset verified; runtime pending.",
    "Read that sentence twice before continuing.",
    "Measured on a developer machine during the candidate sweep.",
    "Be honest with yourself about what this is.",
  ]) assert.ok(editorialIssues(text).length, text);
});

test("preserves technical versions, limitations, native semantics and examples", () => {
  for (const text of [
    "Requires client **2.31.13+op77.62** and permission `webui.keep_input`.",
    "The CDN hosts indexed packages. Readiness is not a rendering acknowledgement.",
    "Experimental: remote swimming state is not available.",
    "```json\n{\"createdAt\":\"2026-09-17\"}\n```",
    "`verdict:await()` returns the cancellation result.",
    "Run tests locally before publishing your resource.",
  ]) assert.deepEqual(editorialIssues(text), [], text);
});

test("reviewed API prose is idempotent and does not alter contracts", async () => {
  const corrections = JSON.parse(await readFile(new URL("./doc-api-editorial.json", import.meta.url), "utf8"));
  const entries = corrections.map(({ runtime, qualified, description }) => ({ runtime, qualified, description, params: [{ name: "value", type: "table" }], since: null }));
  assert.deepEqual(reviewApiEntries(entries), entries);
  assert.deepEqual(reviewApiEntries(reviewApiEntries(entries)), entries);
  assert.throws(() => reviewApiEntries([{ ...entries[0], description: "Changed upstream contract" }]), /upstream description changed/);
  assert.throws(() => reviewApiEntries([{ runtime: "client", qualified: "New.method", description: "Tested locally yesterday" }]), /editorial review/);
});

test("known upstream wording receives its reviewed replacement", () => {
  const source = { runtime: "server", qualified: "Open77.log.info", description: "No permission. Writes to the resource-prefixed server logger at the `INF` level, the same one `print` writes at. Values are joined with a tab like `print`; control sequences (ANSI colour codes, cursor moves) are stripped from the line before it reaches the log, so a ported script's coloured output cannot corrupt the terminal or the log file. Until wave 6 (2026-09-16) all four levels printed at `INF`; since then the log line carries `INF`.", params: [], since: "1.0" };
  const [result] = reviewApiEntries([source]);
  assert.ok(!result.description.includes("2026-09-16"));
  assert.deepEqual(result.params, source.params);
  assert.equal(result.since, source.since);
  assert.ok(source.description.includes("2026-09-16"), "does not mutate upstream data");
});

test("scoped sync preserves every curated guide without reading upstream", async () => {
  const files = JSON.parse(await readFile(new URL("./curated-docs.json", import.meta.url), "utf8"));
  assert.equal(new Set(files).size, files.length);
  for (const file of files) {
    assert.equal(isAppOwned(file), true, file);
    const expected = (await readFile(`content/docs/${file}`, "utf8")).replaceAll("\r\n", "\n");
    assert.equal(await readGuideForSync("nonexistent-source", file), expected, file);
  }
});
