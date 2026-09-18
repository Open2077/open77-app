import type { Metadata } from "next";
import Link from "next/link";
import { connection } from "next/server";

import { CopyLine } from "@/components/copy-line";
import { DownloadAction } from "@/components/downloads/download-action";
import { DownloadSurface, QuickFacts, SurfaceEyebrow, SurfaceHeading, UnavailableRelease } from "@/components/downloads/download-surface";
import styles from "@/components/downloads/download-surface.module.css";
import { HostGate } from "@/components/host/host-gate";
import { ArrowRightIcon, CheckIcon, CodeIcon, InfoIcon, LinuxIcon, ServerRackIcon, ShieldIcon, WindowsIcon } from "@/components/icons";
import { JsonLd } from "@/components/json-ld";
import { ReleaseRefresh } from "@/components/release-refresh";
import { formatBytes, formatReleaseDate } from "@/lib/cdn";
import { breadcrumbNode, jsonLdGraph, pageMetadata } from "@/lib/seo";
import { fetchLatestServerRelease, type ServerBuild, type ServerRelease } from "@/lib/server-release";

export const metadata: Metadata = {
  ...pageMetadata({
    title: "Host a Server",
    description: "Download the OPEN//77 dedicated server for Windows or Linux. Everyone with Alpha access can host and build, with Freeroam, Warden and the runtime included.",
    path: "/host",
  }),
  // Keep this account-gated page out of search results until access is unrestricted.
  robots: { index: false, follow: false },
};

const RUN_COMMANDS: Record<ServerBuild["os"], string> = { windows: "Start.cmd", linux: "./start.sh" };

