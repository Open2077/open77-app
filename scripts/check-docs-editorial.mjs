import assert from "node:assert/strict";
import { readFile, readdir } from "node:fs/promises";
import { createHash } from "node:crypto";
import { editorialIssues, reviewApiEntries } from "./docs-editorial.mjs";
import ts from "typescript";

const problems = [];
const manifest = JSON.parse(await readFile("content/docs/_manifest.json", "utf8"));
let pages = 0;
for (const folder of ["content/docs", "content/guides"]) {
  for (const filename of (await readdir(folder)).filter((file) => file.endsWith(".md"))) {
    const target = `${folder}/${filename}`;
    const text = (await readFile(target, "utf8")).replaceAll("\r\n", "\n");
    pages++;
    for (const issue of editorialIssues(text)) problems.push(`${target}: ${issue.reason}: ${issue.excerpt}`);
    if (folder === "content/docs") {
      const record = manifest.files.find((file) => file.target?.replaceAll("\\", "/") === target);
      if (!record || record.bytes !== Buffer.byteLength(text) || record.sha256 !== createHash("sha256").update(text).digest("hex")) {
        problems.push(`${target}: update the editorial manifest hash and byte count`);
      }
    }
  }
}
for (const filename of ["api.json", "door-service-api.json"]) {
  const entries = JSON.parse(await readFile(`content/api/${filename}`, "utf8"));
  try { assert.deepEqual(reviewApiEntries(entries), entries, `${filename}: unapplied editorial corrections`); }
  catch (error) { problems.push(error.message); }
}
const nav = JSON.parse(await readFile("content/docs/meta.json", "utf8"));
// These pages generate HTML and Markdown from shared TypeScript content.
for (const name of ["hosting", "licensing", "platform", "warden"]) {
  const file = `src/lib/${name}-content.ts`;
  const source = ts.createSourceFile(file, await readFile(file, "utf8"), ts.ScriptTarget.Latest, true);
  function walk(node) {
    if (ts.isVariableDeclaration(node) && /_SAMPLE$/.test(node.name.getText(source))) return;
    if (ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node)) {
      for (const issue of editorialIssues(node.text)) problems.push(`${file}: ${issue.reason}: ${issue.excerpt}`);
    }
    ts.forEachChild(node, walk);
  }
  walk(source);
}
for (const page of nav.sections.flatMap((section) => section.pages)) {
  for (const field of ["title", "description"]) {
    for (const issue of editorialIssues(page[field] ?? "")) problems.push(`navigation ${page.slug}.${field}: ${issue.reason}`);
  }
}
if (problems.length) {
  console.error(problems.join("\n"));
  process.exitCode = 1;
} else console.log(`Editorial checks passed: ${pages} guides, 4 platform pages, API descriptions, navigation and content provenance.`);
