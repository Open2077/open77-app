import { DEFAULT_LOCALE, type Locale } from "./config";
import type { Messages } from "./types";

import de from "./messages/de.json";
import en from "./messages/en.json";
import es from "./messages/es.json";
import fr from "./messages/fr.json";
import ja from "./messages/ja.json";
import pl from "./messages/pl.json";
import ptBR from "./messages/pt-BR.json";
import ru from "./messages/ru.json";
import th from "./messages/th.json";
import tr from "./messages/tr.json";

/**
 * Every dictionary, for server components and metadata only. Client components
 * receive the namespaces they need through `I18nProvider`, never this module:
 * importing it from a client file would ship all ten languages to the browser.
 *
 * The annotations make TypeScript reject a dictionary that misses a key or
 * changes a value's shape; `scripts/check-i18n.mjs` also rejects extra keys and
 * placeholder drift.
 */
const DICTIONARIES: Record<Locale, Messages> = {
  en,
  fr: fr satisfies Messages,
  es: es satisfies Messages,
  "pt-BR": ptBR satisfies Messages,
  de: de satisfies Messages,
  pl: pl satisfies Messages,
  ru: ru satisfies Messages,
  tr: tr satisfies Messages,
  ja: ja satisfies Messages,
  th: th satisfies Messages,
};

export function getMessages(locale: Locale): Messages {
  return DICTIONARIES[locale] ?? DICTIONARIES[DEFAULT_LOCALE];
}