export default async function HostPage() {
  await connection();
  const release = await fetchLatestServerRelease();

  return (
    <>
      <DownloadSurface active="server" artwork="/assets/home/night-city-v2.webp">
        <section className={styles.hero} aria-labelledby="host-title">
          <div className={styles.heroCopy}>
            <SurfaceEyebrow>Dedicated server downloads</SurfaceEyebrow>
            <h1 id="host-title">Your server.<em>Your Night City.</em></h1>
            <p className={styles.intro}>Download the server, configure your world and welcome your community. Everyone with Alpha access can start building — no extra application.</p>
            <div className={styles.actions}>
              <Link href="#download" className={styles.primary}>Get the server <ArrowRightIcon size={17} /></Link>
              <Link href="/docs/host-a-server" className={styles.secondary}>Setup guide</Link>
            </div>
            <p className={styles.heroNote}><CheckIcon size={15} />Self-hosted. No Cyberpunk 2077 installation needed on the host.</p>
          </div>
          <aside className={styles.serverIntro}>
            <SurfaceEyebrow>In the box</SurfaceEyebrow>
            <h2>Ready to run.<br />Yours to customize.</h2>
            <ul>
              <li><CheckIcon size={16} />Dedicated server &amp; bundled .NET runtime</li>
              <li><CheckIcon size={16} />Freeroam gamemode &amp; system resources</li>
              <li><CheckIcon size={16} />Warden setup &amp; web administration</li>
              <li><CheckIcon size={16} />Lua scripting for your own gameplay</li>
            </ul>
            <Link className={styles.textLink} href="/create">Explore what you can build <ArrowRightIcon size={16} /></Link>
          </aside>
        </section>
        <QuickFacts facts={[
          { icon: WindowsIcon, label: "Windows server", value: "64-bit · ZIP archive" },
          { icon: LinuxIcon, label: "Linux server", value: "64-bit · TAR.GZ archive" },
          { icon: ShieldIcon, label: "Account access", value: "Alpha members & administrators" },
          { icon: ServerRackIcon, label: "Hosting", value: "Your machine or your VPS" },
        ]} />

        <section className={styles.section} id="download" aria-label="Server downloads">
          <HostGate>{release ? <ReleaseDownloads release={release} /> : <UnavailableRelease kind="server" />}</HostGate>
          <div className={styles.refreshRow}><ReleaseRefresh /></div>
          <p className={styles.channelNote}>Dedicated server channel only. Launcher and client versions are separate.</p>
        </section>

        <section className={styles.section} id="start">
          <SurfaceHeading label="From archive to online" title="Set up. Start small. Build further."><p>The same workflow for a local test server or a community host. Start with the included Freeroam, then make it yours.</p></SurfaceHeading>
          <ol className={styles.steps}>
            <li><h3>Create your license.</h3><p>Sign in and create a key in the <Link href="/account/keys">keymaster</Link>. Keep it private: the key identifies your server to the platform.</p></li>
            <li><h3>Extract &amp; configure.</h3><p>Unpack into a new folder. Run <code>Start.cmd</code> on Windows or <code>./start.sh</code> on Linux. Warden’s first-run wizard helps create your <code>server.jsonc</code>.</p></li>
            <li><h3>Open your doors.</h3><p>Configure your license and reachable game/resource endpoints. Public servers register with the master so Alpha players can find them in the launcher.</p></li>
          </ol>
          <div className={styles.notice}><InfoIcon size={18} /><p><strong>Running a public server?</strong> Configure your firewall and advertised ports, protect your Warden access and keep your license secret. Follow the <Link href="/docs/host-a-server">hosting guide</Link> before inviting players.</p></div>
        </section>

        <section className={styles.section}>
          <SurfaceHeading label="Good to know" title="A few things before you host." />
          <div className={styles.requirementsGrid}>
            <ul className={styles.requirements}>
              <li><CheckIcon size={18} /><div><h3>No game install on the server.</h3><p>The dedicated process runs independently. Players still need the supported Cyberpunk 2077 build and Phantom Liberty to connect.</p></div></li>
              <li><CheckIcon size={18} /><div><h3>The runtime is included.</h3><p>Both downloads include .NET. Your operating system still needs the native prerequisites documented in the <Link href="/docs/host-a-server">setup guide</Link>.</p></div></li>
              <li><CheckIcon size={18} /><div><h3>Your resources, your requirements.</h3><p>Hardware needs depend on player count and your packages. Start with a small test, measure your workload and scale from there.</p></div></li>
            </ul>
            <div className={styles.faq}>
              <details><summary>Do I need special developer access?</summary><div>No. Everyone with Alpha access can download and run the server. Sign in with your Alpha-enabled OPEN//77 account to see the archives. No separate developer application is required.</div></details>
              <details><summary>What if I cannot see the downloads?</summary><div>Check that you are signed in to the account with Alpha access. If access cannot be verified, use “Check access again”. To request access, use <code>/alpha apply</code> in any channel on our Discord.</div></details>
              <details><summary>How do I configure the license?</summary><div>Supply your key during setup, or use <code>OP77_LICENSE_KEY</code> when configuring manually. The <Link href="/docs/server-licensing">licensing guide</Link> covers activation. Never include keys in public scripts or screenshots.</div></details>
              <details><summary>How do I update an existing server?</summary><div>Read the release notes, back up your configuration, resources and data, then stop the server before updating. Check client/server compatibility and test custom packages before reopening.</div></details>
            </div>
          </div>
        </section>

        <section className={styles.section} aria-label="Hosting tools">
          <div className={styles.features}>
            {[
              { icon: ShieldIcon, title: "Meet Warden.", body: "Set up, monitor and administer your server from its web panel.", href: "/docs/warden", action: "Warden guide" },
              { icon: CodeIcon, title: "Build with Lua.", body: "Explore the APIs and create your first custom gameplay resource.", href: "/docs/api", action: "API reference" },
              { icon: ServerRackIcon, title: "Manage resources.", body: "Learn package structure, configuration and the resource lifecycle.", href: "/docs/server-resources", action: "Resource guide" },
              { icon: WindowsIcon, title: "Here to play?", body: "Players need the launcher. The server archive is for hosting only.", href: "/download", action: "Get the launcher" },
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
        <div><SurfaceEyebrow>Latest dedicated server</SurfaceEyebrow><h2>{release.version}</h2></div>
        <div><span className={styles.liveBadge}>OFFICIAL CDN RELEASE</span>{release.publishedAtUtc ? <p>Published {formatReleaseDate(release.publishedAtUtc)}</p> : null}</div>
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
        <dl><div><dt>Download size</dt><dd>{build.sizeBytes !== null ? formatBytes(build.sizeBytes) : "Not published"}</dd></div><div><dt>Start command</dt><dd><code>{RUN_COMMANDS[build.os]}</code></dd></div><div><dt>Runtime</dt><dd>.NET included</dd></div></dl>
        <DownloadAction href={build.url} label={`Download for ${build.os === "windows" ? "Windows" : "Linux"}`} />
        <details className={styles.details}>
          <summary>Archive details &amp; verification</summary>
          <div className={styles.detailsBody}><p>File: <code>{build.fileName}</code></p>
            {build.archiveSha256 ? <><p>Archive SHA-256</p><CopyLine value={build.archiveSha256} label={`Copy ${build.os} archive SHA-256`} /><p>Verify this against the downloaded archive, before extracting it.</p></> : <p>An archive checksum is not published for this build.</p>}
          </div>
        </details>
      </> : <p>This platform’s archive is not available for the current release. Check for updates below.</p>}
    </li>
  );
}
