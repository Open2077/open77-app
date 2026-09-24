/** Scoped morph doc sync: preserve unrelated uncommitted site/API work. */
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile, writeFile } from "node:fs/promises";
const check = process.argv.includes("--check");
const read = async (file) => (await readFile(file, "utf8")).replaceAll("\r\n", "\n");
const hash = (text) => createHash("sha256").update(text).digest("hex");
const guides = ["player-models", "player-model-catalogue"];
const manifest = JSON.parse(await read("content/docs/_manifest.json"));
const meta = JSON.parse(await read("content/docs/meta.json"));
const section = meta.sections.find((item) => item.pages.some((page) => page.slug === "player-utilities"));
assert.ok(section, "Player documentation section missing");
const titles = ["Player morphs", "Morph catalogue"];
const descriptions = ["Server-owned NPC impersonation, readiness, replication, restoration and model compatibility.",
  "Search all 6,582 Character records for player morphs, with downloadable IDs and the admin menu workflow."];
for (const [i, slug] of guides.entries()) {
  const text = await read(`../CyberM/wiki/${slug}.md`);
  const target = `content/docs/${slug}.md`;
  const entry = {source:`wiki/${slug}.md`,target,slug,title:text.match(/^# (.+)$/m)[1],bytes:Buffer.byteLength(text),sha256:hash(text)};
  const previous = manifest.files.find((item) => item.target === target);
  const page = section.pages.find((item) => item.slug === slug);
  if (check) {
    assert.equal(await read(target), text, target);
    assert.ok(previous && page, `${slug}: registration missing`);
    assert.equal(previous.sha256, entry.sha256);
    assert.equal(previous.bytes, entry.bytes);
  } else {
    await writeFile(target, text);
    if (previous) Object.assign(previous,entry); else manifest.files.push(entry);
    if (!page) section.pages.push({slug,kind:"guide",nav:titles[i],description:descriptions[i]});
  }
}
const download = await read("../CyberM/docs/generated/player-models-2.31.md");
const catalogue = JSON.parse(await read("public/data/npc-records-2.31.json"));
const ids = [...download.matchAll(/^\| `(Character\.[^`]+)` \|/gm)].map((match) => match[1]).sort();
assert.deepEqual(ids, catalogue.records.map((row) => row.record).sort(), "Site catalogue differs from morph extraction");
if (check) assert.equal(await read("public/data/player-models-2.31.md"), download);
else {
  await writeFile("public/data/player-models-2.31.md", download);
  manifest.guides = manifest.files.filter((file) => file.slug).length;
  manifest.syncedAt = new Date().toISOString();
  manifest.partialSync = {tool:"scripts/sync-player-model-docs.mjs",guides,apiMode:"unchanged",syncedAt:manifest.syncedAt};
  await writeFile("content/docs/_manifest.json", JSON.stringify(manifest,null,2)+"\n");
  await writeFile("content/docs/meta.json", JSON.stringify(meta,null,2)+"\n");
}
console.log(`Morph documentation ${check ? "verified" : "synced"}: ${ids.length} record IDs; other site work preserved.`);
