import Image from "next/image";
import Link from "next/link";
import { connection } from "next/server";

import { CopyLine } from "@/components/copy-line";
import { DownloadAction } from "@/components/downloads/download-action";
import { windowsGlyph } from "@/components/downloads/glyphs";
import {
  ArrowLink,
  ArtCard,
  Checklist,
  Faq,
  FileDetails,
  JumpLink,
  ReleaseStatus,
  SpecStrip,
  Steps,
  UnavailableRelease,
} from "@/components/downloads/product-blocks";
import { ProductHero } from "@/components/downloads/product-hero";
import { JsonLd } from "@/components/json-ld";
import { ReleaseRefresh } from "@/components/release-refresh";
import { Tag } from "@/components/ui/chip";
import { Notice } from "@/components/ui/feedback";
import { GlitchFrame } from "@/components/ui/glitch-frame";
import { Icon } from "@/components/ui/icon";
import {
  checkmarkBadge01,
  checkmarkCircle02,
  download02,
  gameController03,
  layers01,
  play,
  shield01,
} from "@/components/ui/icons";
import { Page, Section } from "@/components/ui/page";
import { Display, Eyebrow, Lead } from "@/components/ui/typography";
import { formatBytes, formatReleaseDate } from "@/lib/cdn";
import { fetchLatestLauncherRelease, type LauncherRelease } from "@/lib/launcher-release";
import { GAME_BUILD, GAME_EXPANSION, PLAYER_REQUIREMENT_SHORT } from "@/lib/requirements";
import { breadcrumbNode, jsonLdGraph, launcherApplicationNode, pageMetadata } from "@/lib/seo";
import { fetchLatestServerRelease } from "@/lib/server-release";
import { site } from "@/lib/site";

import styles from "./download.module.css";

export const metadata = pageMetadata({
  title: "Download the Launcher",
  description:
    "Download the OPEN//77 launcher for Windows. It signs you in, checks your Cyberpunk 2077 build, installs and updates the mod, and takes you to the server browser. Free; requires your own copy of the game.",
  path: "/download",
});

const DISCORD = site.links.discord ?? "https://discord.open2077.net";

/** PowerShell is on every supported Windows, so the check needs no install. */
function verifyCommand(fileName: string): string {
  return `Get-FileHash -Algorithm SHA256 .\\${fileName}`;
}

const LAUNCHER_DOES = [
  {
    icon: shield01,
    title: "Signs you in",
    body: "One OPEN//77 account, authorized in your browser rather than in the app. The launcher never sees your password.",
  },
  {
    icon: checkmarkCircle02,
    title: "Checks your game",
    body: `It makes sure your Cyberpunk 2077 install is build ${GAME_BUILD} with ${GAME_EXPANSION} before it installs anything. The client is built against that exact version, so you hear about a mismatch up front rather than halfway into a session.`,
  },
  {
    icon: download02,
    title: "Installs and updates the mod",
    body: "The OPEN//77 client is fetched, verified and kept current for you. Nothing to unzip into your game folder by hand, and nothing left behind when you turn it off.",
  },
  {
    icon: layers01,
    title: "Manages what loads",
    body: "Choose which mods are active for a session. Some servers ask for a clean load-out, so this is how you keep your own setup and still connect.",
  },
  {
    icon: play,
    title: "Finds you a world",
    body: "Browse community servers, filter them, and press connect. The launcher starts the game already pointed at the world you picked.",
  },
];

const FIRST_RUN = [
  {
    title: "Windows will show a warning",
    body: (
      <p>
        The launcher is not code-signed yet, so the first launch brings up SmartScreen&apos;s{" "}
        <em>“Windows protected your PC”</em> screen. Choose <strong>More info</strong>, then <strong>Run anyway</strong>, and
        you are through. Windows shows that message for every unsigned application, plenty of indie launchers included, and
        it says nothing about the file itself. <Link href="/docs/launcher">The launcher guide</Link> spells out exactly what that
        dialog does and does not mean.
      </p>
    ),
  },
  {
    title: "Sign in through your browser",
    body: (
      <p>
        The launcher opens <Link href="/launcher">the authorization page</Link> on this site. You approve it there, and the
        launcher receives a token. Your password never goes through the app.
      </p>
    ),
  },
  {
    title: "Point it at your game, then play",
    body: (
      <p>
        It locates your Cyberpunk 2077 install, checks the build, installs the client, and opens the{" "}
        <Link href="/servers">server browser</Link>. From there it is one button.
      </p>
    ),
  },
];

const REQUIREMENTS = [
  {
    title: "Windows 10 or 11, 64-bit",
    body: "The launcher is a Windows desktop application, and the client it installs is a native plugin that loads inside the game process. There is no macOS or Linux player build.",
  },
  {
    title: `Your own copy of Cyberpunk 2077 ${GAME_BUILD}`,
    body: `Your own legal copy: OPEN//77 never distributes the game or any of its assets. The build has to be ${GAME_BUILD} exactly, not a minimum: the client hooks the engine at addresses established for that build, and the launcher checks it for you.`,
  },
  {
    title: GAME_EXPANSION,
    body: "Required rather than optional: the world you land in when you connect is an EP1 save, so there is nothing to load without it.",
  },
];

