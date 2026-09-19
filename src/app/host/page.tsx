import type { Metadata } from "next";
import Link from "next/link";
import { connection } from "next/server";

import { CopyLine } from "@/components/copy-line";
import { DownloadAction } from "@/components/downloads/download-action";
import { DownloadSurface, QuickFacts, SurfaceEyebrow, SurfaceHeading, UnavailableRelease } from "@/components/downloads/download-surface";
import styles from "@/components/downloads/download-surface.module.css";
import { HostGate } from "@/components/host/host-gate";
import { ArrowRightIcon, CheckIcon, CodeIcon, LinuxIcon, ServerRackIcon, ShieldIcon, WindowsIcon } from "@/components/icons";
import { JsonLd } from "@/components/json-ld";
import { ReleaseRefresh } from "@/components/release-refresh";
import { formatBytes, formatReleaseDate } from "@/lib/cdn";
import { PLAYER_REQUIREMENT_SHORT } from "@/lib/requirements";
import { breadcrumbNode, jsonLdGraph, pageMetadata } from "@/lib/seo";
import { fetchLatestServerRelease, type ServerBuild, type ServerRelease } from "@/lib/server-release";

export const metadata: Metadata = {
  ...pageMetadata({
    title: "Host a Server",
    description:
      "Everyone with Alpha access can download the OPEN//77 server for Windows or Linux and build a custom Cyberpunk 2077 gamemode. No separate developer application or game install on the host.",
    path: "/host",
  }),
  // Server downloads are exposed to Alpha accounts and staff. Keep this
  // account-gated page out of search results until access is unrestricted.
  robots: { index: false, follow: false },
};

/** How you launch the server on each platform, once it is unpacked. */
const RUN_COMMANDS: Record<ServerBuild["os"], string> = { windows: "Start.cmd", linux: "./start.sh" };

