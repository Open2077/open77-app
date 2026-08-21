import Link from "next/link";

import { Eyebrow } from "@/components/brand";
import { JsonLd } from "@/components/json-ld";
import { SiteFooter } from "@/components/site-footer";
import { breadcrumbNode, jsonLdGraph, pageMetadata } from "@/lib/seo";
import { site } from "@/lib/site";

export const metadata = pageMetadata({
  title: "Community",
  description:
    "OPEN//77 is developed in the open. Community channels — Discord, code repository, devlog — open with the first public pre-alpha milestone.",
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
              built by people like you. Community channels open with the first public pre-alpha
              milestone; this page will link them the moment they exist. Until then, no fake
              buttons.
            </p>
          </div>
        </section>

        <section className="section section-community" id="alpha">
          <div className="section-inner">
            <div className="alpha-band">
              <div>
                <Eyebrow>ALPHA ACCESS</Eyebrow>
                <h2 className="browser-cta-title">The alpha isn&apos;t open yet.</h2>
                <p>
                  OPEN//77 is in pre-alpha and there is no public build — so there&apos;s no signup
                  form to fill in, and we won&apos;t pretend otherwise. When the first alpha opens
                  its doors, it will be announced right here and through the community channels
                  below.
                </p>
              </div>
              <p className="alpha-status">
                <span className="live-dot" aria-hidden="true" /> STATUS: {site.stage} — IN
                DEVELOPMENT
              </p>
            </div>

            <div className="follow-cards">
              <div className="follow-card">
                <h3>Players</h3>
                <p>
                  Nothing to install yet. When a test build exists, it will be announced here first
                  — and the <Link href="/servers">server browser</Link> goes live with it.
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
                    <>The platform repository opens up alongside the first public build.</>
                  )}
                </p>
              </div>
            </div>
          </div>
        </section>
      </main>

      <SiteFooter fineprint="Pre-alpha. No public build exists yet." />

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
