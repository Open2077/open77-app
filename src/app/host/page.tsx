import type { Metadata } from "next";
import Link from "next/link";

import { Eyebrow, SlashMark } from "@/components/brand";
import { HostGate } from "@/components/host/host-gate";
import {
  ArrowDownIcon,
  ArrowRightIcon,
  DownloadIcon,
  InfoIcon,
  KeyIcon,
  ServerRackIcon,
  ShieldIcon,
} from "@/components/icons";
import { JsonLd } from "@/components/json-ld";
import { SiteFooter } from "@/components/site-footer";
import { cssBackgrounds } from "@/lib/images";
import { SERVER_REQUIREMENTS } from "@/lib/requirements";
import { breadcrumbNode, jsonLdGraph, pageMetadata } from "@/lib/seo";
import {
  fetchLatestServerRelease,
  formatBytes,
  formatReleaseDate,
  type ServerRelease,
} from "@/lib/server-release";

export const metadata: Metadata = {
  ...pageMetadata({
    title: "Host a Server",
    description:
      "Download the official OPEN//77 dedicated server and host your own Cyberpunk 2077 multiplayer world. The server is standalone — no game install required.",
    path: "/host",
  }),
  // TODO(go-public): remove this override (and the HostGate wrapper below) when
  // the server download opens to every owner — pageMetadata already handles
  // production indexing correctly.
  robots: { index: false, follow: false },
};

/**
 * The download data comes from the public CDN's `server/latest.json` pointer;
 * ISR keeps the page static while picking a freshly cut release up within
 * minutes of the pipeline publishing it.
 */
export const revalidate = 300;

/** What `package-server.ps1` puts in the zip — kept in step with OPERATIONS.md. */
const ZIP_CONTENTS = [
  {
    file: "Open77.Server",
    body: "The dedicated game server itself — a standalone .NET process that runs your world. It never loads Cyberpunk content, which is why the machine hosting it needs no copy of the game.",
  },
  {
    file: "Open77.Platform.dll",
    body: "The native platform module, with the production platform key built in. It is how your server proves itself to the master — the anti-crack layer, shipped ready to load.",
  },
  {
    file: "GameNetworkingSockets.dll + libsodium.dll",
    body: "The pinned network transport and its crypto library, exactly the versions the platform was built against. Nothing to install, nothing to match up.",
  },
  {
    file: "server.example.jsonc",
    body: "A commented starter config. Copy it, name your world, set your slots — and paste in the license key that ties the server to your account.",
  },
  {
    file: "README.txt",
    body: "Generated for each release, with the setup walkthrough and the registered SHA-256 of the shipped server binary so you can verify what you run.",
  },
];

const STEPS = [
  {
    num: "01",
    title: "Unzip and configure",
    body: "Extract the zip on the Windows machine you keep online and shape your config from the included example — name, slots, rules. There is nothing else to install.",
  },
  {
    num: "02",
    title: "License it to your account",
    body: "Every server on the platform belongs to an account. Mint a license key in the keymaster and put it in your config — it is what the master checks before your server is allowed on.",
  },
  {
    num: "03",
    title: "Open the doors",
    body: "Start the server. It authenticates with the master, appears in the public server browser, and players who connect auto-download everything your world needs.",
  },
];

