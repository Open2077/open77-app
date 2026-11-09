/**
 * The text half of the docs translator: how a block of the page becomes one
 * plain string for the browser's translator, and how the answer becomes a
 * structure again.
 *
 * A block (a paragraph, a list item, a table cell…) is translated as one
 * sentence so the translator keeps its context. What must not be translated
 * inside it — inline code, icons, brand names — and the inline elements that
 * carry formatting or a link are replaced by numbered placeholders:
 *
 *   `Spawn a car with {1} near {2}Night City{/2}.`
 *
 * The answer is plain text. It is parsed back into pieces and validated: every
 * placeholder must come back exactly once and pairs must still nest. Nothing in
 * the answer is ever treated as markup; the caller builds DOM from the pieces
 * with text nodes and clones of the page's own elements.
 *
 * Pure functions only, no DOM: `scripts/test-docs-translate.mjs` runs them
 * under Node.
 */

/** One piece of a block, in the source or in a parsed translation. */
export type Piece =
  | { kind: "text"; text: string }
  /** Kept as is: inline code, an icon, a brand name. */
  | { kind: "atom"; id: number }
  /** An inline element whose own words are translated: a link, bold, a span. */
  | { kind: "pair"; id: number; children: Piece[] };

/** How a pair is sent: as `{N}…{/N}` around its words, or as one `{N}` translated on its own. */
export type PairMode = "pair" | "atom";

/** `{1}`, `{/1}`, and what translators make of them: inner spaces, full-width braces. */
const TOKEN = /[{｛]\s*(\/?)\s*(\d{1,3})\s*[}｝]/g;

/** Words that stay as written in every language (see `src/i18n/messages/GLOSSARY.md`). */
export const KEEP_TERMS = [
  "OPEN//77",
  "Open2077",
  "Open77",
  "NCWE Studio",
  "NCWE",
  "Workshop",
  "Warden",
  "Discord",
  "GitHub",
  "WolvenKit",
  "ArchiveXL",
  "TweakXL",
  "RED4ext",
  "REDengine",
  "Cyberpunk 2077",
  "Night City",
  "CD PROJEKT RED",
  "Open Alpha",
  "Lua",
] as const;

const KEEP = new RegExp(
  `(?<![\\p{L}\\p{N}])(?:${[...KEEP_TERMS]
    .sort((a, b) => b.length - a.length)
    .map((term) => term.replace(/[.*+?^${}()|[\]\\/]/g, "\\$&"))
    .join("|")})(?![\\p{L}\\p{N}])`,
  "gu",
);

/** Splits running text around the words that are never translated. */
export function splitKeepTerms(text: string): Array<{ keep: boolean; text: string }> {
  const out: Array<{ keep: boolean; text: string }> = [];
  let cursor = 0;
  for (const match of text.matchAll(KEEP)) {
    const start = match.index ?? 0;
    if (start > cursor) out.push({ keep: false, text: text.slice(cursor, start) });
    out.push({ keep: true, text: match[0] });
    cursor = start + match[0].length;
  }
  if (cursor < text.length) out.push({ keep: false, text: text.slice(cursor) });
  return out;
}

/** True when the text already holds something that reads as a placeholder. */
export function hasTokenCollision(text: string): boolean {
  TOKEN.lastIndex = 0;
  return TOKEN.test(text);
}

/**
 * Whether a run of words is worth sending at all: it has letters, and it is
 * not a lone identifier, path or command (`world.vehicles`, `server.jsonc`,
 * `OP77_LICENSE_KEY`, `spawnVehicle`), which reads the same in every language.
 */
export function worthTranslating(text: string): boolean {
  const trimmed = text.trim();
  if (!/\p{L}/u.test(trimmed)) return false;
  if (/\s/.test(trimmed)) return true;
  return !looksLikeIdentifier(trimmed);
}

