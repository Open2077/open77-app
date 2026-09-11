import test from "node:test";
import assert from "node:assert/strict";
import { CommunityDraftStore } from "../src/lib/community/drafts.ts";

test("drafts survive component subscriptions ending but remain account and form scoped", () => {
  const store = new CommunityDraftStore();
  let changed = 0;
  const unsubscribe = store.subscribe(() => changed++);
  store.set("creator-a", "reply:one", { text: "Private unsent reply", requestId: "retry-one" });
  unsubscribe();
  assert.equal(changed, 1);
  assert.equal(store.get("creator-a", "reply:one").text, "Private unsent reply");
  assert.equal(store.get("creator-b", "reply:one"), null);
  assert.equal(store.get("creator-a", "reply:two"), null);
  assert.equal(store.get("creator-a", "reply:one").requestId, "retry-one");
});

test("capacity rejects new drafts without evicting text and still allows existing edits and explicit discard", () => {
  const store = new CommunityDraftStore(2);
  assert.ok(store.set("a", "one", { text: "first" }));
  assert.ok(store.set("b", "two", { text: "second" }));
  assert.equal(store.set("a", "three", { text: "third" }), false);
  assert.equal(store.get("b", "two").text, "second");
  assert.ok(store.set("a", "one", { text: "changed" }));
  store.remove("a", "two");
  assert.equal(store.size, 2);
  store.remove("a", "one");
  assert.ok(store.set("a", "three", { text: "third" }));
  assert.equal(store.set("a", "three", { text: "x".repeat(5001) }), false);
  assert.equal(store.get("a", "three").text, "third");
});

test("restored comment edits keep original revision and body instead of silently rebasing", () => {
  const store = new CommunityDraftStore();
  const draft = { text: "My revision", revision: 4, originalBody: "Original" };
  store.set("a", "edit:one", draft);
  draft.revision = 9;
  assert.equal(store.get("a", "edit:one").revision, 4);
  assert.equal(store.get("a", "edit:one").originalBody, "Original");
  assert.equal(store.set("", "edit:one", { text: "Anonymous" }), false);
});
