import { StatusDashboard } from "@/components/status/status-dashboard";
import { Page } from "@/components/ui/page";
import { I18nProvider } from "@/i18n/client";
import type { Locale } from "@/i18n/config";
import { getMessages } from "@/i18n/messages";
import { pageMetadata } from "@/lib/seo";

export function statusMetadata(locale: Locale) {
  const m = getMessages(locale).status;
  return pageMetadata({ title: m.metaTitle, description: m.metaDescription, path: "/status", locale });
}

export function StatusView({ locale }: { locale: Locale }) {
  return (
    <Page tone="yellow">
      <I18nProvider locale={locale} messages={{ status: getMessages(locale).status }}>
        <StatusDashboard />
      </I18nProvider>
    </Page>
  );
}
