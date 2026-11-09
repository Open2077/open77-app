import type { Metadata } from "next";

import { JsonLd } from "@/components/json-ld";
import { LiveServerBrowser } from "@/components/servers/live-server-browser";
import { Page } from "@/components/ui/page";
import { I18nProvider } from "@/i18n/client";
import { localizeHref, type Locale } from "@/i18n/config";
import { getMessages } from "@/i18n/messages";
import type { Messages } from "@/i18n/types";
import { getPublicServer, getPublicServerSnapshot } from "@/lib/server-catalog";
import { serverProfileSummary, type ServerProfileTemplates } from "@/lib/server-profile-seo";
import { breadcrumbNode, jsonLdGraph, pageMetadata } from "@/lib/seo";
import { absoluteUrl } from "@/lib/site";

/** The words a summary adds when the operator left its name or description empty. */
function profileTemplates(m: Messages["servers"]["meta"]): ServerProfileTemplates {
  return { title: m.profileTitle, description: m.profileDescription };
}

export async function serverProfileMetadata(locale: Locale, id: string): Promise<Metadata> {
  const m = getMessages(locale).servers.meta;
  const path = `/servers/${id}`;
  const server = await getPublicServer(id);
  if (!server) return {
    ...pageMetadata({ title: m.unavailableTitle, description: m.unavailableDescription, path, locale }),
    robots: { index: false, follow: true },
  };
  const summary = serverProfileSummary(server, profileTemplates(m));
  const metadata = pageMetadata({ ...summary, path, locale });
  // Uploaded banners/icons have their own dimensions; do not assert 1200×630.
  if (summary.image) metadata.openGraph = {
    ...metadata.openGraph,
    images: [{ url: summary.image, alt: summary.title }],
  };
  return metadata;
}

/**
 * One server's profile. The page ships a snapshot of the listing so its name,
 * description and metadata are readable before JavaScript runs; the browser
 * then refreshes it. The WebPage node carries no `inLanguage`: its name and
 * description are the operator's, in whatever language they wrote them.
 */
export async function ServerProfileView({ locale, id }: { locale: Locale; id: string }) {
  const messages = getMessages(locale);
  const m = messages.servers.meta;
  const snapshot = await getPublicServerSnapshot(id);
  const server = snapshot?.server;
  const summary = server ? serverProfileSummary(server, profileTemplates(m)) : null;
  const path = `/servers/${id}`;
  const url = absoluteUrl(localizeHref(path, locale));
  return (
    <>
      <Page tone="yellow">
        <I18nProvider locale={locale} messages={{ servers: messages.servers }}>
          <LiveServerBrowser initialId={id} initialSnapshot={snapshot} />
        </I18nProvider>
      </Page>
      <JsonLd data={jsonLdGraph(
        breadcrumbNode([
          { name: messages.meta.home, path: "/" },
          { name: m.breadcrumb, path: "/servers" },
          { name: summary?.title ?? m.profileBreadcrumb, path },
        ], locale),
        ...(summary ? [{
          "@type": "WebPage",
          "@id": `${url}#webpage`,
          url,
          name: summary.title,
          description: summary.description,
          ...(summary.image ? { image: summary.image } : {}),
        }] : []),
      )} />
    </>
  );
}
