import Link from "next/link";
import { connection } from "next/server";

import { CopyLine } from "@/components/copy-line";
import { DownloadAction } from "@/components/downloads/download-action";
import { ArtworkCard, DownloadSurface, QuickFacts, SurfaceEyebrow, SurfaceHeading, UnavailableRelease } from "@/components/downloads/download-surface";
import styles from "@/components/downloads/download-surface.module.css";
import { ArrowRightIcon, CheckIcon, DiscordIcon, DownloadIcon, PeopleIcon, PlayIcon, ServerRackIcon, ShieldIcon, WindowsIcon } from "@/components/icons";
import { JsonLd } from "@/components/json-ld";
import { ReleaseRefresh } from "@/components/release-refresh";
import { formatBytes, formatReleaseDate } from "@/lib/cdn";
import { fetchLatestLauncherRelease, type LauncherRelease } from "@/lib/launcher-release";
import { fetchLatestServerRelease } from "@/lib/server-release";
import { GAME_BUILD, GAME_EXPANSION, PLAYER_REQUIREMENT_SHORT } from "@/lib/requirements";
import { breadcrumbNode, jsonLdGraph, launcherApplicationNode, pageMetadata } from "@/lib/seo";
import { site } from "@/lib/site";

export const metadata = pageMetadata({
  title: "Download the Launcher",
  description:
    "Download the OPEN//77 launcher for Windows. It signs you in, checks your Cyberpunk 2077 build, installs and updates the mod, and takes you to the server browser. Free; requires your own copy of the game.",
  path: "/download",
});

/** PowerShell is on every supported Windows, so the check needs no install. */
function verifyCommand(fileName: string): string {
  return `Get-FileHash -Algorithm SHA256 .\\${fileName}`;
}

const LAUNCHER_DOES = [
  { icon: ShieldIcon, title: "Signs you in", body: "One OPEN//77 account, authorized in your browser rather than in the app — the launcher never sees your password." },
  { icon: CheckIcon, title: "Checks your game", body: `It makes sure your Cyberpunk 2077 install is build ${GAME_BUILD} with ${GAME_EXPANSION} before it installs anything. The client is built against that exact version, so you hear about a mismatch up front rather than halfway into a session.` },
  { icon: DownloadIcon, title: "Installs and updates the mod", body: "The OPEN//77 client is fetched, verified and kept current for you. Nothing to unzip into your game folder by hand, and nothing left behind when you turn it off." },
  { icon: ServerRackIcon, title: "Manages what loads", body: "Choose which mods are active for a session. Some servers ask for a clean load-out, so this is how you keep your own setup and still connect." },
  { icon: PlayIcon, title: "Finds you a world", body: "Browse community servers, filter them, and press connect. The launcher starts the game already pointed at the world you picked." },
];

