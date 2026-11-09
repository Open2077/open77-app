import assert from "node:assert/strict";
import { access, readFile } from "node:fs/promises";

import { editorialIssues } from "./docs-editorial.mjs";

/**
 * The site dictionaries stay in step with English, the source language.
 *
 * For every language: the same keys, the same value kinds, the same
 * `{placeholders}` and `<tags>` in each string (the code fills and renders
 * them by name), the plural forms the language's integers need
 * (`Intl.PluralRules`), lists of cards, steps and questions as long as
 * English (the code pairs them with icons and links by position), display
 * titles free to split into a different number of lines (translators control
 * the split) with accent indices that point at a real line, and the brand
 * names left as they are. Also checks that every translated route exists in
 * both route trees and in the proxy matcher.
 */

const LOCALES = ["en", "fr", "es", "pt-BR", "de", "pl", "ru", "tr"];
const SOURCE = "en";
const PLURAL_KEYS = new Set(["zero", "one", "two", "few", "many", "other"]);
/** Written exactly as in English wherever English has them (see GLOSSARY.md). */
const BRANDS = [
  "OPEN//77", "Open77", "Open2077", "NCWE", "Workshop", "Warden", "Discord", "GitHub", "ArchiveXL", "WolvenKit", "RED4ext",
  "Cyberpunk 2077", "Phantom Liberty", "Night City", "CD PROJEKT RED", "REDengine", "Open Alpha",
];
/** CD PROJEKT RED's own release titles where they differ from English (same rule as the launcher). */
const LOCAL_TITLES = { pl: { "Phantom Liberty": "Widmo wolności" }, ru: { "Phantom Liberty": "Призрачная свобода" } };
/** Above this share of strings identical to English, a dictionary is treated as untranslated. */
const MAX_IDENTICAL = 0.3;

const read = async (file) => JSON.parse(await readFile(file, "utf8"));
const dictionaries = Object.fromEntries(
  await Promise.all(LOCALES.map(async (locale) => [locale, await read(`src/i18n/messages/${locale}.json`)])),
);
const problems = [];
const kind = (value) => (Array.isArray(value) ? "array" : value === null ? "null" : typeof value);
const isPlural = (value) =>
  kind(value) === "object" && "other" in value && Object.keys(value).every((key) => PLURAL_KEYS.has(key));
const placeholders = (text) => [...text.matchAll(/\{(\w+)\}/g)].map((match) => match[1]).sort();
const tags = (text) => [...text.matchAll(/<(\w+)>/g)].map((match) => match[1]).sort();
const same = (a, b) => a.length === b.length && a.every((value, index) => value === b[index]);
const normal = (text) => text.replaceAll(" ", " ");
/** A display title split into lines: an array of strings with an `accent` sibling, or a key named title/lines. */
const isLines = (key, value, parent) =>
  Array.isArray(value) && value.every((item) => typeof item === "string") && (key === "title" || key === "lines" || "accent" in (parent ?? {}));

/** The plural categories a language's integers 0–10 000 actually use. */
function neededPlurals(locale) {
  const rules = new Intl.PluralRules(locale);
  const needed = new Set();
  for (let n = 0; n <= 10_000; n++) needed.add(rules.select(n));
  return needed;
}

function compareString(locale, path, source, target) {
  if (!same(placeholders(source), placeholders(target))) {
    problems.push(`${locale} ${path}: placeholders ${placeholders(target).join(",") || "none"} ≠ English ${placeholders(source).join(",") || "none"}`);
  }
  if (!same(tags(source), tags(target))) {
    problems.push(`${locale} ${path}: tags <${tags(target).join(">,<")}> ≠ English <${tags(source).join(">,<")}>`);
  }
  if (target.trim() === "" && source.trim() !== "") problems.push(`${locale} ${path}: empty`);
  for (const brand of BRANDS) {
    const expected = LOCAL_TITLES[locale]?.[brand] ?? brand;
    if (normal(source).includes(brand) && !normal(target).includes(expected)) problems.push(`${locale} ${path}: "${expected}" expected`);
  }
}

let total = 0;
const identical = Object.fromEntries(LOCALES.map((locale) => [locale, 0]));

