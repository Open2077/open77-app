import type { Metadata } from "next";
import Link from "next/link";
import { connection } from "next/server";

import { CtaLink } from "@/components/downloads/cta-link";
import { linuxGlyph, windowsGlyph } from "@/components/downloads/glyphs";
import {
  ArrowLink,
  Checklist,
  Faq,
  FeatureGrid,
  ReleaseStatus,
  SpecStrip,
  Steps,
  UnavailableRelease,
} from "@/components/downloads/product-blocks";
import { ProductHero } from "@/components/downloads/product-hero";
import { HostGate } from "@/components/host/host-gate";
import { ServerBuilds, ServerBuildsPreview } from "@/components/host/server-builds";
import { UnstableDownloads } from "@/components/host/unstable-downloads";
import { JsonLd } from "@/components/json-ld";
import { ReleaseRefresh } from "@/components/release-refresh";
import { Button } from "@/components/ui/button";
import { Notice } from "@/components/ui/feedback";
import { Icon } from "@/components/ui/icon";
import { arrowDown01, code, key01, serverStack01, shield01, tick02, userGroup } from "@/components/ui/icons";
import { Page, Section } from "@/components/ui/page";
import { Display, Eyebrow } from "@/components/ui/typography";
import { PLAYER_REQUIREMENT_SHORT } from "@/lib/requirements";
import { breadcrumbNode, jsonLdGraph, pageMetadata } from "@/lib/seo";
import { fetchLatestServerRelease } from "@/lib/server-release";

import styles from "./host.module.css";

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

const IN_THE_ARCHIVE = [
  "The dedicated server, with the .NET runtime included",
  "Freeroam, ready to play, and its system resources",
  "Warden, the first-run wizard and the web admin panel",
  "The Lua 5.4 runtime for your own resources",
];

const SETUP_STEPS = [
  {
    title: "Mint a license key",
    body: (
      <p>
        Create one in the <Link href="/account/keys">keymaster</Link>. It ties the server to your account and is shown once,
        so keep it somewhere safe.
      </p>
    ),
  },
  {
    title: "Unpack and configure",
    body: (
      <p>
        Extract into a new folder and run <code>Start.cmd</code> on Windows or <code>./start.sh</code> on Linux. Warden&apos;s
        first-run wizard creates <code>server.jsonc</code> with your server name, visibility and public endpoints.
      </p>
    ),
  },
  {
    title: "Configure your license",
    body: (
      <p>
        Supply your license in setup, or keep it in <code>OP77_LICENSE_KEY</code> when configuring the server manually. The
        master URL defaults to <code>https://master.open2077.net/</code>.
      </p>
    ),
  },
  {
    title: "Run it",
    body: (
      <p>
        Open the game and resource-download ports, then start the configured server. Public servers register with the master
        so Alpha players can discover and join them.
      </p>
    ),
  },
];

const REQUIREMENTS = [
  {
    title: "The game is not needed",
    body: "A dedicated server runs independently of Cyberpunk 2077, REDengine and the client plugin. It never loads game content and never needs a copy installed.",
  },
  {
    title: "Windows x64 or Linux x64",
    body: (
      <>
        Both official packages include the .NET runtime and native networking dependencies. No separate .NET installation on
        the host; the <Link href="/docs/host-a-server">setup guide</Link> lists the OS-level prerequisites.
      </>
    ),
  },
  {
    title: "Your players still need the game",
    body: `Everyone who connects needs ${PLAYER_REQUIREMENT_SHORT} on their own machine, plus Alpha access. Hosting changes nothing about that.`,
  },
];

const QUESTIONS = [
  {
    q: "Do I need special developer access?",
    a: "No. Everyone with Alpha access can download and run the server. Sign in with your Alpha-enabled OPEN//77 account to see the archives. No separate developer application, project review or staff role.",
  },
  {
    q: "I am signed in but see no downloads.",
    a: (
      <>
        Check that the account you are signed in with is the one with Alpha access, then use “Check access again”. To
        request access, use <code>/alpha apply</code> in any channel on our Discord.
      </>
    ),
  },
  {
    q: "Where does the license key go?",
    a: (
      <>
        Supply it in Warden&apos;s first-run setup, or keep it in <code>OP77_LICENSE_KEY</code> when configuring the server by
        hand. The <Link href="/docs/server-licensing">licensing guide</Link> covers activation. Never paste keys into public
        scripts or screenshots.
      </>
    ),
  },
  {
    q: "How do I update an existing server?",
    a: "Read the release notes, back up your configuration, resources and data, then stop the server before unpacking the new archive over it. Check client/server compatibility and test your own resources before reopening.",
  },
];

const TOOLS = [
  {
    icon: shield01,
    title: "Warden, the admin panel",
    body: "Set up, monitor and administer your server from its web panel: players, resources, Workshop installs.",
    href: "/docs/warden",
    action: "Meet Warden",
  },
  {
    icon: code,
    title: "The Lua API",
    body: "Vehicles, blips, NPCs, weather, interactions: the same permission-gated natives OPEN//77's own resources are built on.",
    href: "/docs/api",
    action: "Lua API reference",
  },
  {
    icon: serverStack01,
    title: "Resources",
    body: "The resource format, the manifest, and the lifecycle of a package your server loads and streams to players.",
    href: "/docs/server-resources",
    action: "Resources & scripting",
  },
  {
    icon: windowsGlyph,
    title: "Here to play?",
    body: "Players need the launcher, not this archive. It signs you in, checks your game and takes you to the server browser.",
    href: "/download",
    action: "Get the launcher",
  },
];

