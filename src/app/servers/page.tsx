import { Eyebrow } from "@/components/brand";
import { JsonLd } from "@/components/json-ld";
import { LiveServerBrowser } from "@/components/servers/live-server-browser";
import { SiteFooter } from "@/components/site-footer";
import { breadcrumbNode, collectionPageNode, jsonLdGraph, pageMetadata } from "@/lib/seo";

export const metadata = pageMetadata({
  title: "Server browser",
  description:
    "Browse live OPEN//77 community servers for Cyberpunk 2077. Search, compare player counts, and filter by mode, region and language — straight from the OPEN//77 master directory.",
  path: "/servers",
});

export default function ServersPage() {
  return (
    <>
      <main id="main" className="sb-page">
        <div className="section-inner section-inner-wide">
          <header className="sb-head">
            <div className="sb-head-title">
              <Eyebrow>SERVER BROWSER</Eyebrow>
              <h1 className="sb-title">Find your world.</h1>
            </div>
          </header>

          <LiveServerBrowser />
        </div>
      </main>

      <SiteFooter fineprint="Live listings from the OPEN//77 master directory." />

      {/*
        Deliberately no ItemList of the listings: the directory is live and
        fetched client-side, so the prerendered HTML carries no server rows to
        emit as structured data. The page still declares itself a collection.
      */}
      <JsonLd
        data={jsonLdGraph(
          collectionPageNode({
            name: "OPEN//77 server browser",
            description:
              "Live directory of OPEN//77 community servers for Cyberpunk 2077, served from the OPEN//77 master.",
            path: "/servers",
          }),
          breadcrumbNode([
            { name: "Home", path: "/" },
            { name: "Servers", path: "/servers" },
          ]),
        )}
      />
    </>
  );
}
