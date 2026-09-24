/** Camera style, cinematic display and perspective-lock documentation contracts. */
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { unified } from "unified";
import remarkParse from "remark-parse";
import remarkRehype from "remark-rehype";
import rehypeSlug from "rehype-slug";
import { visit } from "unist-util-visit";

const read = (file) => readFile(file, "utf8");
const api = JSON.parse(await read("content/api/api.json"));
const cards = new Map(api.filter((e) => e.runtime === "client").map((e) => [e.qualified, e]));
const contracts = [
  ["Open77.camera.configureThirdPerson", ["options"], "camera.style"],
  ["Open77.camera.thirdPersonState", [], "no permission"],
  ["Open77.camera.resetThirdPerson", [], "camera.style"],
  ["Open77.camera.shakeThirdPerson", ["options"], "camera.style"],
  ["Open77.camera.stopThirdPersonShake", [], "camera.style"],
  ["Open77.perspective.setThirdPerson", ["enabled", "force"], "perspective.policy"],
  ["Open77.perspective.clearThirdPersonOverride", [], "no permission"],
  ["Open77.hud.setCinematic", ["enabled", "height"], "ui.vanilla.hud"],
];
for (const [name, params, permission] of contracts) {
  const entry = cards.get(name);
  assert.ok(entry, `Missing ${name}`);
  assert.equal(entry.inferred, false, name);
  assert.equal(entry.api_set, "game", name);
  assert.deepEqual(entry.params.map((p) => p.name), params, name);
  assert.ok(entry.summary && entry.description && entry.example && entry.returns.length, name);
  assert.ok(entry.description.includes(permission), `${name}: permission`);
  assert.ok(!api.some((e) => e.qualified === name && e.runtime === "server"), `No fabricated server ${name}`);
}
assert.equal(cards.get("Open77.perspective.setThirdPerson").params[1].default, "false");
assert.equal(cards.get("Open77.perspective.setThirdPerson").params[1].optional, true);
assert.equal(cards.get("Open77.hud.setCinematic").params[1].default, "0.12");
assert.equal(cards.get("Open77.hud.setCinematic").params[1].optional, true);
for (const token of ["resourceForced", "resourcePerspective", "resource_forced", "allowed", "settled"]) {
  assert.ok(cards.get("Open77.perspective.state").description.includes(token), token);
}

const nav = JSON.parse(await read("content/docs/meta.json"));
const pages = nav.sections.flatMap((s) => s.pages);
const slugs = ["third-person-camera", "perspective", "hud-visibility"];
const docs = new Map();
const headings = new Map();
const processor = unified().use(remarkParse).use(remarkRehype).use(rehypeSlug);
for (const slug of slugs) {
  assert.equal(pages.filter((p) => p.slug === slug && p.kind === "guide").length, 1, slug);
  const md = await read(`content/docs/${slug}.md`);
  docs.set(slug, md);
  const ids = new Set();
  visit(await processor.run(processor.parse(md)), "element", (node) => {
    if (node.properties.id) ids.add(String(node.properties.id));
  });
  headings.set(slug, ids);
}
for (const [slug, md] of docs) {
  for (const match of md.matchAll(/\]\(([^)]+\.md)(?:#([^)]*))?\)/g)) {
    const target = match[1].replace(/\.md$/, "");
    assert.ok(pages.some((p) => (p.file ?? `${p.slug}.md`) === match[1]),
      `${slug}: missing guide ${match[1]}`);
    if (slugs.includes(target) && match[2]) {
      assert.ok(headings.get(target).has(match[2]), `${slug}: broken heading ${match[0]}`);
    }
  }
}
for (const token of ["camera.style", "perspective.policy", "ui.vanilla.hud", "camera_style_owned",
  "stable gameplay pivots", "not animated skeleton bones", "runSpeed", "runFov", "sprintFov",
  "appliedFov", "before collision", "0.01..0.4", "greatest requested bar height",
  "focused chat/menu", "invalid_cinematic_height", "/camchange", "/cinematic", "Older clients"]) {
  assert.ok(docs.get("third-person-camera").includes(token), token);
}
for (const token of ["setThirdPerson(false, true)", "clearThirdPersonOverride", "refused_by_policy",
  "perspective_owned", "pre-lock", "coroutine error", "resourceForced"]) {
  assert.ok(docs.get("perspective").includes(token), token);
}
const links = await read("src/lib/api-reference.ts");
for (const slug of slugs) assert.ok(links.includes(`/docs/${slug}`), `API guide link ${slug}`);

const origin = process.argv[2];
if (origin) {
  const routes = [
    ["/docs/third-person-camera", "Third-person camera styles"],
    ["/docs/third-person-camera.md", "configureThirdPerson"],
    ["/docs/perspective", "setThirdPerson"],
    ["/docs/perspective.md", "clearThirdPersonOverride"],
    ["/docs/hud-visibility", "setCinematic"],
    ["/docs/api/client/open77-camera", "Third-person camera styles guide"],
    ["/docs/api/client/open77-camera.md", "shakeThirdPerson"],
    ["/docs/api/client/open77-perspective", "clearThirdPersonOverride"],
    ["/docs/api/client/open77-perspective.md", "resourceForced"],
    ["/docs/api/client/open77-hud", "Cinematic display guide"],
    ["/docs/api/client/open77-hud.md", "setCinematic"],
    ["/docs/api", "Open77.camera.configureThirdPerson"],
    ["/sitemap.xml", "/docs/third-person-camera"],
    ["/llms.txt", "/docs/third-person-camera"],
    ["/llms-full.txt", "clearThirdPersonOverride"],
  ];
  for (const [route, token] of routes) {
    const response = await fetch(new URL(route, origin), { signal: AbortSignal.timeout(60000) });
    assert.equal(response.status, 200, route);
    const body = await response.text();
    assert.ok(body.includes(token), `${route}: ${token}`);
    if (route === "/docs/third-person-camera") {
      assert.ok(body.includes('id="cinematic-display"'), "Rendered cinematic heading");
      assert.ok(body.includes('/docs/perspective#enable-disable-or-temporarily-force-a-view-client'), "Rewritten perspective link");
    }
    console.log(`served OK ${route}`);
  }
}
console.log("Camera docs verified: eight new client APIs, snapshot fields, three guides, permissions and links.");