export default async function DownloadPage() {
  // Read each channel independently at request time; never substitute one version for another.
  await connection();
  const [release, serverRelease] = await Promise.all([fetchLatestLauncherRelease(), fetchLatestServerRelease()]);

  return (
    <>
      <DownloadSurface active="launcher" artwork="/assets/home/night-city-wallpaper-v3.webp">
        <section className={styles.hero} aria-labelledby="download-title">
          <div className={styles.heroCopy}>
            <SurfaceEyebrow>DOWNLOAD</SurfaceEyebrow>
            <h1 id="download-title">Get the<em>OPEN//77 launcher.</em></h1>
            <p className={styles.intro}>One Windows app: it signs you in, checks your game build, installs and updates the mod, and drops you into the server browser. Free, and no account needed to download it — you bring {PLAYER_REQUIREMENT_SHORT}.</p>
            <div className={styles.actions}>
              <Link className={styles.secondary} href="#requirements">What you need <ArrowRightIcon size={16} /></Link>
              <Link className={styles.textLink} href="/docs/launcher">Launcher guide <ArrowRightIcon size={16} /></Link>
            </div>
            <p className={styles.heroNote}><CheckIcon size={15} />Free to download. Joining a server requires an Alpha-enabled account.</p>
          </div>
          <div id="get" className={styles.downloadPanel}>
            {release ? <LauncherDownload release={release} /> : <UnavailableRelease kind="launcher" />}
          </div>
        </section>

        <QuickFacts facts={[
          { icon: WindowsIcon, label: "Player platform", value: "Windows 10 / 11 · 64-bit" },
          { icon: PlayIcon, label: "Game build", value: `Cyberpunk 2077 ${GAME_BUILD} · exact` },
          { icon: CheckIcon, label: "Required expansion", value: GAME_EXPANSION },
          { icon: DownloadIcon, label: "Launcher download", value: release?.sizeBytes != null ? formatBytes(release.sizeBytes) : "Size currently unavailable" },
        ]} />
        <div className={styles.channelGrid}>
          <div id="server" data-release-channel="server" data-release-version={serverRelease?.version}>
            <ArtworkCard image="/assets/home/servers-v2.webp" icon={ServerRackIcon} label="Dedicated server · Windows / Linux · not the launcher" title={serverRelease?.version ?? "Server release unavailable"} href="/host" action="Get the dedicated server" channel="server">
              <p>{serverRelease ? "Ready-to-play Freeroam and system resources, with the .NET runtime included. No Cyberpunk 2077 installation required on the host — available to everyone with Alpha access." : "We couldn’t verify the latest server release from the CDN. No older build is substituted; the page checks again automatically."}</p>
            </ArtworkCard>
          </div>
          <ArtworkCard image="/assets/home/build-v2.webp" icon={PeopleIcon} label="Alpha access" title="Play and build with Alpha access." href="/docs/alpha-access" action="Read the Alpha guide">
            <p>Joining a server requires an Alpha-enabled OPEN//77 account; downloading does not grant access. Every Alpha member can also download the server and start building without an extra application. Need access? Use <code>/alpha apply</code> in any channel on our Discord.</p>
          </ArtworkCard>
        </div>
        <p className={styles.channelNote}>The launcher and the dedicated server are separate release channels, so their version numbers differ. The client the launcher installs is versioned with the server build it speaks to.</p>
        <div className={styles.refreshRow}><ReleaseRefresh /></div>

        <section className={styles.section} id="what-it-does" aria-label="What the launcher does">
          <SurfaceHeading label="WHAT IT DOES" title="Five jobs, one window."><p>The launcher is the whole player side of OPEN//77. You do not install anything into your game folder by hand, and you do not edit a config to join a server.</p></SurfaceHeading>
          <div className={`${styles.features} ${styles.featuresFive}`}>
            {LAUNCHER_DOES.map(({ icon: Icon, title, body }) => <article key={title} className={styles.feature}><Icon size={29} /><h3>{title}</h3><p>{body}</p></article>)}
          </div>
        </section>

        <section className={styles.section} id="first-run">
          <SurfaceHeading label="FIRST RUN" title="What actually happens."><p>Already installed? Open the launcher, pick a server and press connect — it takes care of the rest.</p></SurfaceHeading>
          <ol className={styles.steps}>
            <li><h3>Windows will show a warning</h3><p>The launcher is not code-signed yet, so the first launch brings up SmartScreen&apos;s <em>“Windows protected your PC”</em> screen. Choose <strong>More info</strong>, then <strong>Run anyway</strong>, and you are through. Windows shows that message for every unsigned application — plenty of indie launchers included — and it says nothing about the file itself. <Link href="/docs/launcher">The launcher guide</Link> spells out exactly what that dialog does and does not mean.</p></li>
            <li><h3>Sign in through your browser</h3><p>The launcher opens <Link href="/launcher">the authorization page</Link> on this site. You approve it there, and the launcher receives a token — your password never goes through the app.</p></li>
            <li><h3>Point it at your game, then play</h3><p>It locates your Cyberpunk 2077 install, checks the build, installs the client, and opens the <Link href="/servers">server browser</Link>. From there it is one button.</p></li>
          </ol>
        </section>

        <section className={styles.section} id="requirements">
          <SurfaceHeading label="BEFORE YOU INSTALL" title="What you need." />
          <div className={styles.requirementsGrid}>
            <ul className={styles.requirements}>
              <li><CheckIcon size={18} /><div><h3>Windows 10 or 11, 64-bit</h3><p>The launcher is a Windows desktop application, and the client it installs is a native plugin that loads inside the game process. There is no macOS or Linux player build.</p></div></li>
              <li><CheckIcon size={18} /><div><h3>Your own copy of Cyberpunk 2077 {GAME_BUILD}</h3><p>Your own legal copy — OPEN//77 never distributes the game or any of its assets. The build has to be {GAME_BUILD} exactly, not a minimum: the client hooks the engine at addresses established for that build, and the launcher checks it for you.</p></div></li>
              <li><CheckIcon size={18} /><div><h3>{GAME_EXPANSION}</h3><p>Required rather than optional: the world you land in when you connect is an EP1 save, so there is nothing to load without it.</p></div></li>
              <li><CheckIcon size={18} /><div><h3>The WebView2 runtime</h3><p>The launcher renders its interface with Microsoft Edge WebView2. Windows 11 already ships it; on Windows 10 it installs itself the first time it is needed — so this is one to know about, not one to do.</p></div></li>
            </ul>
            <div className={styles.faq}>
              <details><summary>Windows shows a security warning?</summary><div>Expected: the launcher is not code-signed yet, so SmartScreen flags it like every unsigned application. Choose <strong>More info</strong>, then <strong>Run anyway</strong>. Only run the copy you got from this page, and if you want to be sure it is the same file, compare its SHA-256 under “File details &amp; verification” above. The <Link href="/docs/launcher">launcher guide</Link> explains the dialog in full.</div></details>
              <details><summary>Do I need to install WebView2 myself?</summary><div>No. Windows 11 ships it; on Windows 10 the launcher installs the runtime the first time it is needed.</div></details>
              <details><summary>Why are the launcher and server versions different?</summary><div>They are separate release channels. The Windows button above always serves the current launcher; <Link href="/host">the server page</Link> serves the current dedicated server. Neither substitutes an older build when the other is unavailable.</div></details>
              <details><summary>I want to host, not play.</summary><div>Hosting is a different download. A dedicated server never needs Cyberpunk 2077 installed and does not use this launcher — start at <Link href="/create">Create a Server</Link>, then <Link href="/host">download the server</Link> with your Alpha account.</div></details>
              <details><summary>Does downloading give me Alpha access?</summary><div>No. The download is public; joining a server needs an Alpha-enabled OPEN//77 account. Request access with <code>/alpha apply</code> in any channel on our Discord, and read the <Link href="/docs/alpha-access">Alpha guide</Link> before your first connection.</div></details>
            </div>
          </div>
          <div className={styles.notice}><DiscordIcon size={18} /><p><strong>This is Alpha software, not a stable release.</strong> Expect bugs, crashes, incomplete features and updates that change APIs. The <a href={site.links.discord ?? "https://discord.open2077.net"} target="_blank" rel="noreferrer noopener">Discord</a> is where you can request access with <code>/alpha apply</code>, report reproducible issues and follow the changelog once you have Alpha access.</p></div>
        </section>
      </DownloadSurface>
      <JsonLd data={jsonLdGraph(breadcrumbNode([{ name: "Home", path: "/" }, { name: "Download the Launcher", path: "/download" }]), ...(release ? [launcherApplicationNode(release)] : []))} />
    </>
  );
}

