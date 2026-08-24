import type { Metadata } from "next";
import Link from "next/link";

import { ArrowLeftIcon } from "@/components/icons";
import { JsonLd } from "@/components/json-ld";
import { ServerDetail } from "@/components/servers/server-detail";
import { SiteFooter } from "@/components/site-footer";
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
        "Live details for an OPEN//77 community server — players, region, version and how to connect, straight from the master directory.",
      path: `/servers/${id}`,
    }),
    robots: { index: false, follow: false },
  };
}

export default async function ServerPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  return (
    <>
      <main id="main" className="sv-page">
        <div className="section-inner section-inner-wide">
          <p className="sv-back">
            <Link href="/servers">
              <ArrowLeftIcon />
              Back to server browser
            </Link>
          </p>

          <ServerDetail id={id} />
        </div>
      </main>

      <SiteFooter fineprint="Live server details from the OPEN//77 master directory." />

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
