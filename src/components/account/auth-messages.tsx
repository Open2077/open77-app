import type { ReactNode } from "react";

import { I18nProvider } from "@/i18n/client";
import type { Locale } from "@/i18n/config";
import { getMessages } from "@/i18n/messages";

/**
 * Hands the sign-in funnel's strings (`auth`) to the account components below.
 * Only the pages that show a sign-in panel, a recovery form or an account gate
 * carry them, so the rest of the site does not ship them.
 */
export function AuthMessages({ locale, children }: { locale: Locale; children: ReactNode }) {
  return (
    <I18nProvider locale={locale} messages={{ auth: getMessages(locale).auth }}>
      {children}
    </I18nProvider>
  );
}
