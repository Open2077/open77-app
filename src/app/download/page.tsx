import Link from "next/link";

import { Eyebrow, SlashMark } from "@/components/brand";
import { CopyLine } from "@/components/copy-line";
import {
  ArrowDownIcon,
  DiscordIcon,
  DownloadIcon,
  InfoIcon,
  ShieldIcon,
  WindowsIcon,
} from "@/components/icons";
import { JsonLd } from "@/components/json-ld";
import { SiteFooter } from "@/components/site-footer";
import { formatBytes, formatReleaseDate } from "@/lib/cdn";
import { cssBackgrounds } from "@/lib/images";
import { fetchLatestLauncherRelease, type LauncherRelease } from "@/lib/launcher-release";
import { GAME_BUILD, GAME_EXPANSION, PLAYER_REQUIREMENT_SHORT } from "@/lib/requirements";
import {
  breadcrumbNode,
  jsonLdGraph,
  launcherApplicationNode,
  pageMetadata,
} from "@/lib/seo";
import { site } from "@/lib/site";

export const metadata = pageMetadata({
  title: "Download the Launcher",
  description:
    "Download the OPEN//77 launcher for Windows. It signs you in, checks your Cyberpunk 2077 build, installs and updates the mod, and takes you to the server browser. Free; requires your own copy of the game.",
  path: "/download",
});

/**
 * Everything factual on this page — version, digest, size, publish date — comes
 * from the CDN's `launcher/latest.json` pointer, never from copy written here,
 * so publishing a new launcher updates the page with no code change.
 *
 * ISR rather than a request-time fetch: the rest of the site is prerendered
 * static HTML, and this page has no per-visitor content, so there is no reason
 * to make every visitor wait on a CDN round-trip. The pointer is re-read at
 * most once every five minutes, which is well inside the time it takes anyone
 * to notice a release. It also fails softly — if the CDN blinks, the last good
 * page keeps being served instead of a broken one.
 */
export const revalidate = 300;

/** PowerShell is on every supported Windows, so the check needs no install. */
function verifyCommand(fileName: string): string {
  return `Get-FileHash -Algorithm SHA256 .\\${fileName}`;
}

const LAUNCHER_DOES = [
  {
    title: "Signs you in",
    body: "One OPEN//77 account, authorized in your browser rather than in the app — the launcher never sees your password.",
  },
  {
    title: "Checks your game",
    body: `It verifies that your Cyberpunk 2077 install is build ${GAME_BUILD} with ${GAME_EXPANSION}, because the client hooks the engine at addresses fixed for exactly that build.`,
  },
  {
    title: "Installs and updates the mod",
    body: "The OPEN//77 client is fetched, verified and kept current for you. Nothing to unzip into your game folder by hand, and nothing left behind when you turn it off.",
  },
  {
    title: "Manages what loads",
    body: "Choose which mods are active for a session. Servers can require a clean load-out, so this is how you keep your own setup and still connect.",
  },
  {
    title: "Finds you a world",
    body: "Browse community servers, filter them, and press connect. The launcher starts the game already pointed at the world you picked.",
  },
];

const REQUIREMENTS = [
  {
    title: "Windows 10 or 11, 64-bit",
    body: "The launcher is a Windows desktop application, and the client it installs is a native plugin that loads inside the game process. There is no macOS or Linux player build.",
  },
  {
    title: "The WebView2 runtime",
    body: "The launcher renders its interface with Microsoft Edge WebView2. Windows 11 already ships it; on Windows 10 it installs itself the first time it is needed.",
  },
  {
    title: `Your own copy of Cyberpunk 2077 ${GAME_BUILD}`,
    body: `Bought, not pirated. ${GAME_EXPANSION} is required, not recommended — the world you load when you connect is an EP1 save. OPEN//77 never distributes the game or any of its assets.`,
  },
];

