import Link from "next/link";

import { Eyebrow, SlashMark } from "@/components/brand";
import { JsonLd } from "@/components/json-ld";
import { DemoDataNotice } from "@/components/servers/demo-data-notice";
import { ServerBrowser } from "@/components/servers/server-browser";
import { SiteFooter } from "@/components/site-footer";
import { breadcrumbNode, collectionPageNode, jsonLdGraph, pageMetadata } from "@/lib/seo";
import { serverDirectory, type GameServer } from "@/lib/servers";

export const metadata = pageMetadata({
  title: "Server browser",
  description:
    "Browse OPEN//77 community servers for Cyberpunk 2077. Search, compare player counts, filter by mode, region and language. Pre-alpha: the public directory opens with the first alpha build.",
  path: "/servers",
});

function FeaturedRail({ servers }: { servers: GameServer[] }) {
  return (
    <aside className="sb-col-featured" aria-label="Featured servers">
      <div className="sb-col-head">
        <h2>Featured</h2>
        <span className="mini-chip">DEMO</span>
      </div>
      <ul className="sb-featured-list">
        {servers.map((server) => (
          <li key={server.id}>
            <Link className="sb-feat-card" href={`/servers/${server.id}`}>
              <span
                className="sb-feat-thumb"
                style={{ backgroundImage: `url('${server.banner}')` }}
                aria-hidden="true"
              />
              <span className="sb-feat-body">
                <span className="sb-feat-name">{server.name}</span>
                <span className="sb-feat-meta">
                  <strong>
                    {server.players} / {server.max}
                  </strong>{" "}
                  players · {server.ping} ms
                </span>
                <span className="sb-feat-mode">
                  <SlashMark />
                  {server.mode.toUpperCase()}
                </span>
              </span>
            </Link>
          </li>
        ))}
      </ul>
      <div className="sb-owner-cta">
        <p>Run your own world and it shows up here.</p>
        <Link className="btn btn-ghost btn-small" href="/create">
          Create a server
        </Link>
      </div>
    </aside>
  );
}

export default async function ServersPage() {
  const servers = await serverDirectory.list();
  const featured = servers.filter((server) => server.featured);

  return (
    <>
      <main id="main" className="sb-page">
        <div className="section-inner section-inner-wide">
          <header className="sb-head">
            <div className="sb-head-title">
              <Eyebrow>SERVER BROWSER</Eyebrow>
              <h1 className="sb-title">Find your world.</h1>
            </div>
            {servers.length > 0 ? <DemoDataNotice /> : null}
          </header>

          <ServerBrowser
            servers={servers}
            featured={featured.length > 0 ? <FeaturedRail servers={featured} /> : null}
          />
        </div>
      </main>

      <SiteFooter
        fineprint={
          servers.length > 0
            ? "Pre-alpha. All server listings on this page are demo data, not live statistics."
            : "Pre-alpha. No public servers exist yet; the directory opens with the first alpha build."
        }
      />

      {/*
        Deliberately no ItemList of the listings: emitting structured data for
        invented servers would hand search engines and answer engines a machine
        readable claim that these communities exist. The page describes itself as
        a collection and says in prose that the data is illustrative.
      */}
      <JsonLd
        data={jsonLdGraph(
          collectionPageNode({
            name: "OPEN//77 server browser",
            description:
              "Directory of OPEN//77 community servers for Cyberpunk 2077. During pre-alpha no public servers exist; live listings arrive with the first alpha build.",
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