function LauncherDownload({ release }: { release: LauncherRelease }) {
  return (
    <div data-release-channel="launcher" data-release-version={release.version} data-channel-summary="launcher">
      <div className={styles.panelTop}><span className={styles.osBadge}><WindowsIcon size={24} /></span><span className={styles.liveBadge}>LATEST LAUNCHER</span></div>
      <p className={styles.panelKicker}>OPEN//77 for Windows</p>
      <h2 className={styles.version}>{release.version}</h2>
      <div className={styles.panelMeta}><span>64-bit</span>{release.sizeBytes !== null ? <span>{formatBytes(release.sizeBytes)}</span> : null}{release.publishedAtUtc ? <span>{formatReleaseDate(release.publishedAtUtc)}</span> : null}</div>
      <DownloadAction href={release.url} label="Download for Windows" />
      <details className={styles.details}>
        <summary>File details &amp; verification</summary>
        <div className={styles.detailsBody}>
          <p>File: <code>{release.fileName}</code></p>
          {release.sha256 ? <><p>SHA-256 — published because it costs nothing to publish. If you verify your downloads, this PowerShell line prints the same string. Nothing you have to do.</p><CopyLine value={release.sha256} label="Copy launcher SHA-256" /><CopyLine value={verifyCommand(release.fileName)} label="Copy verification command" /></> : <p>A checksum is not published for this build.</p>}
          <p>No account is required for this download. This page is the official source: the build comes straight from the OPEN//77 CDN, and it is the only place we publish it.</p>
        </div>
      </details>
    </div>
  );
}