export default async function HostPage() {
  const release = await fetchLatestServerRelease();

  return (
    <>
      <link rel="preload" as="image" href={cssBackgrounds.createHero} fetchPriority="high" />

      <main id="main">
        <section className="page-hero page-hero-create">
          <div className="page-hero-bg" aria-hidden="true" />
          <div className="section-inner page-hero-inner">
            <Eyebrow>HOST A SERVER</Eyebrow>
            <h1 className="page-title">
              Host your own
              <br />
              OPEN//77 server.
            </h1>
            <p className="section-lead">
              The dedicated server is a standalone Windows process — it never needs Cyberpunk 2077
              installed. Download the official build, license it to your account, and open your
              Night City to players.
            </p>
            <div className="hero-ctas">
              <a className="btn btn-primary" href="#download">
                Get the server
                <ArrowDownIcon />
              </a>
              <Link className="btn btn-ghost" href="/docs/server-licensing">
                Licensing guide
              </Link>
            </div>
          </div>
        </section>

        {/* TODO(go-public): delete the <HostGate> wrapper (keep its children) to
            open this page to every server owner. See components/host/host-gate.tsx. */}
        <HostGate>
          <section className="section" id="download">
            <div className="section-inner">
              <Eyebrow>THE BUILD</Eyebrow>
              <h2 className="section-title">Latest server release.</h2>
              {release ? <ReleaseCard release={release} /> : <NoReleaseYet />}
              <p className="status-note" role="note">
                <ShieldIcon size={18} />
                <span>
                  <strong>Official builds only.</strong> Every release is produced by the OPEN//77
                  release pipeline and its server binary&apos;s SHA-256 is registered in the
                  master&apos;s build allowlist — the platform re-checks that hash when your server
                  comes online. Only download the server from this page or the official CDN.
                </span>
              </p>
            </div>
          </section>

          <section className="section" id="contents">
            <div className="section-inner">
              <div className="split-head">
                <div>
                  <Eyebrow>IN THE ZIP</Eyebrow>
                  <h2 className="section-title">
                    Everything a server
                    <br />
                    needs. Nothing else.
                  </h2>
                </div>
                <p className="split-head-lead">
                  One archive, ready to run: the game server, the native platform module that
                  authenticates it, the pinned networking stack, and an owner-facing config and
                  README. Unzip, configure, start.
                </p>
              </div>
              <ul className="host-contents">
                {ZIP_CONTENTS.map((item) => (
                  <li className="host-content-item" key={item.file}>
                    <code>{item.file}</code>
                    <p>{item.body}</p>
                  </li>
                ))}
              </ul>
            </div>
          </section>

          <section className="section" id="requirements">
            <div className="section-inner">
              <Eyebrow>REQUIREMENTS</Eyebrow>
              <h2 className="section-title">What the machine needs.</h2>
              <div className="benefit-grid benefit-grid-3">
                {SERVER_REQUIREMENTS.map((req) => (
                  <article className="benefit-card" key={req.label}>
                    <ServerRackIcon className="feat-icon" />
                    <h3>{req.label}</h3>
                    <p>{req.body}</p>
                  </article>
                ))}
              </div>
            </div>
          </section>

          <section className="section" id="start">
            <div className="section-inner">
              <Eyebrow>GETTING STARTED</Eyebrow>
              <h2 className="section-title">From zip to open doors.</h2>
              <ol className="steps steps-3">
                {STEPS.map((step) => (
                  <li className="step" key={step.num}>
                    <span className="step-num">{step.num}</span>
                    <h3>{step.title}</h3>
                    <p>{step.body}</p>
                  </li>
                ))}
              </ol>
              <p className="status-note" role="note">
                <KeyIcon size={18} />
                <span>
                  <strong>Your license key.</strong> Create one in the{" "}
                  <Link href="/account/keys">keymaster</Link> — it is shown once, stored as a
                  fingerprint, and revocable any time. The{" "}
                  <Link href="/docs/server-licensing">server licensing guide</Link> walks through
                  linking it to your server.
                </span>
              </p>
              <p className="status-note" role="note">
                <InfoIcon />
                <span>
                  <strong>Setup details live in the zip.</strong> The generated{" "}
                  <code>README.txt</code> is the authoritative walkthrough for the exact build you
                  downloaded; the{" "}
                  <Link href="/docs/platform#dedicated-servers">dedicated servers</Link> chapter
                  covers the architecture around it.
                </span>
              </p>
            </div>
          </section>

          <section className="section" id="deeper">
            <div className="section-inner">
              <div className="deeper-band light-zone">
                <span className="lz-corner" aria-hidden="true">
                  <i />
                  <i />
                </span>
                <div>
                  <Eyebrow>BEFORE OPENING NIGHT</Eyebrow>
                  <h2 className="browser-cta-title">Build the world before you open it.</h2>
                  <p>
                    Resources, the scripting layer and the complete Lua API are documented for
                    people who build — everything your server will serve to its players.
                  </p>
                </div>
                <div className="deeper-links">
                  <Link className="btn btn-primary" href="/docs/server-resources">
                    Server docs
                    <ArrowRightIcon />
                  </Link>
                  <Link className="btn btn-ghost" href="/docs/api">
                    Lua API reference
                  </Link>
                  <Link className="btn btn-ghost" href="/create">
                    Why host?
                  </Link>
                </div>
              </div>
            </div>
          </section>
        </HostGate>
      </main>

      <SiteFooter fineprint="Server builds are published by the OPEN//77 release pipeline to the official CDN." />

      <JsonLd
        data={jsonLdGraph(
          breadcrumbNode([
            { name: "Home", path: "/" },
            { name: "Host a Server", path: "/host" },
          ]),
        )}
      />
    </>
  );
}

function ReleaseCard({ release }: { release: ServerRelease }) {
  return (
    <div className="host-release">
      <span className="hud-corners" aria-hidden="true" />
      <div className="host-release-main">
        <p className="host-release-tag">
          <SlashMark /> LATEST SERVER RELEASE
        </p>
        <p className="host-release-version">{release.version}</p>
        <div className="host-release-chips">
          <span className="host-chip host-chip-ok">
            <ShieldIcon size={13} />
            Official build
          </span>
          {release.publishedAtUtc ? (
            <span className="host-chip">published {formatReleaseDate(release.publishedAtUtc)}</span>
          ) : null}
          {release.sizeBytes !== null ? (
            <span className="host-chip">{formatBytes(release.sizeBytes)}</span>
          ) : null}
        </div>
        <dl className="host-release-facts">
          <div>
            <dt>File</dt>
            <dd>{release.fileName}</dd>
          </div>
          {release.zipSha256 ? (
            <div>
              <dt>Zip SHA-256</dt>
              <dd title={release.zipSha256}>{release.zipSha256.slice(0, 16)}…</dd>
            </div>
          ) : null}
          {release.sha256 ? (
            <div>
              <dt>Server binary SHA-256</dt>
              <dd title={release.sha256}>{release.sha256.slice(0, 16)}…</dd>
            </div>
          ) : null}
        </dl>
      </div>
      <div className="host-release-cta">
        <a className="btn btn-primary btn-lg" href={release.url}>
          Download server (.zip)
          <DownloadIcon size={17} />
        </a>
        <p className="host-release-note">
          Served from <span>{new URL(release.url).host}</span> — the hash above is what the master
          verifies when your server comes online.
        </p>
      </div>
    </div>
  );
}

function NoReleaseYet() {
  return (
    <div className="host-empty">
      <span className="hud-corners" aria-hidden="true" />
      <ServerRackIcon size={28} className="host-empty-icon" />
      <h3>No server build published yet.</h3>
      <p>
        The release pipeline hasn&apos;t cut a public dedicated-server build. The moment the first
        one ships, this page picks it up automatically from the CDN — check back soon, or watch the
        Discord announcements.
      </p>
    </div>
  );
}
