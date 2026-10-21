/** Navigation coverage and thematic boundaries, independent of presentation. */
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const nav = JSON.parse(await readFile("content/docs/meta.json", "utf8"));
const pages = nav.sections.flatMap((section) => section.pages);
assert.equal(new Set(nav.sections.map((section) => section.id)).size, nav.sections.length, "Duplicate topic IDs");
assert.equal(new Set(pages.map((page) => page.slug)).size, pages.length, "A guide must have exactly one navigation home");
assert.equal(pages.length, 145, "Review guide coverage when adding or removing pages");
const collections = [...new Set(nav.sections.map((section) => section.group))];
assert.deepEqual(collections, ["Start & host", "Build resources", "Game systems", "Reference & tools"]);
let previous = "";
const visited = new Set();
for (const section of nav.sections) {
  assert.ok(section.title && section.description && section.pages.length > 0, section.id);
  assert.ok(section.pages.length <= 9, `${section.id}: split broad topics before they become catch-all lists`);
  if (section.group !== previous) {
    assert.ok(!visited.has(section.group), "Collections must remain contiguous");
    visited.add(section.group);
    previous = section.group;
  }
  for (const page of section.pages) {
    if (page.kind !== "guide") continue;
    const directory = page.source === "authored" ? "content/guides" : "content/docs";
    await readFile(`${directory}/${page.file ?? `${page.slug}.md`}`, "utf8");
  }
}
for (const [id, slugs] of Object.entries({
  reference: ["rtti", "rtti-testing", "debug-runtime", "agent-testing"],
  server: ["host-a-server", "server-startup", "server-licensing", "database"],
  "server-administration": ["warden", "rcon", "metrics", "community-hub-warden", "warden-players"],
  vehicles: ["vehicles", "vehicle-sirens", "vehicle-seat-switching", "vehicle-paint", "vehicle-ai", "vehicle-weapons", "drive-by", "armed-vehicles"],
  weapons: ["weapons-api", "weapon-customization", "consumables-api"],
  players: ["client-players", "player-utilities", "local-puppet-visibility"],
  characters: ["npcs", "character-previews", "npc-behavior", "npc-catalogue", "player-models", "player-model-catalogue", "custom-clothing"],
  animations: ["rp-animations", "custom-locomotion", "rp-animation-catalogue", "player-interactions", "attachments"],
  map: ["native-map", "blips", "custom-blip-icons", "markers", "world-queries", "zones", "polyzone"],
  world: ["props", "gizmos"],
  cameras: ["perspective", "cameras", "third-person-camera", "remote-camera", "screen-transitions", "photo-mode", "screenshots"],
  audio: ["package-audio", "sound", "chat", "voice", "voice-lipsync", "guided-voice-setup"],
  interfaces: ["pause-menu", "loading-screens", "ui-kit", "webui-assets", "notifications", "hud-visibility"],
  input: ["webui-input", "keybindings", "input-blocking", "clipboard"],
  "world-interaction": ["world-interaction", "build-a-job", "actions", "transactions", "furniture"],
  "rp-jobs": ["rp-jobs", "rp-job-ripperdoc", "rp-job-chooh2", "rp-job-techie", "rp-job-netrunner", "rp-job-fixer", "rp-job-trauma-team", "rp-job-nomad"],
})) {
  const section = nav.sections.find((entry) => entry.id === id);
  assert.ok(section, id);
  for (const slug of slugs) assert.ok(section.pages.some((page) => page.slug === slug), `${slug} belongs in ${id}`);
}
console.log(`Documentation navigation: ${pages.length} unique pages, ${nav.sections.length} bounded topics, ${collections.length} collections.`);
