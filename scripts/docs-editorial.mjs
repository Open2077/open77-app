import { readFileSync } from "node:fs";
import { readFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import path from "node:path";
import { unified } from "unified";
import remarkParse from "remark-parse";
import { isAppOwned } from "./wiki-exclusions.mjs";

const parser = unified().use(remarkParse);
const corrections = JSON.parse(readFileSync(new URL("./doc-api-editorial.json", import.meta.url), "utf8"));
const byKey = new Map(corrections.map((entry) => [`${entry.runtime}:${entry.qualified}`, entry]));
const rules = [
  ["calendar date in documentation prose", /\b20\d{2}-\d{2}-\d{2}\b/i],
  ["dated development note", /\b(?:January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{1,2}\b|\b\d{1,2}\s+(?:January|February|March|April|May|June|July|August|September|October|November|December)\s+20\d{2}\b/i],
  ["local validation diary", /\b(?:tested|validated|verified|implemented|installed)\s+locally\b|\blocally\s+(?:tested|validated|verified)\b/i],
  ["test-result diary", /\b(?:live tests (?:confirm|observed)|proven in[- ]game|live acceptance|runtime pending|offline[- ]verified|measured, not theoretical|expected, not measured|on a developer machine|the offline work could not settle)\b/i],
  ["publication logistics", /\b(?:not yet published|client availability|await(?:s|ing)? the owner|website update alone|updating the website does not)\b/i],
  ["conversational filler", /\b(?:read that sentence twice|waste (?:your|an) afternoon|cost you an evening|the honest (?:reading|part)|be honest with yourself|before you file a bug|no serious roleplay resource)\b/i],
];

// Inspect prose, not Lua/JSON examples, literal API names or generated metadata.
export function editorialIssues(markdown) {
  const text = [];
  function walk(node) {
    if (["code", "inlineCode", "html"].includes(node.type)) return;
    if (node.type === "text") text.push(node.value);
    for (const child of node.children ?? []) walk(child);
  }
  walk(parser.parse(markdown));
  const prose = text.join(" ").replace(/\s+/g, " ");
  return rules.flatMap(([reason, expression]) => {
    const match = expression.exec(prose);
    return match ? [{ reason, excerpt: prose.slice(Math.max(0, match.index - 45), match.index + 140) }] : [];
  });
}

export function assertEditorialProse(text, label) {
  const issues = editorialIssues(text);
  if (issues.length) throw new Error(`${label}: public documentation requires editorial review\n${issues.map((issue) => `  ${issue.reason}: ${issue.excerpt}`).join("\n")}`);
}

export function reviewApiEntries(entries) {
  return entries.map((entry) => {
    const key = `${entry.runtime}:${entry.qualified}`;
    const correction = byKey.get(key);
    let reviewed = entry;
    if (correction && entry.description !== correction.description) {
      const digest = createHash("sha256").update(entry.description ?? "").digest("hex");
      if (digest !== correction.sourceDescriptionSha256) {
        throw new Error(`${key}: upstream description changed; review scripts/doc-api-editorial.json before syncing`);
      }
      reviewed = { ...entry, description: correction.description };
    }
    for (const field of ["summary", "description"]) {
      if (typeof reviewed[field] === "string") assertEditorialProse(reviewed[field], `${key}.${field}`);
    }
    return reviewed;
  });
}

export async function readGuideForSync(source, filename) {
  // Technical changes to these pages must be merged, not copied over reviewed prose.
  const file = isAppOwned(filename) ? path.join("content/docs", filename) : path.join(source, filename);
  const text = (await readFile(file, "utf8")).replaceAll("\r\n", "\n");
  assertEditorialProse(text, file);
  return text;
}
