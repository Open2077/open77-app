import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import ts from "typescript";
import { canEdit, canVote, reviewStates, stages, stateLabel } from "../src/lib/dev-tracker/types.ts";

const idea = { authorId: "author", state: "proposed", hidden: false, locked: false, upvotes: 0, downvotes: 0, comments: 0 };

// Load the real browser client, replacing only its extensionless TypeScript
// import for Node. No source files or generated JS are written by this test.
function moduleUrl(source) {
  const js = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 } }).outputText;
  return "data:text/javascript;base64," + Buffer.from(js).toString("base64");
}
const fields = moduleUrl(await readFile(new URL("../src/lib/account/field-errors.ts", import.meta.url), "utf8"));
const apiSource = await readFile(new URL("../src/lib/account/api.ts", import.meta.url), "utf8");
const { masterCall, MasterApiError } = await import(moduleUrl(apiSource.replace('"./field-errors"', JSON.stringify(fields))));

test("business cooldown messages survive the shared API client", async t => {
  t.mock.method(globalThis, "fetch", async () => new Response(JSON.stringify({ code: "submission_limited", message: "Try again next Monday at 12:00 UTC." }), { status: 429 }));
  await assert.rejects(masterCall("/test"), error => error instanceof MasterApiError && error.code === "submission_limited" && error.message.includes("next Monday") && error.status === 429);
});
test("empty gateway rate limits keep a useful fallback", async t => {
  t.mock.method(globalThis, "fetch", async () => new Response("", { status: 429 }));
  await assert.rejects(masterCall("/test"), error => error.code === "rate_limited" && error.message.includes("Wait a minute"));
});
test("other validation responses still retain field errors", async t => {
  t.mock.method(globalThis, "fetch", async () => new Response(JSON.stringify({ code: "invalid_input", message: "Fix the title.", fieldErrors: { title: ["Too short."] } }), { status: 400 }));
  await assert.rejects(masterCall("/test"), error => error.code === "invalid_input" && error.fieldErrors.title[0] === "Too short.");
});
test("guest and author cannot vote; closed stages deny new votes", () => {
  assert.equal(canVote(idea), false);
  assert.equal(canVote(idea, "author"), false);
  assert.equal(canVote(idea, "player"), true);
  for (const state of ["withdrawn", "declined", "shipped"]) assert.equal(canVote({ ...idea, state }, "player"), false);
  for (const flag of ["hidden", "locked"]) assert.equal(canVote({ ...idea, [flag]: true }, "player"), false);
});
test("proposal edits stop after feedback or staff approval", () => {
  assert.equal(canEdit(idea, "author"), true);
  assert.equal(canEdit(idea, "player"), false);
  for (const field of ["upvotes", "downvotes", "comments"]) assert.equal(canEdit({ ...idea, [field]: 1 }, "author"), false);
  assert.equal(canEdit({ ...idea, state: "approved" }, "author"), false);
  assert.equal(canEdit({ ...idea, feedbackStarted: true }, "author"), false);
});
test("staff must approve before scheduling and board excludes rejected ideas", () => {
  for (const current of ["proposed", "declined", "withdrawn"]) {
    const choices = reviewStates(current).map(([id]) => id);
    assert.ok(choices.includes("approved"));
    for (const state of ["planned", "in_progress", "testing", "shipped"]) assert.ok(!choices.includes(state));
  }
  assert.ok(reviewStates("approved").some(([id]) => id === "in_progress"));
  assert.deepEqual(stages.map(([id]) => id), ["approved", "planned", "in_progress", "testing", "shipped"]);
  assert.equal(stateLabel("approved"), "Validated");
});
