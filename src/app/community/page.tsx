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
                <Eyebrow>DEVELOPER PREVIEW ACCESS</Eyebrow>
                <h2 className="browser-cta-title">Developer Preview is live.</h2>
                <p>
                  The launcher, dedicated server packages and live directory are available now.
                  Joining a world requires an approved OPEN//77 account. Server owners and resource
                  developers can <Link href="/create#developer-alpha">apply for preview access</Link>,
                  then <Link href="/download">install the launcher</Link> and sign in with their
                  approved account. Read the <Link href="/docs/developer-preview">preview guide</Link>
                  {" "}for requirements, hosting and known limitations.
                </p>
              </div>
              <div className="alpha-side">
                <p className="alpha-status">
                  <span className="live-dot" aria-hidden="true" /> STATUS: {site.stage} — ACTIVE
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
                  Approved testers can <Link href="/download">download the launcher</Link> and
                  join worlds from the <Link href="/servers">live server browser</Link>. Downloading
                  or creating an account alone does not grant access. This preview can contain bugs
                  and crashes; keep backups and report reproducible issues.
                </p>
              </div>
              <div className="follow-card">
                <h3>Server owners</h3>
                <p>
                  <Link href="/host">Download the Windows or Linux server</Link> with Freeroam and
                  its system resources, then follow the <Link href="/docs/host-a-server">hosting guide</Link>
                  {" "}to configure your license and public endpoints. Your players need approved
                  preview accounts too.
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
                    <>The platform repository remains private; the published guides and API reference are available now.</>
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
