import { JsonLd } from "@/components/json-ld";
import { LiveServerBrowser } from "@/components/servers/live-server-browser";
import { Page } from "@/components/ui/page";
import { I18nProvider } from "@/i18n/client";
import type { Locale } from "@/i18n/config";
import { getMessages } from "@/i18n/messages";
import { breadcrumbNode, collectionPageNode, jsonLdGraph, pageMetadata } from "@/lib/seo";

export function serversMetadata(locale: Locale) {
  const m = getMessages(locale).servers.meta;
  return pageMetadata({ title: m.title, description: m.description, path: "/servers", locale });
}

/**
 * The server directory. The listings are live and fetched in the browser; only
 * the chrome around them is translated. Server names, descriptions, tags and
 * modes are shown as their operators wrote them.
 */
export function ServersView({ locale }: { locale: Locale }) {
  const messages = getMessages(locale);
  const m = messages.servers.meta;
  return (
    <>
      <Page tone="yellow">
        <I18nProvider locale={locale} messages={{ servers: messages.servers }}>
          <LiveServerBrowser />
        </I18nProvider>
      </Page>

      {/*
        Deliberately no ItemList of the listings: the directory is live and
        fetched client-side, so the prerendered HTML carries no server rows to
        emit as structured data. The page still declares itself a collection.
      */}
      <JsonLd
        data={jsonLdGraph(
          collectionPageNode({
            name: m.collectionName,
            description: m.collectionDescription,
            path: "/servers",
            locale,
          }),
          breadcrumbNode(
            [
              { name: messages.meta.home, path: "/" },
              { name: m.breadcrumb, path: "/servers" },
            ],
            locale,
          ),
        )}
      />
    </>
  );
}
