import type { ReactNode } from "react";

import { DocsFrame } from "@/components/docs/docs-frame";
import type { SearchEntry } from "@/components/docs/docs-search";
import { LOCALES, type Locale } from "@/i18n/config";
import { getMessages } from "@/i18n/messages";
import type { Messages } from "@/i18n/types";
import { getApiIndex, stripInlineMarkdown } from "@/lib/api-reference";
import { getDocsSearchIndex } from "@/lib/docs";

export default async function DocsLayout({ children }: { children: ReactNode }) {
  const [guides, api] = await Promise.all([getDocsSearchIndex(), getApiIndex()]);
  const search: SearchEntry[] = [
    ...guides.map((guide) => ({
      title: guide.nav,
      description: guide.description,
      category: guide.section,
      href: guide.href,
      kind: "guide" as const,
    })),
    ...api.entries.map((entry) => ({
      title: entry.qualified,
      description: stripInlineMarkdown(entry.summary),
      category: `${entry.runtime} API`,
      href: `/docs/api#${entry.runtime}/${entry.namespaceSlug}/${entry.anchor}`,
      kind: "api" as const,
    })),
  ];
  // The translate control speaks the reader's language, which only the browser
  // knows: every dictionary's few strings ship with the (static) docs layout.
  const translateMessages = Object.fromEntries(
    LOCALES.map((locale) => [locale, getMessages(locale).docsTranslate]),
  ) as Record<Locale, Messages["docsTranslate"]>;
  return (
    <DocsFrame entries={search} translateMessages={translateMessages}>
      {children}
    </DocsFrame>
  );
}
