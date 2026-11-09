import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

// Public downloads must not depend on account APIs, entitlements or client hydration.
const host = await readFile("src/views/host.tsx", "utf8");
assert.doesNotMatch(host, /HostGate|AuthPanel|canDownloadServer|index: false/);
assert.match(host, /<ServerBuilds release=\{release\}/);
assert.match(await readFile("src/app/sitemap.ts", "utf8"), /absoluteUrl\("\/host"\)/);

// The direct "Download server" entry points. /create is translated, so its
// label is a dictionary key; the English source must still say it plainly.
const english = JSON.parse(await readFile("src/i18n/messages/en.json", "utf8"));
assert.match(english.create.downloadServer, /^Download server$/, "en.json create.downloadServer");
const entryPoints = [
  ["src/views/create.tsx", /href="\/host">\s*\{m\.downloadServer\}/],
  ["src/components/account/account-overview.tsx", /href="\/host">\s*Download server/],
];
for (const [file, entry] of entryPoints) {
  const component = await readFile(file, "utf8");
  assert.match(component, entry, `${file}: direct download entry point`);
  assert.doesNotMatch(component, /canDownloadServer|account\.alphaAccess|alpha apply/);
}
const keymaster = await readFile("src/components/account/keymaster.tsx", "utf8");
assert.doesNotMatch(keymaster, /alphaAccess|canDownloadServer|session\.role/);
assert.match(keymaster, /master\.createLicense/);
assert.match(keymaster, /disabled=\{!emailVerified\}/, "License ownership and verified-email requirements remain");
console.log("PASS: public server downloads, direct account entry points and self-service licensing without Alpha entitlements.");
