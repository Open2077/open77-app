/**
 * The docs translator's text layer (src/lib/docs-translate/text.ts): how a
 * block becomes one string with placeholders, how the translator's answer is
 * parsed back and validated, and the language-tag helpers.
 *
 * The DOM half (finding blocks, writing them back, restoring English) runs
 * against real pages with a mocked Translator in
 * scripts/check-docs-translate-browser.mjs.
 *
 * Run: node --experimental-strip-types --test scripts/test-docs-translate.mjs
 */

import test from "node:test";
import assert from "node:assert/strict";

import {
  encode,
  googleLanguage,
  googleTranslateUrl,
  hasTokenCollision,
  parse,
  plainText,
  repairSpacing,
  splitKeepTerms,
  spacesBetweenWords,
  translatorCandidates,
  worthTranslating,
} from "../src/lib/docs-translate/text.ts";

/** "Spawn a car with `vehicles.create` near [Night City](/docs/map)." */
const SENTENCE = [
  { kind: "text", text: "Spawn a car with " },
  { kind: "atom", id: 1 },
  { kind: "text", text: " near " },
  { kind: "pair", id: 2, children: [{ kind: "text", text: "the docks" }] },
  { kind: "text", text: ".\n" },
];

test("a block is sent as one sentence with numbered placeholders", () => {
  const pairs = encode(SENTENCE, "pair");
  assert.equal(pairs.text, "Spawn a car with {1} near {2}the docks{/2}.");
  assert.deepEqual([...pairs.expected], [[1, "atom"], [2, "pair"]]);
  assert.equal(pairs.trail, " ", "trailing whitespace is kept outside the sentence");

  const atoms = encode(SENTENCE, "atom");
  assert.equal(atoms.text, "Spawn a car with {1} near {2}.", "atom mode sends a link as one placeholder");
  assert.deepEqual([...atoms.expected], [[1, "atom"], [2, "atom"]]);
});

test("whitespace is collapsed as the reader sees it", () => {
  const sent = encode([{ kind: "text", text: "  Line one\n   line two  " }], "atom");
  assert.equal(sent.text, "Line one line two");
  assert.equal(sent.lead, " ");
  assert.equal(sent.trail, " ");
});

test("a reordered answer parses back into the same structure", () => {
  const { expected } = encode(SENTENCE, "pair");
  const parsed = parse("Faites apparaître une voiture près de {2}les quais{/2} avec {1}.", expected);
  assert.deepEqual(parsed, [
    { kind: "text", text: "Faites apparaître une voiture près de " },
    { kind: "pair", id: 2, children: [{ kind: "text", text: "les quais" }] },
    { kind: "text", text: " avec " },
    { kind: "atom", id: 1 },
    { kind: "text", text: "." },
  ]);
});

test("translator spellings of a placeholder are accepted", () => {
  const { expected } = encode(SENTENCE, "pair");
  const parsed = parse("Создайте машину с { 1 } около ｛2｝доков｛/ 2｝.", expected);
  assert.ok(parsed, "inner spaces and full-width braces parse");
  assert.equal(plainText(parsed), "Создайте машину с   около доков.");
});

test("an answer that lost, repeated, invented or crossed a placeholder is rejected", () => {
  const { expected } = encode(SENTENCE, "pair");
  assert.equal(parse("Une voiture près de {2}les quais{/2}.", expected), null, "missing atom");
  assert.equal(parse("Avec {1} et {1} près de {2}x{/2}.", expected), null, "repeated atom");
  assert.equal(parse("Avec {1} près de {2}x{/2} {3}.", expected), null, "unknown placeholder");
  assert.equal(parse("Avec {1} près de {2}les quais.", expected), null, "unclosed pair");
  assert.equal(parse("Avec {1}{/1} près de {2}x{/2}.", expected), null, "an atom closed like a pair");

  const nested = encode(
    [
      { kind: "pair", id: 1, children: [{ kind: "text", text: "a " }, { kind: "pair", id: 2, children: [{ kind: "text", text: "b" }] }] },
    ],
    "pair",
  );
  assert.equal(nested.text, "{1}a {2}b{/2}{/1}");
  assert.ok(parse("{1}A {2}B{/2}{/1}", nested.expected), "nesting kept");
  assert.equal(parse("{1}A {2}B{/1}{/2}", nested.expected), null, "crossed pairs");
});

