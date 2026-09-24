/** Attachment/interaction contracts, guide coverage and optional served routes. */
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const read = (file) => readFile(file, "utf8");
const api = JSON.parse(await read("content/api/api.json"));
const nav = JSON.parse(await read("content/docs/meta.json"));
const methods = {
  "Open77.props": {
    client: ["attach", "detach", "bones"],
    server: ["attach", "detach", "getAttachment", "isAttached", "attachedTo", "setAttachmentTransform"],
  },
  "Open77.playerInteractions": {
    client: ["list", "get", "current", "isReserved", "respond", "accept", "decline", "cancel", "result"],
    server: ["request", "get", "current", "isReserved", "list", "cancel"],
  },
};
for (const [namespace, runtimes] of Object.entries(methods)) {
  for (const [runtime, names] of Object.entries(runtimes)) {
    for (const name of names) {
      const route = `${runtime}:${namespace}.${name}`;
      const entries = api.filter((entry) => entry.namespace === namespace && entry.runtime === runtime && entry.name === name);
      assert.equal(entries.length, 1, route);
      const entry = entries[0];
      assert.equal(entry.inferred, false, route);
      assert.ok(entry.summary && entry.description && entry.example && entry.returns.length, route);
      assert.equal(entry.returns.some((value) => value.includes("Open77.Promise")),
        namespace === "Open77.playerInteractions" && runtime === "client", route);
    }
  }
}
assert.equal(api.filter((entry) => entry.namespace === "Open77.playerInteractions").length, 15);
assert.ok(!api.some((entry) => entry.namespace === "Open77.playerInteractions" && entry.name.startsWith("_")));
const props = await read("content/docs/attachments.md");
const interactions = await read("content/docs/player-interactions.md");
for (const token of ["parentId", "RightHand", "setAttachmentTransform", "expectedRevision", "onPropAttachmentChanged",
  "world.props", "stale_revision", "visual-only", "same routing bucket", "client API", "server API"]) {
  assert.ok(props.toLowerCase().includes(token.toLowerCase()), `attachments: ${token}`);
}
for (const token of ["open77_player_interactions", "players.interactions.control", "players.interactions.read",
  "onPlayerInteractionCompleted", "onPlayerInteractionCancelled", "onPlayerInteractionOffered", ":await()",
  "consent", "player_reserved", "give", "heal", "carry", "escort", "not a frame-perfect", "not Unix timestamps",
  "resource's responsibility", "Death, disconnect", "Client API", "Server API"]) {
  assert.ok(interactions.includes(token), `interactions: ${token}`);
}
for (const [section, slug] of [["animations", "attachments"], ["animations", "player-interactions"]]) {
  assert.ok(nav.sections.find((item) => item.id === section).pages.some((page) => page.slug === slug && page.kind === "guide"));
}
assert.ok((await read("src/lib/api-categories.ts")).match(/id: "players"[^\n]+"Open77.playerInteractions"/));
for (const slug of ["attachments", "player-interactions"]) {
  assert.ok((await read("src/lib/api-reference.ts")).includes(`/docs/${slug}#`));
}
const oldGuide = await read("content/guides/props-and-effects.md");
assert.ok(oldGuide.includes("/docs/attachments") && oldGuide.includes("/docs/player-interactions"));
assert.doesNotMatch(oldGuide, /Carrying is a server-side follow, not an attachment|there is no API for it yet/);
assert.doesNotMatch(await read("content/docs/props.md"), /Attachment.+is not exposed/);

const origin = process.argv[2];
if (origin) {
  const pages = [
    ["/docs/attachments", "/docs/api/server/open77-props"],
    ["/docs/player-interactions", "/docs/api/client/open77-playerinteractions"],
    ["/docs/attachments.md", "Open77.props.setAttachmentTransform"],
    ["/docs/player-interactions.md", "onPlayerInteractionCompleted"],
    ["/docs/api", "Open77.playerInteractions.request"],
    ["/sitemap.xml", "/docs/player-interactions"],
    ["/llms.txt", "/docs/attachments"],
    ["/llms-full.txt", "onPlayerInteractionPresentationFailed"],
  ];
  for (const runtime of ["client", "server"]) {
    for (const [namespace, guide] of [["open77-props", "attachments"], ["open77-playerinteractions", "player-interactions"]]) {
      for (const extension of ["", ".md"]) pages.push([`/docs/api/${runtime}/${namespace}${extension}`, `/docs/${guide}#${runtime}`]);
    }
  }
  for (const [url, expected] of pages) {
    const response = await fetch(new URL(url, origin), { signal: AbortSignal.timeout(30000) });
    assert.equal(response.status, 200, url);
    assert.ok((await response.text()).includes(expected), `${url}: ${expected}`);
    console.log(`served OK ${url}`);
  }
}
console.log("Attachments/interactions: 24 API cards, 2 guides, runtime boundaries and lifecycle documented.");