function compare(locale, path, source, target, key, parent) {
  if (kind(source) !== kind(target)) {
    problems.push(`${locale} ${path}: ${kind(target)} where English has ${kind(source)}`);
    return;
  }
  if (typeof source === "string") {
    if (locale === LOCALES[1]) total++;
    if (source === target && /[A-Za-z]{3}/.test(source)) identical[locale]++;
    compareString(locale, path, source, target);
    return;
  }
  if (typeof source === "number") return;
  if (isPlural(source)) {
    if (!isPlural(target)) {
      problems.push(`${locale} ${path}: plural forms expected`);
      return;
    }
    for (const category of neededPlurals(locale)) {
      if (!(category in target)) problems.push(`${locale} ${path}: plural form "${category}" missing`);
    }
    const allowed = placeholders(source.other);
    for (const [category, text] of Object.entries(target)) {
      if (locale === LOCALES[1] && category === "other") total++;
      if (category === "other" && text === source.other) identical[locale]++;
      const used = placeholders(text);
      if (!used.every((name) => allowed.includes(name))) problems.push(`${locale} ${path}.${category}: unknown placeholder`);
      if (!same(tags(text), tags(source.other))) problems.push(`${locale} ${path}.${category}: tags differ`);
    }
    if (!same(placeholders(target.other), allowed)) problems.push(`${locale} ${path}.other: placeholders differ from English`);
    return;
  }
  if (Array.isArray(source)) {
    if (isLines(key, source, parent)) {
      if (target.length < 1) problems.push(`${locale} ${path}: no lines`);
      for (const [index, line] of target.entries()) {
        if (typeof line !== "string" || !line.trim()) problems.push(`${locale} ${path}[${index}]: empty line`);
      }
      if (locale !== SOURCE) {
        total += locale === LOCALES[1] ? 1 : 0;
        if (same(source, target)) identical[locale]++;
        compareString(locale, path, source.join(" "), target.join(" "));
      }
      return;
    }
    if (key === "accent") return; // checked against its title below
    if (source.length !== target.length) {
      problems.push(`${locale} ${path}: ${target.length} items where English has ${source.length}`);
      return;
    }
    source.forEach((item, index) => compare(locale, `${path}[${index}]`, item, target[index], String(index), source));
    return;
  }
  for (const name of Object.keys(source)) {
    if (!(name in target)) problems.push(`${locale} ${path}.${name}: missing`);
    else compare(locale, `${path}.${name}`, source[name], target[name], name, source);
  }
  for (const name of Object.keys(target)) {
    if (!(name in source)) problems.push(`${locale} ${path}.${name}: not in English`);
  }
  // Accent indices must point at a line of the (possibly re-split) title.
  if (Array.isArray(target.accent)) {
    const lines = Array.isArray(target.title) ? target.title : Array.isArray(target.lines) ? target.lines : null;
    if (lines) {
      for (const index of target.accent) {
        if (!Number.isInteger(index) || index < 0 || index >= lines.length) problems.push(`${locale} ${path}.accent: ${index} is not a line`);
      }
    }
  }
}

for (const locale of LOCALES) compare(locale, "", dictionaries[SOURCE], dictionaries[locale], "", null);

// English is site copy: the documentation's editorial rules apply to it too.
(function walk(value, path) {
  if (typeof value === "string") {
    for (const issue of editorialIssues(value)) problems.push(`en ${path}: ${issue.reason}: ${issue.excerpt}`);
  } else if (value && typeof value === "object") {
    for (const [key, child] of Object.entries(value)) walk(child, `${path}.${key}`);
  }
})(dictionaries[SOURCE], "");

for (const locale of LOCALES.slice(1)) {
  const share = identical[locale] / Math.max(total, 1);
  if (share > MAX_IDENTICAL) {
    problems.push(`${locale}: ${Math.round(share * 100)}% of strings are still English (limit ${MAX_IDENTICAL * 100}%)`);
  }
}

// Every translated page exists in both route trees, and the proxy sees it.
const config = await readFile("src/i18n/config.ts", "utf8");
const block = /LOCALIZED_ROUTES = \[([\s\S]*?)\] as const/.exec(config)?.[1] ?? "";
const routes = [...block.matchAll(/"(\/[^"]*)"/g)].map((match) => match[1]);
assert.ok(routes.length > 5, "LOCALIZED_ROUTES not found in src/i18n/config.ts");
const proxy = await readFile("src/proxy.ts", "utf8");
for (const route of routes) {
  const dir = route === "/" ? "" : route.replace("/*", "/[id]");
  for (const tree of ["(en)", "[lang]"]) {
    const file = `src/app/${tree}${dir}/page.tsx`;
    try {
      await access(file);
    } catch {
      problems.push(`route ${route}: ${file} is missing`);
    }
  }
  const segment = route.split("/")[1];
  if (segment && !proxy.includes(segment)) problems.push(`route ${route}: not in the proxy matcher`);
}

if (problems.length) {
  console.error(problems.slice(0, 200).join("\n"));
  if (problems.length > 200) console.error(`… and ${problems.length - 200} more`);
  process.exitCode = 1;
} else {
  const shares = LOCALES.slice(1).map((locale) => `${locale} ${Math.round((identical[locale] / Math.max(total, 1)) * 100)}%`);
  console.log(`i18n: ${LOCALES.length} dictionaries, ${total} strings each, keys/placeholders/tags/plurals in step; ${routes.length} translated routes in both trees and the proxy. Still English (brand names, codes): ${shares.join(", ")}.`);
}