test("answers are never markup: angle brackets stay text", () => {
  const parsed = parse("<img src=x onerror=alert(1)> {1}", new Map([[1, "atom"]]));
  assert.deepEqual(parsed, [{ kind: "text", text: "<img src=x onerror=alert(1)> " }, { kind: "atom", id: 1 }]);
});

test("the space a translator glued to a placeholder is put back", () => {
  const sent = encode(SENTENCE, "pair");
  const parsed = parse("Utilisez{1}près de{2}les quais{/2}.", sent.expected);
  assert.equal(
    plainText(repairSpacing(parsed, sent.spaces)).replace(/\s+/g, " "),
    "Utilisez près de les quais.",
  );
  const fixed = repairSpacing(parsed, sent.spaces);
  assert.equal(fixed[0].text, "Utilisez ");
  assert.equal(fixed[2].text, " près de ", "space restored on both sides of the text between two placeholders");
  assert.equal(spacesBetweenWords("ja"), false, "no repair for languages without spaces");
  assert.equal(spacesBetweenWords("pt-BR"), true);
});

test("text that already looks like a placeholder is detected", () => {
  assert.equal(hasTokenCollision("a table {1} here"), true);
  assert.equal(hasTokenCollision("use { 12 }"), true);
  assert.equal(hasTokenCollision("a table {x = 1}"), false);
});

test("brand names and product words are kept as written", () => {
  assert.deepEqual(splitKeepTerms("Join the OPEN//77 Discord from Night City."), [
    { keep: false, text: "Join the " },
    { keep: true, text: "OPEN//77" },
    { keep: false, text: " " },
    { keep: true, text: "Discord" },
    { keep: false, text: " from " },
    { keep: true, text: "Night City" },
    { keep: false, text: "." },
  ]);
  assert.deepEqual(splitKeepTerms("Luana and Wardens"), [{ keep: false, text: "Luana and Wardens" }], "whole words only");
  assert.deepEqual(splitKeepTerms("NCWE Studio")[0], { keep: true, text: "NCWE Studio" }, "longest term first");
});

test("identifiers, paths and numbers are not sent", () => {
  for (const text of ["world.vehicles", "server.jsonc", "OP77_LICENSE_KEY", "spawnVehicle", "/docs/api", "5.4", "1,190", "  ", "→"]) {
    assert.equal(worthTranslating(text), false, text);
  }
  for (const text of ["Optional", "Required", "Read the guide.", "Parameters", "API"]) {
    assert.equal(worthTranslating(text), true, text);
  }
});

test("Translator API language candidates fall back to the language", () => {
  assert.deepEqual(translatorCandidates("pt-BR"), ["pt-BR", "pt"]);
  assert.deepEqual(translatorCandidates("fr"), ["fr"]);
  assert.deepEqual(translatorCandidates("zh-TW"), ["zh-TW", "zh-Hant", "zh"]);
  assert.deepEqual(translatorCandidates("zh-Hans-CN"), ["zh-Hans-CN", "zh"]);
  assert.deepEqual(translatorCandidates("nb-NO"), ["nb-NO", "no", "nb"]);
  assert.deepEqual(translatorCandidates("he"), ["he", "iw"]);
});

test("Google Translate gets its own language codes and the public URL", () => {
  assert.equal(googleLanguage("pt-BR"), "pt");
  assert.equal(googleLanguage("pt-PT"), "pt-PT");
  assert.equal(googleLanguage("zh-TW"), "zh-TW");
  assert.equal(googleLanguage("zh"), "zh-CN");
  assert.equal(googleLanguage("he"), "iw");
  assert.equal(googleLanguage("fr-CA"), "fr");
  assert.equal(
    googleTranslateUrl("https://open2077.net/docs/api?side=server#server/x", "th"),
    "https://translate.google.com/translate?sl=en&tl=th&u=https%3A%2F%2Fopen2077.net%2Fdocs%2Fapi%3Fside%3Dserver%23server%2Fx",
  );
});