const QUESTIONS = [
  {
    q: "Windows shows a security warning?",
    a: (
      <>
        Expected: the launcher is not code-signed yet, so SmartScreen flags it like every unsigned application. Choose{" "}
        <strong>More info</strong>, then <strong>Run anyway</strong>. Only run the copy you got from this page, and if you
        want to be sure it is the same file, compare its SHA-256 under “File details &amp; verification” above. The{" "}
        <Link href="/docs/launcher">launcher guide</Link> explains the dialog in full.
      </>
    ),
  },
  {
    q: "Why are the launcher and server versions different?",
    a: (
      <>
        They are separate release channels. The Windows button above always serves the current launcher;{" "}
        <Link href="/host">the server page</Link> serves the current dedicated server. Neither substitutes an older build when the
        other is unavailable.
      </>
    ),
  },
  {
    q: "I want to host, not play.",
    a: (
      <>
        Hosting is a different download. A dedicated server never needs Cyberpunk 2077 installed and does not use this
        launcher. Start at <Link href="/create">Create a Server</Link>, then <Link href="/host">download the server</Link> with your
        Alpha account.
      </>
    ),
  },
  {
    q: "Does downloading give me Alpha access?",
    a: (
      <>
        No. The download is public; joining a server needs an Alpha-enabled OPEN//77 account. Request access with{" "}
        <code>/alpha apply</code> in any channel on our Discord, and read the <Link href="/docs/alpha-access">Alpha guide</Link>{" "}
        before your first connection.
      </>
    ),
  },
];

export default async function DownloadPage() {
  // Read each channel independently at request time; never substitute one version for another.
  await connection();
  const [release, serverRelease] = await Promise.all([fetchLatestLauncherRelease(), fetchLatestServerRelease()]);

  return (
    <Page tone="yellow">
      <ProductHero
        titleId="download-title"
        eyebrow="Download · OPEN//77 for Windows"
        title={["Get the", "launcher"]}
        accent={[1]}
        lead={
          <>
            One Windows app: it signs you in, checks your game, installs and updates the mod, and opens the server browser.
            Free to download; you bring <strong>{PLAYER_REQUIREMENT_SHORT}</strong>.
          </>
        }
        className={styles.hero}
        art={{ src: "/home/img/players-bg.webp", position: "60% 50%" }}
        figure={{ src: "/home/img/hero-v-right.webp", width: 1784, height: 2048 }}
        strip={
          <SpecStrip
            facts={[
              { icon: windowsGlyph, label: "Player platform", value: "Windows 10 / 11 · 64-bit" },
              { icon: gameController03, label: "Game build", value: `Cyberpunk 2077 ${GAME_BUILD} · exact` },
              { icon: checkmarkBadge01, label: "Required expansion", value: GAME_EXPANSION },
              {
                icon: download02,
                label: "Launcher download",
                value: release?.sizeBytes != null ? formatBytes(release.sizeBytes) : "Size currently unavailable",
              },
            ]}
          />
        }
      >
        <div id="get" className={styles.get}>
          {release ? <LauncherDownload release={release} /> : <UnavailableRelease kind="launcher" />}
        </div>
        <div className={styles.heroLinks}>
          <JumpLink href="#requirements">What you need</JumpLink>
          <JumpLink href="#alpha">Alpha access</JumpLink>
          <ArrowLink href="/docs/launcher">Launcher guide</ArrowLink>
        </div>
      </ProductHero>

      <Section
        id="alpha"
        eyebrow="Access & release channels"
        title={["Free to download.", "Alpha to play."]}
        lead={
          <>
            Joining a server requires an <strong>Alpha-enabled OPEN//77 account</strong>; downloading does not grant access.
            Every Alpha member can also download the dedicated server and start building, without an extra application.
          </>
        }
      >
        <div className={styles.channels}>
          <ArtCard
            image="/home/img/server-roleplay.webp"
            sub="Alpha access"
            title="Play and build with Alpha access."
            href="/docs/alpha-access"
            action="Read the Alpha guide"
          >
            <p>
              Need access? Use <code>/alpha apply</code> in any channel on our{" "}
              <a href={DISCORD} target="_blank" rel="noreferrer noopener" className={styles.inlineLink}>
                Discord
              </a>
              . Sign in to the launcher with the account you applied with, and the server browser opens up.
            </p>
          </ArtCard>
          <div id="server" data-release-channel="server" data-release-version={serverRelease?.version}>
            <ArtCard
              image="/home/img/creators-bg.webp"
              tone="blue"
              sub="Dedicated server · Windows / Linux · not the launcher"
              title={serverRelease?.version ?? "Server release unavailable"}
              titleAs="h2"
              href="/host"
              action="Get the dedicated server"
              data-channel-summary="server"
            >
              <p>
                {serverRelease
                  ? "Ready-to-play Freeroam and system resources, with the .NET runtime included. No Cyberpunk 2077 installation required on the host. Available to everyone with Alpha access."
                  : "We couldn’t verify the latest server release from the CDN. No older build is substituted; the page checks again automatically."}
              </p>
            </ArtCard>
          </div>
        </div>
        <ReleaseStatus
          className={styles.status}
          note="The launcher and the dedicated server are separate release channels, so their version numbers differ. The client the launcher installs is versioned with the server build it speaks to."
        >
          <ReleaseRefresh />
        </ReleaseStatus>
      </Section>

      <Section id="what-it-does" className={styles.jobsSection}>
        <div className={styles.jobs}>
          <div className={styles.jobsIntro}>
            <Eyebrow>What it does</Eyebrow>
            <Display size="lg" lines={["Five jobs,", "one window."]} accent={[1]} />
            <Lead>
              The launcher is the whole player side of OPEN//77. You do not install anything into your game folder by hand,
              and you do not edit a config to join a server.
            </Lead>
            <div className={styles.jobsFigure} aria-hidden="true">
              <GlitchFrame>
                <Image
                  src="/home/img/players-character.webp"
                  alt=""
                  width={1202}
                  height={1818}
                  sizes="(max-width: 1084px) 70vw, 34vw"
                  quality={100}
                  draggable={false}
                />
              </GlitchFrame>
            </div>
          </div>
          <ol className={styles.jobList}>
            {LAUNCHER_DOES.map((job, index) => (
              <li key={job.title} className={styles.job}>
                <span className={styles.jobIndex} aria-hidden="true">
                  {String(index + 1).padStart(2, "0")}
                </span>
                <Icon glyph={job.icon} className={styles.jobIcon} />
                <div>
                  <Display as="h3" size="sm" className={styles.jobTitle}>
                    {job.title}
                  </Display>
                  <p className={styles.jobBody}>{job.body}</p>
                </div>
              </li>
            ))}
          </ol>
        </div>
      </Section>

      <Section
        id="first-run"
        eyebrow="First run"
        title="What actually happens."
        lead="Already installed? Open the launcher, pick a server and press connect. It takes care of the rest."
      >
        <Steps steps={FIRST_RUN} />
      </Section>

      <Section id="requirements" eyebrow="Before you install" title="What you need." className={styles.requirements}>
        <div className={styles.requirementsGrid}>
          <Checklist items={REQUIREMENTS} />
          <div>
            <Eyebrow muted className={styles.faqLabel}>
              Questions
            </Eyebrow>
            <Faq items={QUESTIONS} />
          </div>
        </div>
        <Notice kind="warning" title="This is Alpha software, not a stable release." className={styles.alphaNotice}>
          Expect bugs, crashes, incomplete features and updates that change APIs. The{" "}
          <a href={DISCORD} target="_blank" rel="noreferrer noopener">
            Discord
          </a>{" "}
          is where you can request access with <code>/alpha apply</code>, report reproducible issues and follow the changelog
          once you have Alpha access.
        </Notice>
      </Section>

      <JsonLd
        data={jsonLdGraph(
          breadcrumbNode([
            { name: "Home", path: "/" },
            { name: "Download the Launcher", path: "/download" },
          ]),
          ...(release ? [launcherApplicationNode(release)] : []),
        )}
      />
    </Page>
  );
}

