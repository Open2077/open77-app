import Link from "next/link";

import { Eyebrow } from "@/components/brand";
import { DiscordIcon, TikTokIcon, XIcon } from "@/components/icons";
import { JsonLd } from "@/components/json-ld";
import { SiteFooter } from "@/components/site-footer";
import { breadcrumbNode, jsonLdGraph, pageMetadata } from "@/lib/seo";
import { site } from "@/lib/site";

export const metadata = pageMetadata({
  title: "Community",
  description:
    "OPEN//77 is developed in the open, and the official Discord is where it is discussed directly. Join in — alpha news lands there first.",
  path: "/community",
});

export default function CommunityPage() {
  return (
    <>
      <main id="main">
        <section className="page-hero page-hero-plain">
          <div className="section-inner">
            <Eyebrow>DEVELOPED IN THE OPEN</Eyebrow>
            <h1 className="page-title">
              The city is big enough
              <br />
              for all of us.
            </h1>
            <p className="section-lead">
              OPEN//77 is being built in the open, and the interesting part — the worlds — will be
              built by people like you. The official Discord is the one place where the project is
              discussed directly: development, questions, feedback, and every announcement, first.
            </p>
            <div className="hero-ctas">
              {site.links.discord ? (
                <a
                  className="btn btn-discord"
                  href={site.links.discord}
                  target="_blank"
                  rel="noreferrer noopener"
                >
                  <DiscordIcon size={16} />
                  Join our Discord
                </a>
              ) : null}
              {site.links.x ? (
                <a
                  className="btn btn-ghost"
                  href={site.links.x}
                  target="_blank"
                  rel="noreferrer noopener"
                >
                  <XIcon size={14} />
                  X / Twitter
                </a>
              ) : null}
              {site.links.tiktok ? (
                <a
                  className="btn btn-ghost"
                  href={site.links.tiktok}
                  target="_blank"
                  rel="noreferrer noopener"
                >
                  <TikTokIcon size={14} />
                  TikTok
                </a>
              ) : null}
            </div>
          </div>
        </section>

        <section className="section section-community" id="alpha">
          <div className="section-inner">
            <div className="alpha-band">
              <div>
                <Eyebrow>ALPHA ACCESS</Eyebrow>
                <h2 className="browser-cta-title">The alpha isn&apos;t open yet.</h2>
                <p>
                  OPEN//77 is in pre-alpha and the alpha has not opened — there are no public
                  servers to join, so there&apos;s no signup form to fill in, and we won&apos;t
                  pretend otherwise. When the first alpha opens its doors, it will be announced on
                  the official Discord first. Being there is the closest thing to a waiting list
                  this project will ever have.
                </p>
              </div>
              <div className="alpha-side">
                <p className="alpha-status">
                  <span className="live-dot" aria-hidden="true" /> STATUS: {site.stage} — IN
                  DEVELOPMENT
                </p>
                {site.links.discord ? (
                  <a
                    className="btn btn-discord"
                    href={site.links.discord}
                    target="_blank"
                    rel="noreferrer noopener"
                  >
                    <DiscordIcon size={16} />
                    Join our Discord
                  </a>
                ) : null}
              </div>
            </div>

            <div className="follow-cards">
              <div className="follow-card">
                <h3>Players</h3>
                <p>
                  Nowhere to play yet — no public servers are live, so there is nothing to connect
                  to. When the alpha opens, the Discord hears it first and this page follows — and
                  the <Link href="/servers">server browser</Link> goes live with it.
                </p>
              </div>
              <div className="follow-card">
                <h3>Server owners</h3>
                <p>
                  Start thinking about the world you&apos;d run. The dedicated server ships in a
                  later milestone — the <Link href="/create">Create a Server</Link> page shows the
                  intended flow.
                </p>
              </div>
              <div className="follow-card">
                <h3>Developers</h3>
                <p>
                  The Lua API that resources are written against is already{" "}
                  <Link href="/docs">documented here</Link> — {" "}
                  <Link href="/docs/api">every registered function</Link>, generated from the
                  platform bindings.{" "}
                  {site.links.platformRepo ? (
                    <>
                      The source lives in the{" "}
                      <a href={site.links.platformRepo} rel="noreferrer noopener" target="_blank">
                        platform repository
                      </a>
                      .
                    </>
                  ) : (
                    // No dead link: the platform repository is still private, and this
                    // page's own promise is that there are no fake buttons.
                    <>The platform repository opens up alongside the first public alpha.</>
                  )}
                </p>
              </div>
            </div>
          </div>
        </section>
      </main>

      <SiteFooter />

      <JsonLd
        data={jsonLdGraph(
          breadcrumbNode([
            { name: "Home", path: "/" },
            { name: "Community", path: "/community" },
          ]),
        )}
      />
    </>
  );
}