const SETUP_STEPS = [
  { title: "Mint a license key", body: <>Create one in the <Link href="/account/keys">keymaster</Link>. It ties the server to your account and is shown once, so keep it somewhere safe.</> },
  { title: "Unpack and configure", body: <>Extract into a new folder and run <code>Start.cmd</code> on Windows or <code>./start.sh</code> on Linux. Warden&apos;s first-run wizard creates <code>server.jsonc</code> with your server name, visibility and public endpoints.</> },
  { title: "Configure your license", body: <>Supply your license in setup, or keep it in <code>OP77_LICENSE_KEY</code> when configuring the server manually. The master URL defaults to <code>https://master.open2077.net/</code>.</> },
  { title: "Run it", body: <>Open the game and resource-download ports, then start the configured server. Public servers register with the master so Alpha players can discover and join them.</> },
];

export default async function HostPage() {
  // Never bake a mutable release pointer into an ISR/build-time snapshot.
  await connection();
  const release = await fetchLatestServerRelease();

  return (
    <>
      <DownloadSurface active="server" artwork="/assets/home/night-city-wallpaper-v3.webp">
        <section className={styles.hero} aria-labelledby="host-title">
          <div className={styles.heroCopy}>
            <SurfaceEyebrow>HOST A SERVER</SurfaceEyebrow>
            <h1 id="host-title">Host your own<em>OPEN//77 server.</em></h1>
            <p className={styles.intro}>Everyone with Alpha access can download the dedicated server and start building. No separate developer application. License it to your account and create your own gamemode. The host machine never needs Cyberpunk 2077 installed.</p>
            <div className={styles.actions}>
              <Link href="#download" className={styles.primary}>Get the server <ArrowRightIcon size={17} /></Link>
              <Link href="/account/keys" className={styles.secondary}>License keys</Link>
              <Link href="/docs/host-a-server" className={styles.textLink}>Full hosting guide <ArrowRightIcon size={16} /></Link>
            </div>
            <p className={styles.heroNote}><CheckIcon size={15} />Official builds only: download the server from this page or the official CDN, nowhere else. Each archive lists its SHA-256 so you can verify what you run.</p>
          </div>
          <aside className={styles.serverIntro}>
            <SurfaceEyebrow>SELF-CONTAINED DOWNLOADS</SurfaceEyebrow>
            <h2>Everything in<br />the archive.</h2>
            <ul>
              <li><CheckIcon size={16} />The dedicated server, with the .NET runtime included</li>
              <li><CheckIcon size={16} />Freeroam, ready to play, and its system resources</li>
              <li><CheckIcon size={16} />Warden, the first-run wizard and the web admin panel</li>
              <li><CheckIcon size={16} />The Lua 5.4 runtime for your own resources</li>
            </ul>
            <p>Configure your license and reachable endpoints; no Cyberpunk 2077 installation is needed on the server machine.</p>
            <Link className={styles.textLink} href="/create">What a server gives you <ArrowRightIcon size={16} /></Link>
          </aside>
        </section>
        <QuickFacts facts={[
          { icon: WindowsIcon, label: "Windows server", value: "64-bit · .zip archive" },
          { icon: LinuxIcon, label: "Linux server", value: "64-bit · .tar.gz archive" },
          { icon: ShieldIcon, label: "Who can download", value: "Every Alpha account, and staff" },
          { icon: ServerRackIcon, label: "Runs on", value: "Your hardware or a rented machine" },
        ]} />

        <section className={styles.section} id="download" aria-label="Server downloads">
          <HostGate>{release ? <ReleaseDownloads release={release} /> : <UnavailableRelease kind="server" />}</HostGate>
          <div className={styles.refreshRow}><ReleaseRefresh /></div>
          <p className={styles.channelNote}>The dedicated server is its own release channel; the launcher has a separate version.</p>
        </section>

        <section className={styles.section} id="start">
          <SurfaceHeading label="GETTING STARTED" title="From download to open doors."><p>The same four steps for a local test server and a public one. Start with the included Freeroam, then make it yours.</p></SurfaceHeading>
          <ol className={`${styles.steps} ${styles.stepsFour}`}>
            {SETUP_STEPS.map((step) => <li key={step.title}><h3>{step.title}</h3><p>{step.body}</p></li>)}
          </ol>
          <div className={styles.notice}><ShieldIcon size={18} /><p><strong>Running a public server?</strong> Open the game and resource-download ports in your firewall, keep your license key out of scripts and screenshots, and protect your Warden access. The <Link href="/docs/host-a-server">hosting guide</Link> covers all of it before you invite players.</p></div>
        </section>

        <section className={styles.section}>
          <SurfaceHeading label="BEFORE YOU HOST" title="What you need." />
          <div className={styles.requirementsGrid}>
            <ul className={styles.requirements}>
              <li><CheckIcon size={18} /><div><h3>The game is not needed</h3><p>A dedicated server runs independently of Cyberpunk 2077, REDengine and the client plugin. It never loads game content and never needs a copy installed.</p></div></li>
              <li><CheckIcon size={18} /><div><h3>Windows x64 or Linux x64</h3><p>Both official packages include the .NET runtime and native networking dependencies. No separate .NET installation on the host; the <Link href="/docs/host-a-server">setup guide</Link> lists the OS-level prerequisites.</p></div></li>
              <li><CheckIcon size={18} /><div><h3>Your players still need the game</h3><p>Everyone who connects needs {PLAYER_REQUIREMENT_SHORT} on their own machine, plus Alpha access. Hosting changes nothing about that.</p></div></li>
            </ul>
            <div className={styles.faq}>
              <details><summary>Do I need special developer access?</summary><div>No. Everyone with Alpha access can download and run the server. Sign in with your Alpha-enabled OPEN//77 account to see the archives. No separate developer application, project review or staff role.</div></details>
              <details><summary>I am signed in but see no downloads.</summary><div>Check that the account you are signed in with is the one with Alpha access, then use “Check access again”. To request access, use <code>/alpha apply</code> in any channel on our Discord.</div></details>
              <details><summary>Where does the license key go?</summary><div>Supply it in Warden&apos;s first-run setup, or keep it in <code>OP77_LICENSE_KEY</code> when configuring the server by hand. The <Link href="/docs/server-licensing">licensing guide</Link> covers activation. Never paste keys into public scripts or screenshots.</div></details>
              <details><summary>How do I update an existing server?</summary><div>Read the release notes, back up your configuration, resources and data, then stop the server before unpacking the new archive over it. Check client/server compatibility and test your own resources before reopening.</div></details>
            </div>
          </div>
        </section>

        <section className={styles.section} aria-label="Hosting tools">
          <div className={styles.features}>
            {[
              { icon: ShieldIcon, title: "Warden, the admin panel", body: "Set up, monitor and administer your server from its web panel: players, resources, Workshop installs.", href: "/docs/warden", action: "Meet Warden" },
              { icon: CodeIcon, title: "The Lua API", body: "Vehicles, blips, NPCs, weather, interactions: the same permission-gated natives OPEN//77's own resources are built on.", href: "/docs/api", action: "Lua API reference" },
              { icon: ServerRackIcon, title: "Resources", body: "The resource format, the manifest, and the lifecycle of a package your server loads and streams to players.", href: "/docs/server-resources", action: "Resources & scripting" },
              { icon: WindowsIcon, title: "Here to play?", body: "Players need the launcher, not this archive. It signs you in, checks your game and takes you to the server browser.", href: "/download", action: "Get the launcher" },
            ].map(({ icon: Icon, title, body, href, action }) => <article className={styles.feature} key={title}><Icon size={28} /><h3>{title}</h3><p>{body}</p><Link className={styles.textLink} href={href}>{action}<ArrowRightIcon size={15} /></Link></article>)}
          </div>
        </section>
      </DownloadSurface>
      <JsonLd data={jsonLdGraph(breadcrumbNode([{ name: "Home", path: "/" }, { name: "Host a Server", path: "/host" }]))} />
    </>
  );
}

function ReleaseDownloads({ release }: { release: ServerRelease }) {
  return (
    <div data-release-channel="server" data-release-version={release.version}>
      <div className={styles.releaseHeading}>
        <div><SurfaceEyebrow>LATEST SERVER RELEASE</SurfaceEyebrow><h2>{release.version}</h2></div>
        <div><span className={styles.liveBadge}>OFFICIAL BUILD</span>{release.publishedAtUtc ? <p>Published {formatReleaseDate(release.publishedAtUtc)}</p> : null}</div>
      </div>
      <ul className={styles.builds}>{release.builds.map((build) => <BuildCard key={build.platform} build={build} />)}</ul>
    </div>
  );
}

function BuildCard({ build }: { build: ServerBuild }) {
  const OsIcon = build.os === "windows" ? WindowsIcon : LinuxIcon;
  return (
    <li className={`${styles.build} ${build.url ? "" : styles.buildUnavailable}`}>
      <div className={styles.buildTop}><OsIcon size={34} /><div><h3>{build.label}</h3><p>{build.osLabel} · .{build.archiveKind} archive</p></div></div>
      {build.url ? <>
        <dl><div><dt>Size</dt><dd>{build.sizeBytes !== null ? formatBytes(build.sizeBytes) : "Not published"}</dd></div><div><dt>Run</dt><dd><code>{RUN_COMMANDS[build.os]}</code></dd></div><div><dt>Runtime</dt><dd>.NET included</dd></div></dl>
        <DownloadAction href={build.url} label={`Download for ${build.os === "windows" ? "Windows" : "Linux"}`} />
        <details className={styles.details}>
          <summary>Archive details &amp; verification</summary>
          <div className={styles.detailsBody}><p>File: <code>{build.fileName}</code></p>
            {build.archiveSha256 ? <><p>Archive SHA-256. Compare it against the downloaded archive before extracting.</p><CopyLine value={build.archiveSha256} label={`Copy the ${build.os} archive SHA-256`} /></> : <p>An archive checksum is not published for this build.</p>}
          </div>
        </details>
      </> : <p>This platform&apos;s build has not been published for this release yet. Use “Check for updates” below to retry.</p>}
    </li>
  );
}
