import type { Metadata } from "next";
import { JsonLd } from "@/components/json-ld";
import { LiveServerBrowser } from "@/components/servers/live-server-browser";
import { breadcrumbNode, jsonLdGraph, pageMetadata } from "@/lib/seo";

/**
 * The detail page reads the live master directory in the browser (Cloudflare/CORS,
 * same as the browser list), so the route can never be statically pre-rendered
 * with real data — `generateStaticParams`/`dynamicParams` are gone on purpose.
 * Metadata is therefore generic and the surface is marked noindex: the listing is
 * live and volatile, and the prerendered HTML carries no server-specific content.
 */
export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  return {
    ...pageMetadata({
      title: "Server details",
      description:
        "Live details for an OPEN//77 community server: players, region, version and how to connect, straight from the master directory.",
      path: `/servers/${id}`,
    }),
    robots: { index: false, follow: false },
  };
}

export default async function ServerPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  return (
    <>
      <main id="main" className="sb-page">
        <LiveServerBrowser initialId={id} />
      </main>

      {/* Only the navigational trail is emitted: the listing is live and
          client-fetched, so there is no server-specific data to mark up here. */}
      <JsonLd
        data={jsonLdGraph(
          breadcrumbNode([
            { name: "Home", path: "/" },
            { name: "Servers", path: "/servers" },
            { name: "Server details", path: `/servers/${id}` },
          ]),
        )}
      />
    </>
  );
}
