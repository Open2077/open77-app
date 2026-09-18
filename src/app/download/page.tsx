import Link from "next/link";
import { connection } from "next/server";

import { CopyLine } from "@/components/copy-line";
import { DownloadAction } from "@/components/downloads/download-action";
import { ArtworkCard, DownloadSurface, QuickFacts, SurfaceEyebrow, SurfaceHeading, UnavailableRelease } from "@/components/downloads/download-surface";
import styles from "@/components/downloads/download-surface.module.css";
import { ArrowRightIcon, CheckIcon, DownloadIcon, InfoIcon, PeopleIcon, PlayIcon, ServerRackIcon, ShieldIcon, WindowsIcon } from "@/components/icons";
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
  description: `Download the free OPEN//77 Windows launcher to install, update and play Cyberpunk 2077 multiplayer. Requires ${PLAYER_REQUIREMENT_SHORT} and Alpha access to join servers.`,
  path: "/download",
});

const FEATURES = [
  { icon: DownloadIcon, title: "Easy setup.", body: "Locate your game and install the multiplayer client. No manual file juggling." },
  { icon: ShieldIcon, title: "Stay up to date.", body: "Review available updates and keep your launcher and client ready for your next session." },
  { icon: ServerRackIcon, title: "Find your people.", body: "Browse community servers and choose the experience you want to join." },
  { icon: PlayIcon, title: "Launch & play.", body: "Download the server’s resources and start the game with your destination already selected." },
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
            <SurfaceEyebrow>Your way into Night City</SurfaceEyebrow>
            <h1 id="download-title">One launcher.<em>A bigger city.</em></h1>
            <p className={styles.intro}>Install, update and launch Cyberpunk 2077 multiplayer from one place. Pick a community. Join your friends. Make the city yours.</p>
            <div className={styles.actions}>
              <Link className={styles.secondary} href="#requirements">What you need <ArrowRightIcon size={16} /></Link>
              <Link className={styles.textLink} href="/docs/launcher">Launcher guide <ArrowRightIcon size={16} /></Link>
            </div>
            <p className={styles.heroNote}><CheckIcon size={15} />Free to download. Alpha access required to join servers.</p>
          </div>
          <div id="get" className={styles.downloadPanel}>
            {release ? <LauncherDownload release={release} /> : <UnavailableRelease kind="launcher" />}
          </div>
        </section>

        <QuickFacts facts={[
          { icon: WindowsIcon, label: "Player platform", value: "Windows 10 / 11 · 64-bit" },
          { icon: PlayIcon, label: "Game version", value: `Cyberpunk 2077 ${GAME_BUILD}` },
          { icon: CheckIcon, label: "Required expansion", value: GAME_EXPANSION },
          { icon: DownloadIcon, label: "Launcher download", value: release?.sizeBytes != null ? formatBytes(release.sizeBytes) : "Size currently unavailable" },
        ]} />
        <div className={styles.channelGrid}>
          <div id="server" data-release-channel="server" data-release-version={serverRelease?.version}>
            <ArtworkCard image="/assets/home/servers-v2.webp" icon={ServerRackIcon} label="Dedicated server · Windows / Linux" title={serverRelease?.version ?? "Server release unavailable"} href="/host" action="Get the dedicated server" channel="server">
              <p>{serverRelease ? "Here to host? Get the standalone server, Freeroam and Warden. No game installation needed on the host." : "The CDN release could not be verified. Check again below or visit the server download page."}</p>
            </ArtworkCard>
          </div>
          <ArtworkCard image="/assets/home/build-v2.webp" icon={PeopleIcon} label="Alpha access" title="Play here. Build here." href="/docs/alpha-access" action="How Alpha access works">
            <p>Everyone with Alpha access can play and create a server. Need an invite? Use <code>/alpha apply</code> in any channel on our Discord.</p>
          </ArtworkCard>
        </div>
        <p className={styles.channelNote}>The launcher, game client and dedicated server are separate release channels. Their version numbers may differ.</p>
        <div className={styles.refreshRow}><ReleaseRefresh /></div>

        <section className={styles.section} aria-label="Launcher features">
          <SurfaceHeading label="Less setup. More city." title="Everything before you hit play." />
          <div className={styles.features}>
            {FEATURES.map(({ icon: Icon, title, body }) => <article key={title} className={styles.feature}><Icon size={29} /><h3>{title}</h3><p>{body}</p></article>)}
          </div>
        </section>

        <section className={styles.section} id="first-run">
          <SurfaceHeading label="Your first connection" title="Three steps. Then you’re in."><p>Already installed? Open your launcher and choose a server. It handles the next steps.</p></SurfaceHeading>
          <ol className={styles.steps}>
            <li><h3>Download & open.</h3><p>Get the Windows launcher above. Use the official download and review any Windows security warning before running it.</p></li>
            <li><h3>Sign in & set up.</h3><p>Authorize your OPEN//77 account through your browser, then select your game installation. The launcher checks the required build and expansion.</p></li>
            <li><h3>Choose your server.</h3><p>Browse available communities, review their required resources and connect. An Alpha-enabled account is required to join.</p></li>
          </ol>
        </section>

        <section className={styles.section} id="requirements">
          <SurfaceHeading label="Before you download" title="A quick pre-flight check." />
          <div className={styles.requirementsGrid}>
            <ul className={styles.requirements}>
              <li><CheckIcon size={18} /><div><h3>Windows 10 or 11, 64-bit.</h3><p>The player launcher and game client run on Windows. There is no native Linux or macOS player build.</p></div></li>
              <li><CheckIcon size={18} /><div><h3>Your own Cyberpunk 2077 {GAME_BUILD}.</h3><p>A legal copy of the game at this exact version. The launcher checks compatibility before you connect.</p></div></li>
              <li><CheckIcon size={18} /><div><h3>{GAME_EXPANSION}.</h3><p>The expansion is required to play, not optional. OPEN//77 does not include the base game or DLC.</p></div></li>
              <li><CheckIcon size={18} /><div><h3>An Alpha-enabled account.</h3><p>Downloading the launcher is public. Joining servers needs <Link href="/docs/alpha-access">Alpha access</Link>; no separate developer application is needed to host.</p></div></li>
            </ul>
            <div className={styles.faq}>
              <details><summary>Windows shows a security warning?</summary><div>The launcher is not yet code-signed, so Windows may display SmartScreen. Only run a copy you trust from this official source. You can compare its SHA-256 under “File details & verification”. Do not disable Windows security. See the <Link href="/docs/launcher">launcher guide</Link> for more information.</div></details>
              <details><summary>Do I need to install WebView2?</summary><div>The launcher uses Microsoft Edge WebView2. It normally ships with Windows 11; on supported Windows 10 installations, launcher setup handles the runtime when needed.</div></details>
              <details><summary>Why are the version numbers different?</summary><div>The launcher, multiplayer client and dedicated server are released independently. The Windows button above always uses the launcher channel, while server downloads use the server channel.</div></details>
              <details><summary>I want to host, not play.</summary><div>You need the <Link href="/host">dedicated server download</Link>, not the player launcher. It runs on Windows or Linux without a game installation on the host machine.</div></details>
            </div>
          </div>
          <div className={styles.notice}><InfoIcon size={18} /><p><strong>Alpha means work in progress.</strong> Bugs, incomplete features and breaking API changes are possible. Join <a href={site.links.discord ?? "https://discord.open2077.net"} target="_blank" rel="noreferrer noopener">Discord</a> for access, support and release announcements.</p></div>
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
          {release.sha256 ? <><p>SHA-256 checksum</p><CopyLine value={release.sha256} label="Copy launcher SHA-256" /><p>In PowerShell, from your download folder:</p><CopyLine value={`Get-FileHash -Algorithm SHA256 .\\${release.fileName}`} label="Copy verification command" /></> : <p>A checksum is not published for this build.</p>}
          <p>No account is required for this download.</p>
        </div>
      </details>
    </div>
  );
}
