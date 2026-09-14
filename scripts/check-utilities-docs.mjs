import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const read = (file) => readFile(file, "utf8");
const api = JSON.parse(await read("content/api/api.json"));
const nav = JSON.parse(await read("content/docs/meta.json"));
for (const slug of ["player-utilities", "package-audio", "holocall-eyes"]) {
  assert.equal(nav.sections.flatMap((section) => section.pages).filter((page) => page.slug === slug).length, 1);
}
const audio = api.filter((entry) => entry.namespace === "Open77.audio");
assert.equal(audio.length, 20);
for (const runtime of ["client", "server"]) {
  assert.equal(audio.filter((entry) => entry.runtime === runtime).length, 10);
  for (const name of ["play2D", "play3D", "play", "pause", "stop", "seek", "setVolume", "setPosition", "getState", "destroy"]) {
    const entry = audio.find((item) => item.runtime === runtime && item.name === name);
    assert.ok(entry?.description && entry?.params && entry?.returns?.length, `${runtime}.${name}`);
  }
}
const players = api.filter((entry) => entry.namespace === "Open77.players" && entry.runtime === "client");
const holocall = api.filter((entry) => entry.namespace === "Open77.players" && ["setHoloCallEyes", "getHoloCallEyes"].includes(entry.name));
assert.equal(holocall.length, 3);
assert.ok(!holocall.some((entry) => entry.name === "setHoloCallEyes" && entry.runtime === "client"));
for (const name of ["isSwimming", "isAiming", "isShooting", "freezePosition", "freezeRotation", "allowJump", "allowShoot", "resetControls"]) {
  assert.ok(players.find((entry) => entry.name === name), name);
}
const playerGuide = await read("content/docs/player-utilities.md");
assert.ok(playerGuide.includes("IsPointOnRoad` is **not implemented**"));
assert.ok(playerGuide.includes("state_not_replicated"));
const audioGuide = await read("content/docs/package-audio.md");
for (const text of ["network_audio_requires_server", "audio.network", "audio.play", "Late joiners", "routing bucket", "not sample-accurate"]) assert.ok(audioGuide.includes(text), text);
const routes = await read("src/lib/api-reference.ts");
assert.ok(routes.includes('usageGuideHref: "/docs/package-audio"'));
assert.ok(routes.includes('usageGuideHref: "/docs/player-utilities"'));
const origin = process.argv[2];
if (origin) {
  for (const [url, needle] of [
    ["/docs/holocall-eyes", "setHoloCallEyes"],
    ["/docs/player-utilities", "IsPlayerSwimming"],
    ["/docs/player-utilities.md", "state_not_replicated"],
    ["/docs/package-audio", "Play3DSound"],
    ["/docs/package-audio.md", "network_audio_requires_server"],
    ["/docs/api/client/open77-players", "Player checks &amp; controls guide"],
    ["/docs/api/client/open77-audio", "Play2DSound"],
    ["/docs/api/server/open77-audio", "Package audio: 2D &amp; 3D guide"],
    ["/docs/api/server/open77-audio.md", "audio.network"],
    ["/sitemap.xml", "/docs/package-audio"],
    ["/llms.txt", "/docs/player-utilities"],
  ]) {
    const response = await fetch(new URL(url, origin), { signal: AbortSignal.timeout(30000) });
    assert.equal(response.status, 200, url);
    assert.ok((await response.text()).includes(needle), `${url}: ${needle}`);
    console.log(`served OK ${url}`);
  }
}
console.log("Utility/audio documentation: runtime split, navigation, guide links and limitations verified.");