export default async function HostPage() {
  // Never bake a mutable release pointer into an ISR/build-time snapshot.
  await connection();
  const [release, unstable] = await Promise.all([fetchLatestServerRelease(), fetchLatestServerRelease("unstable")]);

  return (
    <Page tone="blue">
      <ProductHero
        titleId="host-title"
        eyebrow="Host a server · OPEN//77 dedicated server"
        title={["Host your", "own server"]}
        accent={[1]}
        lead={
          <>
            Everyone with Alpha access can download the dedicated server and start building. No separate developer
            application. License it to your account and create your own gamemode. The host machine never needs{" "}
            <strong>Cyberpunk&nbsp;2077</strong> installed.
          </>
        }
        className={styles.hero}
        art={{ src: "/home/img/creators-bg.webp", position: "30% 50%" }}
        figure={{ src: "/home/img/server-creators.webp", width: 1827, height: 1423, kind: "object" }}
        strip={
          <SpecStrip
            facts={[
              { icon: windowsGlyph, label: "Windows server", value: "64-bit · .zip archive" },
              { icon: linuxGlyph, label: "Linux server", value: "64-bit · .tar.gz archive" },
              { icon: userGroup, label: "Who can download", value: "Every Alpha account, and staff" },
              { icon: serverStack01, label: "Runs on", value: "Your hardware or a rented machine" },
            ]}
          />
        }
      >
        <div className={styles.actions}>
          <CtaLink href="#download" icon={arrowDown01} lines size="lg">
            Get the server
          </CtaLink>
          <Button color="blue" border lines="none" icon={key01} iconPosition="left" href="/account/keys">
            License keys
          </Button>
        </div>
        <div className={styles.heroFoot}>
          <ArrowLink href="/docs/host-a-server">Full hosting guide</ArrowLink>
          <p className={styles.heroNote}>
            <Icon glyph={shield01} />
            Official builds only: download the server from this page or the official CDN, nowhere else. Each archive lists
            its SHA-256 so you can verify what you run.
          </p>
        </div>
      </ProductHero>

      <Section id="download" className={styles.download}>
        <div className={styles.downloadHead}>
          <div className={styles.downloadIntro}>
            <Eyebrow>Self-contained downloads</Eyebrow>
            <Display size="md" lines={["Everything in", "the archive."]} accent={[1]} />
            <p className={styles.downloadLead}>
              Configure your license and reachable endpoints; no Cyberpunk 2077 installation is needed on the server machine.
            </p>
            <ArrowLink href="/create">What a server gives you</ArrowLink>
          </div>
          <ul className={styles.archive}>
            {IN_THE_ARCHIVE.map((item) => (
              <li key={item}>
                <span className={styles.archiveTick} aria-hidden="true">
                  <Icon glyph={tick02} />
                </span>
                {item}
              </li>
            ))}
          </ul>
        </div>
        <HostGate preview={release ? <ServerBuildsPreview release={release} /> : null}>
          {release ? <ServerBuilds release={release} /> : <UnavailableRelease kind="server" />}
          <UnstableDownloads key={unstable?.version ?? "unavailable"} available={Boolean(unstable)}>
            {unstable ? <ServerBuilds release={unstable} /> : null}
          </UnstableDownloads>
        </HostGate>
        <ReleaseStatus
          className={styles.status}
          note="Stable is recommended. Unstable is a separate, opt-in server channel for testing; the launcher has its own version."
        >
          <ReleaseRefresh />
        </ReleaseStatus>
      </Section>

      <Section
        id="start"
        eyebrow="Getting started"
        title="From download to open doors."
        lead="The same four steps for a local test server and a public one. Start with the included Freeroam, then make it yours."
      >
        <Steps steps={SETUP_STEPS} />
        <Notice kind="info" title="Running a public server?" className={styles.notice}>
          Open the game and resource-download ports in your firewall, keep your license key out of scripts and screenshots,
          and protect your Warden access. The <Link href="/docs/host-a-server">hosting guide</Link> covers all of it before
          you invite players.
        </Notice>
      </Section>

      <Section id="requirements" eyebrow="Before you host" title="What you need.">
        <div className={styles.requirementsGrid}>
          <Checklist items={REQUIREMENTS} />
          <div>
            <Eyebrow muted className={styles.faqLabel}>
              Questions
            </Eyebrow>
            <Faq items={QUESTIONS} />
          </div>
        </div>
      </Section>

      <Section id="tools" eyebrow="Next steps" title="Hosting tools.">
        <FeatureGrid items={TOOLS} columns={4} />
      </Section>

      <JsonLd
        data={jsonLdGraph(
          breadcrumbNode([
            { name: "Home", path: "/" },
            { name: "Host a Server", path: "/host" },
          ]),
        )}
      />
    </Page>
  );
}
