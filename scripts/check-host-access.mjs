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
console.log("PASS: approved non-staff and admins can download; signed-out/unapproved accounts stay gated.");