const FIRST_RUN = [
  {
    num: "01",
    title: "Windows will warn you",
    body: (
      <>
        The executable is not code-signed yet, so SmartScreen shows{" "}
        <em>“Windows protected your PC”</em> with a <strong>Don&apos;t run</strong> button. Choose{" "}
        <strong>More info</strong>, then <strong>Run anyway</strong>. That warning means “nobody
        paid for a certificate”, not “this file is malicious” — which is exactly why the SHA-256
        above is published: check it and you do not have to take our word for either.
      </>
    ),
  },
  {
    num: "02",
    title: "Sign in through your browser",
    body: (
      <>
        The launcher opens <Link href="/launcher">the authorization page</Link> on this site. You
        approve it there, and the launcher receives a token — your password never goes through the
        app.
      </>
    ),
  },
  {
    num: "03",
    title: "Point it at your game, then play",
    body: (
      <>
        It locates your Cyberpunk 2077 install, checks the build, installs the client, and opens the{" "}
        <Link href="/servers">server browser</Link>. From there it is one button.
      </>
    ),
  },
];

export default async function DownloadPage() {
  const release = await fetchLatestLauncherRelease();

  return (
    <>
      <link rel="preload" as="image" href={cssBackgrounds.playTogether} fetchPriority="high" />

      <main id="main">
        <section className="page-hero page-hero-download">
          <div className="page-hero-bg" aria-hidden="true" />
          <div className="section-inner page-hero-inner">
            <Eyebrow>DOWNLOAD</Eyebrow>
            <h1 className="page-title">
              Get the
              <br />
              OPEN//77 launcher.
            </h1>
            <p className="section-lead">
              One Windows app: it signs you in, checks your game build, installs and updates the
              mod, and drops you into the server browser. Free, and no account needed to download
              it — you bring {PLAYER_REQUIREMENT_SHORT}.
            </p>
            <div className="hero-ctas">
              <a className="btn btn-primary" href="#get">
                Get the launcher
                <ArrowDownIcon />
              </a>
              <a className="btn btn-ghost" href="#requirements">
                What you need
              </a>
            </div>
          </div>
        </section>

        <section className="section" id="get">
          <div className="section-inner">
            <Eyebrow>THE BUILD</Eyebrow>
            <h2 className="section-title">Latest launcher release.</h2>
            {release ? <ReleasePanel release={release} /> : <NoReleaseYet />}
            <p className="status-note" role="note">
              <ShieldIcon size={18} />
              <span>
                <strong>Official builds only.</strong> Download the launcher from this page or the
                official CDN — nowhere else. Every build carries its SHA-256 so you can verify what
                you run, and the same digest is registered with the master server as an authorized
                build.
              </span>
            </p>
          </div>
        </section>

        <section className="section" id="what-it-does">
          <div className="section-inner">
            <Eyebrow>WHAT IT DOES</Eyebrow>
            <h2 className="section-title">Five jobs, one window.</h2>
            <p className="section-lead">
              The launcher is the whole player side of OPEN//77. You do not install anything into
              your game folder by hand, and you do not edit a config to join a server.
            </p>
            <ul className="dedicated-points">
              {LAUNCHER_DOES.map((item) => (
                <li key={item.title}>
                  <h3>{item.title}</h3>
                  <p>{item.body}</p>
                </li>
              ))}
            </ul>
          </div>
        </section>

        <section className="section" id="requirements">
          <div className="section-inner">
            <Eyebrow>BEFORE YOU INSTALL</Eyebrow>
            <h2 className="section-title">What you need.</h2>
            <ul className="dedicated-points">
              {REQUIREMENTS.map((item) => (
                <li key={item.title}>
                  <h3>{item.title}</h3>
                  <p>{item.body}</p>
                </li>
              ))}
            </ul>
            <p className="status-note" role="note">
              <InfoIcon size={18} />
              <span>
                <strong>Hosting is a different download.</strong> A dedicated server never needs
                Cyberpunk 2077 installed and does not use this launcher — start at{" "}
                <Link href="/create">Create a Server</Link>.
              </span>
            </p>
          </div>
        </section>

        <section className="section" id="first-run">
          <div className="section-inner">
            <Eyebrow>FIRST RUN</Eyebrow>
            <h2 className="section-title">What actually happens.</h2>
            <ol className="steps steps-3">
              {FIRST_RUN.map((step) => (
                <li className="step" key={step.num}>
                  <span className="step-num">{step.num}</span>
                  <h3>{step.title}</h3>
                  <p>{step.body}</p>
                </li>
              ))}
            </ol>
            <p className="status-note" role="note">
              <DiscordIcon size={18} />
              <span>
                <strong>Pre-alpha, and it shows.</strong> OPEN//77 is being built in the open: the
                launcher works, the public alpha has not opened, and the server browser is still
                mostly quiet. If something breaks, the{" "}
                {site.links.discord ? (
                  <a href={site.links.discord} target="_blank" rel="noreferrer noopener">
                    Discord
                  </a>
                ) : (
                  "Discord"
                )}{" "}
                is where it gets fixed.
              </span>
            </p>
          </div>
        </section>
      </main>

      <SiteFooter fineprint="Launcher builds are published by the OPEN//77 release pipeline to the official CDN." />

      <JsonLd
        data={jsonLdGraph(
          breadcrumbNode([
            { name: "Home", path: "/" },
            { name: "Download the Launcher", path: "/download" },
          ]),
          ...(release ? [launcherApplicationNode(release)] : []),
        )}
      />
    </>
  );
}

