import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import ts from "typescript";

const source = await readFile("src/lib/account/host-access.ts", "utf8");
const compiled = ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 },
}).outputText;
const { canDownloadServer } = await import(`data:text/javascript;base64,${Buffer.from(compiled).toString("base64")}`);
assert.equal(canDownloadServer(null), false, "signed out");
assert.equal(canDownloadServer({ role: "user", alphaAccess: true }), true, "approved non-staff account");
assert.equal(canDownloadServer({ role: "admin", alphaAccess: true }), true, "admin");
assert.equal(canDownloadServer({ role: "admin" }), true, "admin with older master response");
assert.equal(canDownloadServer({ role: "user", alphaAccess: false }), false, "unapproved account");
assert.equal(canDownloadServer({ role: "user" }), false, "missing entitlement is not approval");
assert.equal(canDownloadServer({ role: "user", alphaAccess: "true" }), false, "malformed entitlement");

// A working gate is not enough: approved users must be able to find it without
// entering the staff-only admin workspace or submitting another application.
for (const file of ["src/app/create/page.tsx", "src/components/developer-alpha.tsx", "src/components/account/account-overview.tsx"]) {
  const component = await readFile(file, "utf8");
  assert.match(component, /href="\/host">\s*Download server/, `${file}: direct download entry point`);
}
assert.match(await readFile("src/components/account/account-overview.tsx", "utf8"), /canDownloadServer\(account\)/);
assert.match(await readFile("src/lib/site.ts", "utf8"), /href: "\/host", label: "Download the server"/);
assert.match(await readFile("src/components/host/host-gate.tsx", "utf8"), /allowed: canDownloadServer\(account\)/);
console.log("PASS: approved non-staff and admins can download; unapproved accounts stay gated; creator, account and footer entry points are present.");
