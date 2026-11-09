import type { ReactNode } from "react";

import { JsonLd } from "@/components/json-ld";
import { Footer } from "@/components/site/footer";
import { Header } from "@/components/site/header";
import { I18nProvider } from "@/i18n/client";
import { LOCALE_INFO, type Locale } from "@/i18n/config";
import { getMessages } from "@/i18n/messages";
import { fontVariables } from "@/lib/fonts";
import { jsonLdGraph, organizationNode, websiteNode } from "@/lib/seo";

import noiseStyles from "@/components/site/noise.module.css";

/**
 * The document every page shares: `<html>` in the page language, the header,
 * the footer and the site-wide structured data. Both root layouts render it —
 * `(en)` for the English site and `[lang]` for the other languages — because a
 * root layout is the only place `<html lang>` can be set on a static page.
 */
export function SiteDocument({ locale, children }: { locale: Locale; children: ReactNode }) {
  const messages = getMessages(locale);
  return (
    <html lang={LOCALE_INFO[locale].tag} dir="ltr" suppressHydrationWarning>
      <body className={fontVariables}>
        <I18nProvider locale={locale} messages={{ chrome: messages.chrome, common: messages.common }}>
          <a className="skip-link" href="#main">
            {messages.chrome.skip}
          </a>
          <Header />
          {children}
          <Footer />
        </I18nProvider>
        <div className={noiseStyles.noise} aria-hidden="true" />
        <JsonLd data={jsonLdGraph(organizationNode(), websiteNode(locale))} />
      </body>
    </html>
  );
}