function ReleasePanel({ release }: { release: LauncherRelease }) {
  return (
    <div className="dl-release">
      <span className="hud-corners" aria-hidden="true" />

      <div className="dl-release-head">
        <div>
          <p className="dl-release-tag">
            <SlashMark /> LATEST LAUNCHER
          </p>
          <p className="dl-release-version">{release.version}</p>
        </div>
        <div className="dl-chips">
          <span className="dl-chip dl-chip-ok">
            <ShieldIcon size={13} />
            Official build
          </span>
          <span className="dl-chip">
            <WindowsIcon size={13} />
            Windows x64
          </span>
          {release.publishedAtUtc ? (
            <span className="dl-chip">published {formatReleaseDate(release.publishedAtUtc)}</span>
          ) : null}
        </div>
      </div>

      <div className="dl-release-body">
        <div className="dl-cta">
          <a className="btn btn-primary btn-lg" href={release.url}>
            Download {release.fileName}
            <DownloadIcon size={16} />
          </a>
          <p className="dl-cta-meta">
            {release.sizeBytes !== null ? `${formatBytes(release.sizeBytes)} · ` : ""}
            no account required
          </p>
        </div>

        <dl className="dl-facts">
          <div>
            <dt>File</dt>
            <dd>{release.fileName}</dd>
          </div>
          <div>
            <dt>SHA-256</dt>
            <dd>
              {release.sha256 ? (
                <CopyLine value={release.sha256} label="Copy the SHA-256 of this build" />
              ) : (
                <span className="dl-none">unpublished</span>
              )}
            </dd>
          </div>
          <div>
            <dt>Verify</dt>
            <dd>
              <CopyLine
                value={verifyCommand(release.fileName)}
                label="Copy the PowerShell command that hashes the download"
              />
            </dd>
          </div>
        </dl>

        <p className="dl-verify-note">
          Run that in PowerShell in the folder you downloaded to. If the hash it prints matches the
          one above, the file is byte-for-byte the build we published. If it does not, delete it —
          it did not come from us.
        </p>
      </div>
    </div>
  );
}

function NoReleaseYet() {
  return (
    <div className="dl-empty">
      <span className="hud-corners" aria-hidden="true" />
      <DownloadIcon size={28} className="dl-empty-icon" />
      <h3>No launcher build is being served right now.</h3>
      <p>
        Either no public launcher has been published yet, or the release CDN is briefly unreachable
        — this page reads the live pointer and will show the build the moment there is one. Check
        back shortly, or watch the Discord announcements.
      </p>
    </div>
  );
}
