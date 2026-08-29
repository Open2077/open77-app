import type { Metadata } from "next";
import Link from "next/link";

import { Eyebrow, SlashMark } from "@/components/brand";
import { CopyHash } from "@/components/host/copy-hash";
import { HostGate } from "@/components/host/host-gate";
import {
  ArrowDownIcon,
  DownloadIcon,
  LinuxIcon,
  ServerRackIcon,
  ShieldIcon,
  WindowsIcon,
} from "@/components/icons";
import { JsonLd } from "@/components/json-ld";
import { SiteFooter } from "@/components/site-footer";
import { formatBytes, formatReleaseDate } from "@/lib/cdn";
import { cssBackgrounds } from "@/lib/images";
import { breadcrumbNode, jsonLdGraph, pageMetadata } from "@/lib/seo";
import {
  fetchLatestServerRelease,
  type ServerBuild,
  type ServerRelease,
} from "@/lib/server-release";

export const metadata: Metadata = {
  ...pageMetadata({
    title: "Host a Server",
    description:
      "Download the official OPEN//77 dedicated server for Windows or Linux and host your own Cyberpunk 2077 multiplayer world. No game install required on the host.",
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

/** How you launch the server on each platform, once it is unpacked. */
const RUN_COMMANDS: Record<ServerBuild["os"], string> = {
  windows: "Open77.Server.exe  (or  dotnet Open77.Server.dll)",
  linux: "./Open77.Server",
};

const SETUP_STEPS = [
  {
    num: "01",
    title: "Mint a license key",
    body: (
      <>
        Create one in the <Link href="/account/keys">keymaster</Link>. It ties the server to your
        account and is shown once — keep it somewhere safe.
      </>
    ),
  },
  {
    num: "02",
    title: "Unpack and configure",
    body: (
      <>
        Unzip (Windows) or untar (Linux), then open <code>server.jsonc</code> and set{" "}
        <code>masterServer.enabled = true</code>, <code>identity.visibility = &quot;public&quot;</code>
        , and <code>network.publicEndpoint</code> to your public address.
      </>
    ),
  },
  {
    num: "03",
    title: "Set the license env var",
    body: (
      <>
        Export <code>OP77_LICENSE_KEY</code> with the key from step one, so the server can present
        it to the master on start-up.
      </>
    ),
  },
  {
    num: "04",
    title: "Run it",
    body: (
      <>
        Start <code>Open77.Server.exe</code> on Windows or <code>./Open77.Server</code> on Linux. It
        connects, and appears automatically in the launcher for players to join.
      </>
    ),
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
              Download the official dedicated server, license it to your account, and open your
              Night City to players. The host machine never needs Cyberpunk 2077 installed.
            </p>
            <div className="hero-ctas">
              <a className="btn btn-primary" href="#download">
                Get the server
                <ArrowDownIcon />
              </a>
              <Link className="btn btn-ghost" href="/account/keys">
                License keys
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
              {release ? <ReleaseDownloads release={release} /> : <NoReleaseYet />}
              <p className="status-note" role="note">
                <ShieldIcon size={18} />
                <span>
                  <strong>Official builds only.</strong> Download the server from this page or the
                  official CDN — nowhere else. Each archive lists its SHA-256 so you can verify what
                  you run.
                </span>
              </p>
            </div>
          </section>

          <section className="section" id="start">
            <div className="section-inner">
              <Eyebrow>GETTING STARTED</Eyebrow>
              <h2 className="section-title">From download to open doors.</h2>
              <ol className="steps">
                {SETUP_STEPS.map((step) => (
                  <li className="step" key={step.num}>
                    <span className="step-num">{step.num}</span>
                    <h3>{step.title}</h3>
                    <p>{step.body}</p>
                  </li>
                ))}
              </ol>
              <p className="status-note" role="note">
                <ServerRackIcon size={18} />
                <span>
                  <strong>What the host needs.</strong> The .NET 10 runtime and a public address
                  players can reach. That is all — no Cyberpunk 2077, no REDengine, no game content
                  on the server machine.
                </span>
              </p>
              <div className="hero-ctas">
                <Link className="btn btn-ghost" href="/docs/host-a-server">
                  Full hosting guide
                </Link>
                <Link className="btn btn-ghost" href="/docs/warden">
                  Meet Warden, the admin panel
                </Link>
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

function ReleaseDownloads({ release }: { release: ServerRelease }) {
  return (
    <div className="host-release">
      <span className="hud-corners" aria-hidden="true" />
      <div className="host-release-head">
        <div>
          <p className="host-release-tag">
            <SlashMark /> LATEST SERVER RELEASE
          </p>
          <p className="host-release-version">{release.version}</p>
        </div>
        <div className="host-release-chips">
          <span className="host-chip host-chip-ok">
            <ShieldIcon size={13} />
            Official build
          </span>
          {release.publishedAtUtc ? (
            <span className="host-chip">published {formatReleaseDate(release.publishedAtUtc)}</span>
          ) : null}
          {release.serverSha256 ? (
            <span className="host-chip" title={`Server binary SHA-256 — ${release.serverSha256}`}>
              server {release.serverSha256.slice(0, 10)}…
            </span>
          ) : null}
        </div>
      </div>

      <ul className="host-builds">
        {release.builds.map((build) => (
          <BuildCard build={build} key={build.platform} />
        ))}
      </ul>
    </div>
  );
}

function BuildCard({ build }: { build: ServerBuild }) {
  const OsIcon = build.os === "windows" ? WindowsIcon : LinuxIcon;
  const available = Boolean(build.url);

  return (
    <li className={`host-build${available ? "" : " host-build-soon"}`}>
      <div className="host-build-os">
        <OsIcon size={22} />
        <div>
          <p className="host-build-label">{build.label}</p>
          <p className="host-build-kind">
            {build.osLabel} · .{build.archiveKind}
          </p>
        </div>
      </div>

      {available && build.url ? (
        <>
          <dl className="host-build-facts">
            <div>
              <dt>File</dt>
              <dd>{build.fileName}</dd>
            </div>
            <div>
              <dt>Run</dt>
              <dd>{RUN_COMMANDS[build.os]}</dd>
            </div>
            <div>
              <dt>SHA-256</dt>
              <dd>
                {build.archiveSha256 ? (
                  <CopyHash value={build.archiveSha256} />
                ) : (
                  <span className="host-hash host-hash-none">unpublished</span>
                )}
              </dd>
            </div>
          </dl>
          <div className="host-build-cta">
            <a className="btn btn-primary" href={build.url}>
              Download
              <DownloadIcon size={16} />
            </a>
            {build.sizeBytes !== null ? (
              <span className="host-build-size">{formatBytes(build.sizeBytes)}</span>
            ) : null}
          </div>
        </>
      ) : (
        <div className="host-build-soon-body">
          <span className="host-chip">Coming soon</span>
          <p>This platform&apos;s build has not been published for this release yet.</p>
        </div>
      )}
    </li>
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