export function looksLikeIdentifier(word: string): boolean {
  if (/[._/\\:@$#<>=()[\]{}|`~^*+]/.test(word.replace(/[.:!?,;]+$/, ""))) return true;
  if (/\p{Ll}\p{Lu}/u.test(word)) return true; // camelCase
  if (/^[\p{Lu}\p{N}_-]{2,}$/u.test(word) && /[_\p{N}]/u.test(word)) return true; // ENV_VARS, H264
  return false;
}

/** The words of a piece list, placeholders left out. */
export function plainText(pieces: Piece[]): string {
  return pieces.map((piece) => (piece.kind === "text" ? piece.text : piece.kind === "pair" ? plainText(piece.children) : " ")).join("");
}

export function hasPairs(pieces: Piece[]): boolean {
  return pieces.some((piece) => piece.kind === "pair");
}

/** HTML collapses runs of whitespace; the translator should see what the reader sees. */
export function collapseWhitespace(text: string): string {
  return text.replace(/[\t\n\f\r ]+/g, " ");
}

export type Encoded = {
  /** What is sent: trimmed, whitespace collapsed. */
  text: string;
  /** Whitespace the source had around it, put back around the answer. */
  lead: string;
  trail: string;
  /** Every placeholder sent, with how it must come back. */
  expected: Map<number, "atom" | "pair">;
  /** Whether the source had a space before an opening / after a closing placeholder. */
  spaces: Map<number, { before: boolean; after: boolean }>;
};

/** Turns pieces into the string sent to the translator. */
export function encode(pieces: Piece[], mode: PairMode): Encoded {
  const expected = new Map<number, "atom" | "pair">();
  const marks: Array<{ id: number; at: number; side: "open" | "close" }> = [];
  let out = "";
  const walk = (list: Piece[]) => {
    for (const piece of list) {
      if (piece.kind === "text") {
        out += collapseWhitespace(piece.text);
      } else if (piece.kind === "atom" || mode === "atom") {
        expected.set(piece.id, "atom");
        marks.push({ id: piece.id, at: out.length, side: "open" });
        out += `{${piece.id}}`;
        marks.push({ id: piece.id, at: out.length, side: "close" });
      } else {
        expected.set(piece.id, "pair");
        marks.push({ id: piece.id, at: out.length, side: "open" });
        out += `{${piece.id}}`;
        walk(piece.children);
        out += `{/${piece.id}}`;
        marks.push({ id: piece.id, at: out.length, side: "close" });
      }
    }
  };
  walk(pieces);

  const spaces = new Map<number, { before: boolean; after: boolean }>();
  for (const mark of marks) {
    const entry = spaces.get(mark.id) ?? { before: false, after: false };
    if (mark.side === "open") entry.before = mark.at > 0 && /\s/.test(out[mark.at - 1] ?? "");
    else entry.after = /\s/.test(out[mark.at] ?? "");
    spaces.set(mark.id, entry);
  }

  const lead = /^\s*/.exec(out)?.[0] ?? "";
  const trail = /\s*$/.exec(out)?.[0] ?? "";
  return { text: out.trim(), lead: lead ? " " : "", trail: trail && out.trim() ? " " : "", expected, spaces };
}

/**
 * Parses a translation back into pieces. Null when a placeholder is missing,
 * repeated, unknown, unclosed or crossed with another: the caller then tries a
 * simpler encoding instead of guessing.
 */
export function parse(translated: string, expected: Map<number, "atom" | "pair">): Piece[] | null {
  const root: Piece[] = [];
  const stack: Array<{ id: number; children: Piece[] }> = [];
  const seen = new Set<number>();
  const current = () => stack.at(-1)?.children ?? root;
  let cursor = 0;

  TOKEN.lastIndex = 0;
  for (const match of translated.matchAll(TOKEN)) {
    const start = match.index ?? 0;
    if (start > cursor) current().push({ kind: "text", text: translated.slice(cursor, start) });
    cursor = start + match[0].length;

    const closing = match[1] === "/";
    const id = Number(match[2]);
    const kind = expected.get(id);
    if (!kind) return null;

    if (closing) {
      if (kind !== "pair" || stack.at(-1)?.id !== id) return null;
      const done = stack.pop()!;
      current().push({ kind: "pair", id, children: done.children });
      continue;
    }
    if (seen.has(id)) return null;
    seen.add(id);
    if (kind === "atom") current().push({ kind: "atom", id });
    else stack.push({ id, children: [] });
  }
  if (stack.length) return null;
  if (cursor < translated.length) root.push({ kind: "text", text: translated.slice(cursor) });
  if (seen.size !== expected.size) return null;
  return root;
}

/**
 * Translators tend to swallow the space next to a placeholder (`utilisez{1}pour`).
 * Where the source had one and the answer glues a word to the placeholder, put
 * it back. Only for languages that separate words with spaces.
 */
export function repairSpacing(pieces: Piece[], spaces: Encoded["spaces"]): Piece[] {
  const fix = (list: Piece[]): Piece[] => {
    const out = list.map((piece) => (piece.kind === "pair" ? { ...piece, children: fix(piece.children) } : { ...piece }));
    for (let index = 0; index < out.length; index += 1) {
      const piece = out[index]!;
      if (piece.kind === "text") continue;
      const flags = spaces.get(piece.id);
      if (!flags) continue;
      const before = out[index - 1];
      const after = out[index + 1];
      if (flags.before && before?.kind === "text" && /[\p{L}\p{N},.;:!?)]$/u.test(before.text)) before.text += " ";
      if (flags.after && after?.kind === "text" && /^[\p{L}\p{N}(]/u.test(after.text)) after.text = ` ${after.text}`;
    }
    return out;
  };
  return fix(pieces);
}

/** Every placeholder id in a piece list, nested pairs included. */
export function pieceIds(pieces: Piece[]): number[] {
  return pieces.flatMap((piece) => (piece.kind === "text" ? [] : piece.kind === "atom" ? [piece.id] : [piece.id, ...pieceIds(piece.children)]));
}

/* -------------------------------------------------------------------------- */
/* Languages                                                                  */
/* -------------------------------------------------------------------------- */

/** `"pt-BR"` → `{ language: "pt", script: null, region: "BR" }`, from a canonical tag. */
export function tagParts(tag: string): { language: string; script: string | null; region: string | null } {
  const parts = tag.split("-");
  const language = (parts[0] ?? "").toLowerCase();
  let script: string | null = null;
  let region: string | null = null;
  for (const part of parts.slice(1)) {
    if (/^[A-Za-z]{4}$/.test(part) && !script && !region) script = part[0]!.toUpperCase() + part.slice(1).toLowerCase();
    else if ((/^[A-Za-z]{2}$/.test(part) || /^\d{3}$/.test(part)) && !region) region = part.toUpperCase();
    else break;
  }
  return { language, script, region };
}

/** A browser-reported language tag in canonical form, or null if it is not one. */
export function canonicalTag(tag: string | null | undefined): string | null {
  if (!tag || typeof tag !== "string" || tag.length > 40) return null;
  try {
    return Intl.getCanonicalLocales(tag.trim())[0] ?? null;
  } catch {
    return null;
  }
}

export function isEnglish(tag: string): boolean {
  return tagParts(tag).language === "en";
}

function isTraditionalChinese(tag: string): boolean {
  const { script, region } = tagParts(tag);
  return script === "Hant" || (!script && (region === "TW" || region === "HK" || region === "MO"));
}

/**
 * The tags to offer the Translator API for a visitor's language, best first.
 * Chrome lists its languages as short codes (`pt`, `zh`, `zh-Hant`), so a
 * regional tag falls back to its language.
 */
export function translatorCandidates(tag: string): string[] {
  const { language } = tagParts(tag);
  const out = [tag];
  if (language === "zh") out.push(isTraditionalChinese(tag) ? "zh-Hant" : "zh");
  if (language === "nb" || language === "nn") out.push("no");
  if (language === "he") out.push("iw");
  if (language === "fil") out.push("tl");
  out.push(language);
  return [...new Set(out.filter(Boolean))];
}

/** Google Translate's code for a language (`tl=`). */
export function googleLanguage(tag: string): string {
  const { language, region } = tagParts(tag);
  if (language === "zh") return isTraditionalChinese(tag) ? "zh-TW" : "zh-CN";
  if (language === "pt") return region === "PT" ? "pt-PT" : "pt";
  if (language === "he") return "iw";
  if (language === "nb" || language === "nn") return "no";
  return language;
}

/**
 * Google Translate's proxy view of a public page. The page must be reachable
 * from the internet, so the caller passes the canonical site URL, never a local
 * or preview origin.
 */
export function googleTranslateUrl(pageUrl: string, tag: string): string {
  return `https://translate.google.com/translate?sl=en&tl=${encodeURIComponent(googleLanguage(tag))}&u=${encodeURIComponent(pageUrl)}`;
}

/** Languages written without spaces between words: no spacing repair, no word splitting. */
export function spacesBetweenWords(tag: string): boolean {
  return !["zh", "ja", "th", "lo", "km", "my", "bo"].includes(tagParts(tag).language);
}
