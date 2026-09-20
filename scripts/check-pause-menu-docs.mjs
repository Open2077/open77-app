/** Pause-menu guide contracts, discovery and optional served-page checks. */
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { assertEditorialProse } from "./docs-editorial.mjs";

const read = async (file) => (await readFile(file, "utf8")).replaceAll("\r\n", "\n");
const target = "content/docs/pause-menu.md";
const guide = await read(target);
assertEditorialProse(guide, target);
for (const name of ["setAccentColor", "setLogo", "resetAppearance", "getAppearance"])
  assert.ok(guide.includes(`Open77.pauseMenu.${name}(`), `Missing client API example: ${name}`);
for (const token of ["2.31.13+op77.85", 'permissions { "pause_menu.customize" }',
  'pause_menu_logo "assets/server-logo.png"', 'files { "assets/server-logo.png" }',
  'pause_menu_logo "https://cdn.example.com/server-logo.png"', "1 MiB", "PNG, JPEG and WebP",
  "never instead", "per field", "#22D8E2", "setLogo(nil)", "setAccentColor(nil)",
  "logo_not_declared", "invalid_accent", "pause_menu_unavailable", "within one second",
  "failed start or reload", "without an error", "data URI", "does not guarantee"])
  assert.ok(guide.includes(token), `Missing contract: ${token}`);

const nav = JSON.parse(await read("content/docs/meta.json"));
const pages = nav.sections.flatMap((section) => section.pages);
assert.equal(pages.filter((page) => page.slug === "pause-menu").length, 1);
assert.ok(nav.sections.find((section) => section.id === "interfaces").pages.some((page) => page.slug === "pause-menu"));
assert.ok(JSON.parse(await read("scripts/curated-docs.json")).includes("pause-menu.md"));
const manifest = JSON.parse(await read("content/docs/_manifest.json"));
const record = manifest.files.find((entry) => entry.target === target);
assert.equal(record?.bytes, Buffer.byteLength(guide));
assert.equal(record?.sha256, createHash("sha256").update(guide).digest("hex"));
assert.equal(record?.siteEditorial?.owner, "website");
assert.equal(manifest.guides, manifest.files.filter((entry) => "slug" in entry).length);
for (const related of ["server-branding", "resource-runtime"])
  assert.ok((await read(`content/guides/${related}.md`)).includes("pause-menu.md"), `Missing incoming link: ${related}`);
for (const [, link] of guide.matchAll(/\]\(([^)]+)\)/g)) {
  if (/^https?:/.test(link)) continue;
  assert.ok(pages.some((page) => page.slug === link.replace(/\.md(?:#.*)?$/, "")), `Unknown guide: ${link}`);
}

const origin = process.argv[2];
if (origin) {
  const routes = [
    ["/docs/pause-menu", "Pause menu customization"],
    ["/docs/pause-menu.md", "pause_menu_logo"],
    ["/docs", "/docs/pause-menu"],
    ["/docs/server-branding", "/docs/pause-menu"],
    ["/docs/resource-runtime", "/docs/pause-menu"],
    ["/sitemap.xml", "/docs/pause-menu"],
    ["/llms.txt", "/docs/pause-menu"],
    ["/llms-full.txt", "Open77.pauseMenu.setAccentColor"],
  ];
  for (const [route, token] of routes) {
    const response = await fetch(new URL(route, origin), { signal: AbortSignal.timeout(60000) });
    assert.equal(response.status, 200, route);
    const body = await response.text();
    assert.ok(body.includes(token), `${route}: missing ${token}`);
    if (route === "/docs/pause-menu") {
      assert.ok(body.includes('id="quick-start"'));
      assert.ok(body.includes('id="lua-functions"'));
      assert.ok(body.includes("pause_menu.customize"));
    }
    console.log(`served OK ${route}`);
  }
}
console.log("Pause-menu documentation: four APIs, manifest, ownership, errors, navigation and provenance verified.");
