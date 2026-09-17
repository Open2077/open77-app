/** Scoped morph doc sync: preserve unrelated uncommitted site/API work. */
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile, writeFile } from "node:fs/promises";
const check = process.argv.includes("--check");
const source = process.env.OPEN77_BASE_SOURCE ?? "../CyberM";
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
  const text = await read(`${source}/wiki/${slug}.md`);
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
const modelNames = new Set(["setModel", "getModel", "resetModel", "isModelReady", "isModelValid",
  "SetPlayerModel", "GetPlayerModel", "ResetPlayerModel", "IsPlayerModelReady", "IsPlayerModelValid"]);
const selected = (entry) => (entry.namespace === "Open77.players" || entry.namespace === "_G") && modelNames.has(entry.name);
const incoming = JSON.parse(await read(`${source}/wiki/data/api.json`)).filter(selected);
assert.equal(incoming.length, 14, "Expected seven model functions and seven aliases");
const apiTarget = "content/api/api.json";
const currentApi = JSON.parse(await read(apiTarget));
const apiRecord = manifest.files.find((entry) => entry.target === apiTarget);
assert.ok(apiRecord);
const key = (entry) => entry.runtime + ":" + entry.qualified;
if (check) {
  assert.deepEqual(currentApi.filter(selected).sort((a,b)=>key(a).localeCompare(key(b))),
    incoming.sort((a,b)=>key(a).localeCompare(key(b))), "Model API drift");
  const apiText = await read(apiTarget);
  assert.equal(apiRecord.sha256, hash(apiText));
  assert.equal(apiRecord.bytes, Buffer.byteLength(apiText));
} else {
  const merged = [...currentApi.filter((entry) => !selected(entry)), ...incoming];
  const apiText = JSON.stringify(merged,null,1)+"\n";
  await writeFile(apiTarget,apiText);
  Object.assign(apiRecord,{entries:merged.length,bytes:Buffer.byteLength(apiText),sha256:hash(apiText)});
  manifest.apiEntries=merged.length;
}
const download = await read(`${source}/docs/generated/player-models-2.31.md`);
const catalogue = JSON.parse(await read("public/data/npc-records-2.31.json"));
const ids = [...download.matchAll(/^\| `(Character\.[^`]+)` \|/gm)].map((match) => match[1]).sort();
assert.deepEqual(ids, catalogue.records.map((row) => row.record).sort(), "Site catalogue differs from morph extraction");
if (check) assert.equal(await read("public/data/player-models-2.31.md"), download);
else {
  await writeFile("public/data/player-models-2.31.md", download);
  manifest.guides = manifest.files.filter((file) => file.slug).length;
  manifest.partialSync = {tool:"scripts/sync-player-model-docs.mjs",guides,apiMode:"merge-selected-model-cards",syncedAt:new Date().toISOString()};
  await writeFile("content/docs/_manifest.json", JSON.stringify(manifest,null,2)+"\n");
  await writeFile("content/docs/meta.json", JSON.stringify(meta,null,2)+"\n");
}
console.log(`Morph documentation ${check ? "verified" : "synced"}: ${ids.length} record IDs; other site work preserved.`);