function LauncherDownload({ release }: { release: LauncherRelease }) {
  const size = release.sizeBytes !== null ? formatBytes(release.sizeBytes) : null;
  return (
    <div
      className={styles.release}
      data-release-channel="launcher"
      data-release-version={release.version}
      data-channel-summary="launcher"
    >
      {/* One line: what it is, which version, when. The button is the card. */}
      <div className={styles.releaseHead}>
        <Tag tone="yellow" variant="solid">
          Latest launcher
        </Tag>
        <h2 className={styles.releaseVersion} aria-label={`Version ${release.version}`}>
          {release.version}
        </h2>
        {release.publishedAtUtc ? (
          <span className={styles.releaseDate}>Published {formatReleaseDate(release.publishedAtUtc)}</span>
        ) : null}
      </div>
      <DownloadAction
        href={release.url}
        label="Download for Windows"
        meta={["Windows 10 / 11 · 64-bit", size].filter(Boolean).join(" · ")}
      />
      <FileDetails summary="File details & verification" className={styles.releaseDetails}>
        <p>
          File: <code>{release.fileName}</code>
        </p>
        {release.sha256 ? (
          <>
            <p>
              SHA-256, published because it costs nothing to publish. If you verify your downloads, this PowerShell line
              prints the same string. Nothing you have to do.
            </p>
            <CopyLine value={release.sha256} label="Copy launcher SHA-256" />
            <CopyLine value={verifyCommand(release.fileName)} label="Copy verification command" />
          </>
        ) : (
          <p>A checksum is not published for this build.</p>
        )}
        <p>
          No account is required for this download. This page is the official source: the build comes straight from the
          OPEN//77 CDN, and it is the only place we publish it.
        </p>
      </FileDetails>
    </div>
  );
}
