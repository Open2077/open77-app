import { Fragment, type ReactNode } from "react";

import { LOCALE_INFO, type Locale } from "./config";

/**
 * Message formatting, deliberately small.
 *
 * Messages are plain strings with three conventions translators can see and
 * move freely:
 *
 * - `{name}` is a value filled in by the code (a count, a name, a date);
 * - `<b>…</b>` style tags wrap a run of text the code renders specially (bold,
 *   a link, a keyboard key); the code decides what each tag name means;
 * - a plural is an object of CLDR categories (`one`, `few`, `many`, `other`),
 *   picked with `Intl.PluralRules` — Polish and Russian need `few` and `many`.
 *
 * The language always comes from the route, never from the browser, so the
 * prerendered markup and the hydrated markup are the same string.
 */

export type Vars = Record<string, string | number>;

/** CLDR plural forms; `other` is the only one every language needs. */
export type PluralForms = { zero?: string; one?: string; two?: string; few?: string; many?: string; other: string };

export function tag(locale: Locale): string {
  return LOCALE_INFO[locale].tag;
}

const numberFormats = new Map<string, Intl.NumberFormat>();

/** A count as the language writes it (`1 234`, `1.234`, `1,234`). */
export function formatNumber(locale: Locale, value: number, options?: Intl.NumberFormatOptions): string {
  const key = `${locale}|${JSON.stringify(options ?? {})}`;
  let format = numberFormats.get(key);
  if (!format) {
    format = new Intl.NumberFormat(tag(locale), options);
    numberFormats.set(key, format);
  }
  return format.format(value);
}

/** Replaces every `{name}` with its value; unknown names stay visible so a gap shows. */
export function fill(template: string, vars: Vars = {}): string {
  return template.replace(/\{(\w+)\}/g, (match, name: string) =>
    Object.prototype.hasOwnProperty.call(vars, name) ? String(vars[name]) : match,
  );
}

const pluralRules = new Map<Locale, Intl.PluralRules>();

/**
 * Picks the plural form for `count` and fills it. `{count}` is the number
 * formatted for the language; other variables are passed through.
 */
export function plural(locale: Locale, forms: PluralForms, count: number, vars: Vars = {}): string {
  let rules = pluralRules.get(locale);
  if (!rules) {
    rules = new Intl.PluralRules(tag(locale));
    pluralRules.set(locale, rules);
  }
  const category = rules.select(count) as keyof PluralForms;
  const template = forms[category] ?? forms.other;
  return fill(template, { count: formatNumber(locale, count), ...vars });
}

/** Capitals that respect the language (Turkish dotted İ, German ß). */
export function upper(locale: Locale, text: string): string {
  return text.toLocaleUpperCase(tag(locale));
}

export type RichTags = Record<string, (chunk: ReactNode, index: number) => ReactNode>;

/**
 * Renders a message with `<tag>…</tag>` runs and `{vars}`. Tags do not nest;
 * a tag the code does not handle renders its text plainly, so a translation
 * can never inject markup.
 */
export function rich(template: string, tags: RichTags = {}, vars: Vars = {}): ReactNode {
  const text = fill(template, vars);
  const parts: ReactNode[] = [];
  const pattern = /<(\w+)>([\s\S]*?)<\/\1>/g;
  let last = 0;
  let index = 0;
  for (let match = pattern.exec(text); match; match = pattern.exec(text)) {
    if (match.index > last) parts.push(text.slice(last, match.index));
    const [, name = "", chunk = ""] = match;
    const render = tags[name];
    parts.push(<Fragment key={index}>{render ? render(chunk, index) : chunk}</Fragment>);
    index += 1;
    last = match.index + match[0].length;
  }
  if (last < text.length) parts.push(text.slice(last));
  return parts.length === 1 && typeof parts[0] === "string" ? parts[0] : <>{parts}</>;
}

/** The text of a rich message with its tags removed (for `aria-label`, `title`, metadata). */
export function plain(template: string, vars: Vars = {}): string {
  return fill(template, vars).replace(/<\/?\w+>/g, "");
}
