import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

// Public downloads must not depend on account APIs, entitlements or client hydration.
const host = await readFile("src/app/host/page.tsx", "utf8");
assert.doesNotMatch(host, /HostGate|AuthPanel|canDownloadServer|index: false/);
assert.match(host, /<ServerBuilds release=\{release\}/);
assert.match(await readFile("src/app/sitemap.ts", "utf8"), /absoluteUrl\("\/host"\)/);
for (const file of ["src/app/create/page.tsx", "src/components/account/account-overview.tsx"]) {
  const component = await readFile(file, "utf8");
  assert.match(component, /href="\/host">\s*Download server/, `${file}: direct download entry point`);
  assert.doesNotMatch(component, /canDownloadServer|account\.alphaAccess|alpha apply/);
}
const keymaster = await readFile("src/components/account/keymaster.tsx", "utf8");
assert.doesNotMatch(keymaster, /alphaAccess|canDownloadServer|session\.role/);
assert.match(keymaster, /master\.createLicense/);
assert.match(keymaster, /disabled=\{!emailVerified\}/, "License ownership and verified-email requirements remain");
console.log("PASS: public server downloads, direct account entry points and self-service licensing without Alpha entitlements.");
