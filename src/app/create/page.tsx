import Image from "next/image";
import Link from "next/link";

import { DownloadSurface, QuickFacts, SurfaceEyebrow, SurfaceHeading } from "@/components/downloads/download-surface";
import styles from "@/components/downloads/download-surface.module.css";
import { ArrowRightIcon, CheckIcon, CodeIcon, GlobeIcon, LinuxIcon, PeopleIcon, ServerRackIcon, ShieldIcon, WindowsIcon } from "@/components/icons";
import { JsonLd } from "@/components/json-ld";
import { PLAYER_REQUIREMENT_SHORT } from "@/lib/requirements";
import { breadcrumbNode, jsonLdGraph, pageMetadata } from "@/lib/seo";
import { site } from "@/lib/site";

export const metadata = pageMetadata({
  title: "Create a Server",
  description: `Everyone with Alpha access can host an OPEN//77 server and build a custom Cyberpunk 2077 gamemode. Windows and Linux server downloads, Lua APIs and Warden. Players need ${PLAYER_REQUIREMENT_SHORT}.`,
  path: "/create",
});

const FEATURES = [
  { icon: CodeIcon, title: "Make the gameplay.", body: "Build with Lua APIs for players, vehicles, NPCs, interfaces and world interactions.", href: "/docs/api", action: "Explore the APIs" },
  { icon: ShieldIcon, title: "Set your rules.", body: "Manage players, access and moderation through Warden and your own resources.", href: "/docs/warden", action: "Meet Warden" },
  { icon: ServerRackIcon, title: "Shape your world.", body: "Start with Freeroam, add packages or create a gamemode from the ground up.", href: "/docs/server-resources", action: "Build a resource" },
  { icon: PeopleIcon, title: "Find your community.", body: "List your public server in the launcher, or keep access limited to your players.", href: "/docs/host-a-server", action: "Plan your server" },
];

export default function CreatePage() {
  return (
    <>
      <DownloadSurface active="server" artwork="/assets/home/night-city-v2.webp">
        <section className={styles.hero} aria-labelledby="create-title">
          <div className={styles.heroCopy}>
            <SurfaceEyebrow>Built for the worlds you imagine</SurfaceEyebrow>
            <h1 id="create-title">Same city.<em>Your own rules.</em></h1>
            <p className={styles.intro}>A roleplay community. A racing league. A world nobody has made yet. Host your own Cyberpunk 2077 server and build the experience you want to play.</p>
            <div className={styles.actions}>
              <Link className={styles.primary} href="/host">Download server <ArrowRightIcon size={17} /></Link>
              <Link className={styles.secondary} href="/docs/host-a-server">Read the setup guide</Link>
            </div>
            <p className={styles.heroNote}><CheckIcon size={15} />Everyone with Alpha access can start building. No extra application.</p>
          </div>
          <aside className={styles.serverIntro}>
            <SurfaceEyebrow>Your starting point</SurfaceEyebrow>
            <h2>The platform is here.<br />The next idea is yours.</h2>
            <p>A dedicated server, a ready-to-play Freeroam and the tools to go beyond it. Run locally while you build, then bring your community online.</p>
            <div className={styles.modes}><span>Roleplay</span><span>Racing</span><span>PvP</span><span>Survival</span><span>Your next idea</span></div>
          </aside>
        </section>
        <QuickFacts facts={[
          { icon: WindowsIcon, label: "Windows host", value: "Self-contained · 64-bit" },
          { icon: LinuxIcon, label: "Linux host", value: "Self-contained · 64-bit" },
          { icon: CodeIcon, label: "Scripting", value: "Lua resources & custom WebUI" },
          { icon: GlobeIcon, label: "Ownership", value: "Your infrastructure. Your rules." },
        ]} />

        <section className={styles.section} id="benefits">
          <SurfaceHeading label="Tools, not a template" title="Start with a server. Make it a world." />
          <div className={styles.features}>{FEATURES.map(({ icon: Icon, title, body, href, action }) => <article className={styles.feature} key={title}><Icon size={29} /><h3>{title}</h3><p>{body}</p><Link className={styles.textLink} href={href}>{action}<ArrowRightIcon size={15} /></Link></article>)}</div>
        </section>

        <section className={styles.section} id="how">
          <SurfaceHeading label="From idea to first connection" title="Your first server, step by step." />
          <ol className={styles.steps}>
            <li><h3>Get your build.</h3><p>Sign in with your Alpha account and <Link href="/host">download the Windows or Linux server</Link>. Use your own computer for development or a rented machine for hosting.</p></li>
            <li><h3>Make it yours.</h3><p>Create a <Link href="/account/keys">server license</Link>, complete Warden setup and choose your name, visibility and resources. Freeroam gives you a starting point.</p></li>
            <li><h3>Bring your players.</h3><p>Configure reachable endpoints and test your resources. When you are ready, open your public listing so players can find you in the launcher.</p></li>
          </ol>
          <div className={styles.notice}><ShieldIcon size={18} /><p><strong>Hosting and playing have different requirements.</strong> Your server does not need the game installed. Players need {PLAYER_REQUIREMENT_SHORT} and Alpha access. Software is in Alpha; test updates and back up your work.</p></div>
        </section>

        <section className={styles.section} id="alpha-access">
          <div className={styles.resourceBanner}>
            <Image src="/assets/home/build-v2.webp" alt="" fill sizes="100vw" />
            <div><SurfaceEyebrow>Alpha is open to builders</SurfaceEyebrow><h2>You have access. You can build.</h2><p>Everyone with Alpha access can download the server. No separate developer application or project review. Need access? Use <code>/alpha apply</code> in any channel on our Discord.</p></div>
            <div className={styles.actions}><a className={styles.primary} href={site.links.discord ?? "https://discord.open2077.net"} target="_blank" rel="noreferrer noopener">Join our Discord <ArrowRightIcon size={16} /></a><Link className={styles.secondary} href="/docs/alpha-access">Read the Alpha guide</Link></div>
          </div>
        </section>

        <section className={styles.section}>
          <SurfaceHeading label="Go a little deeper" title="Your next stop: the documentation."><p>Practical guides for hosting and scripting, plus the native APIs to build your own systems.</p></SurfaceHeading>
          <div className={styles.actions}><Link className={styles.primary} href="/docs/server-resources">Create your first resource <ArrowRightIcon size={16} /></Link><Link className={styles.secondary} href="/docs/api">Browse Lua APIs</Link><Link className={styles.textLink} href="/docs/server-licensing">License your server <ArrowRightIcon size={16} /></Link></div>
        </section>
      </DownloadSurface>
      <JsonLd data={jsonLdGraph(breadcrumbNode([{ name: "Home", path: "/" }, { name: "Create a Server", path: "/create" }]))} />
    </>
  );
}
