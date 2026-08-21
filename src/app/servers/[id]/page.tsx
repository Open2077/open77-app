import Link from "next/link";
import { notFound } from "next/navigation";

import { SlashMark } from "@/components/brand";
import { ArrowLeftIcon, DiscordIcon, GlobeIcon } from "@/components/icons";
import { JsonLd } from "@/components/json-ld";
import { DemoDataNotice } from "@/components/servers/demo-data-notice";
import { ServerActions } from "@/components/servers/server-actions";
import { SiteFooter } from "@/components/site-footer";
import { breadcrumbNode, jsonLdGraph, pageMetadata } from "@/lib/seo";
import {
  occupancyPercent,
  pingClass,
  samplePlayers,
  serverDirectory,
  type GameServer,
} from "@/lib/servers";

/**
 * Only the ids in the directory are valid routes.
 *
 * With `dynamicParams` off, anything else is a static 404 instead of an
 * on-demand render, which is the correct answer for a directory whose full
 * contents are known at build time.
 */
export const dynamicParams = false;

export async function generateStaticParams() {
  const servers = await serverDirectory.list();
  return servers.map((server) => ({ id: server.id }));
}

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const server = await serverDirectory.get(id);
  if (!server) return pageMetadata({ title: "Server not found", description: "This server listing does not exist.", path: `/servers/${id}` });

  return pageMetadata({
    title: server.name,
    description: `${server.desc} ${server.mode} server in the ${server.region} region, ${server.lang}. Demo listing — OPEN//77 is in pre-alpha and these statistics are illustrative.`,
    path: `/servers/${server.id}`,
    image: server.banner,
  });
}

function CommunityLinks({ server }: { server: GameServer }) {
  const website = server.links?.website;
  const discord = server.links?.discord;

  if (!website && !discord) {
    return (
      <p className="sv-links-empty">
        Community links appear here when the server provides them.
      </p>
    );
  }

  return (
    <div className="sv-links">
      {website ? (
        <span
          className="sv-link-chip"
          title="Demo data — community links go live with real listings"
        >
          <GlobeIcon />
          {website}
        </span>
      ) : null}
      {discord ? (
        <span
          className="sv-link-chip"
          title="Demo data — community links go live with real listings"
        >
          <DiscordIcon />
          {discord}
        </span>
      ) : null}
      <span className="sv-links-note">demo links</span>
    </div>
  );
}

export default async function ServerPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const server = await serverDirectory.get(id);
  if (!server) notFound();

  const players = samplePlayers(server, 12);
  const remaining = Math.max(0, server.players - players.length);

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

          <article className="sv-card">
            <div
              className="sv-cover"
              style={{
                backgroundImage:
                  "linear-gradient(180deg, rgba(11,15,25,0.2), rgba(11,15,25,0.45) 55%, rgba(11,15,25,0.96)), " +
                  `url('${server.banner}')`,
              }}
            >
              <span className="hud-corners" aria-hidden="true" />
              <div className="sv-cover-bottom">
                <div className="sv-cover-id">
                  <p className="sv-eyebrow">
                    <SlashMark />SERVER PAGE{" "}
                    <span className="mini-chip">DEMO</span>
                  </p>
                  <h1 className="sv-name">{server.name}</h1>
                  <p className="sv-sub">
                    {server.mode} · {server.region} region · {server.lang}
                    {server.owner ? (
                      <>
                        {" "}
                        · run by <strong>{server.owner}</strong>
                      </>
                    ) : null}
                  </p>
                </div>
                <ServerActions id={server.id} />
              </div>
            </div>

            <div className="sv-statbar">
              <div className="sv-stat sv-stat-players">
                <span className="sv-stat-k">Players</span>
                <span className="sv-stat-v">
                  {server.players} <span className="sv-stat-dim">/ {server.max}</span>
                </span>
                <span className="players-bar" aria-hidden="true">
                  <span style={{ width: `${occupancyPercent(server)}%` }} />
                </span>
              </div>
              <div className="sv-stat">
                <span className="sv-stat-k">Ping</span>
                <span className={`sv-stat-v ${pingClass(server.ping)}`}>{server.ping} ms</span>
              </div>
              <div className="sv-stat">
                <span className="sv-stat-k">Region</span>
                <span className="sv-stat-v">{server.region}</span>
              </div>
              <div className="sv-stat">
                <span className="sv-stat-k">Language</span>
                <span className="sv-stat-v">{server.lang}</span>
              </div>
              <div className="sv-stat sv-stat-tags">
                <span className="sv-stat-k">Tags</span>
                <span className="dstat-tags">
                  {server.tags.map((tag) => (
                    <span className="tag" key={tag}>
                      {tag}
                    </span>
                  ))}
                </span>
              </div>
            </div>

            <div className="sv-body">
              <div className="sv-main">
                <section className="sv-section">
                  <h2 className="sv-h2">
                    <SlashMark /> About this server
                  </h2>
                  <p className="sv-desc">{server.desc}</p>
                  <CommunityLinks server={server} />
                </section>

                {server.rules && server.rules.length > 0 ? (
                  <section className="sv-section">
                    <h2 className="sv-h2">
                      <SlashMark /> Server rules
                    </h2>
                    <ul className="sv-rules">
                      {server.rules.map((rule) => (
                        <li key={rule}>{rule}</li>
                      ))}
                    </ul>
                  </section>
                ) : null}

                <section className="sv-section">
                  <DemoDataNotice scope="page" />
                </section>
              </div>

              <aside className="sv-side">
                <section className="sv-section">
                  <h2 className="sv-h2">
                    <SlashMark /> Online now{" "}
                    <span className="mini-chip">DEMO</span>
                  </h2>
                  <ul className="sv-playerlist">
                    {players.map((player) => (
                      <li key={player}>
                        <span className="live-dot" aria-hidden="true" />
                        {player}
                      </li>
                    ))}
                  </ul>
                  <p className="sv-playerlist-more">+ {remaining} more (illustrative)</p>
                </section>
              </aside>
            </div>

            <p className="sv-footnote">
              Demo listing — connecting, live player counts and community links go live with the
              first public build.
            </p>
          </article>
        </div>
      </main>

      <SiteFooter fineprint="Pre-alpha. Server pages show demo data, not live statistics." />

      {/*
        No `VideoGameServer`-style markup and no aggregate ratings: this listing
        is invented, so the only structured data emitted is the trail that says
        where the page sits.
      */}
      <JsonLd
        data={jsonLdGraph(
          breadcrumbNode([
            { name: "Home", path: "/" },
            { name: "Servers", path: "/servers" },
            { name: server.name, path: `/servers/${server.id}` },
          ]),
        )}
      />
    </>
  );
}
