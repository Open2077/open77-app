import type { Metadata } from "next";
import { JsonLd } from "@/components/json-ld";
import { LiveServerBrowser } from "@/components/servers/live-server-browser";
import { Page } from "@/components/ui/page";
import { getPublicServer, getPublicServerSnapshot } from "@/lib/server-catalog";
import { serverProfileSummary } from "@/lib/server-profile-seo";
import { breadcrumbNode, jsonLdGraph, pageMetadata } from "@/lib/seo";
import { absoluteUrl } from "@/lib/site";

// Profiles are generated on first visit. ISR refreshes their text/images while
// the browser refreshes live data; builds must not fan out a request per server
// against the master's shared public rate limit. The sitemap still lists them.
export const revalidate = 300;
export const dynamicParams = true;

export async function generateStaticParams() {
  return [];
}

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  const server = await getPublicServer(id);
  if (!server) return {
    ...pageMetadata({ title: "Server unavailable", description: "This server is not currently in the OPEN//77 public directory.", path: `/servers/${id}` }),
    robots: { index: false, follow: true },
  };
  const summary = serverProfileSummary(server);
  const metadata = pageMetadata({ ...summary, path: `/servers/${id}` });
  // Uploaded banners/icons have their own dimensions; do not assert 1200×630.
  if (summary.image) metadata.openGraph = {
    ...metadata.openGraph,
    images: [{ url: summary.image, alt: summary.title }],
  };
  return metadata;
}

export default async function ServerPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const snapshot = await getPublicServerSnapshot(id);
  const server = snapshot?.server;
  const summary = server ? serverProfileSummary(server) : null;
  return (
    <>
      <Page tone="yellow">
        <LiveServerBrowser initialId={id} initialSnapshot={snapshot} />
      </Page>
      <JsonLd data={jsonLdGraph(
        breadcrumbNode([
          { name: "Home", path: "/" },
          { name: "Servers", path: "/servers" },
          { name: summary?.title ?? "Server details", path: `/servers/${id}` },
        ]),
        ...(summary ? [{
          "@type": "WebPage",
          "@id": `${absoluteUrl(`/servers/${id}`)}#webpage`,
          url: absoluteUrl(`/servers/${id}`),
          name: summary.title,
          description: summary.description,
          ...(summary.image ? { image: summary.image } : {}),
        }] : []),
      )} />
    </>
  );
}
