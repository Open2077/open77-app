import Image from "next/image";
import Link from "next/link";

import { DownloadSurface, QuickFacts, SurfaceEyebrow, SurfaceHeading } from "@/components/downloads/download-surface";
import styles from "@/components/downloads/download-surface.module.css";
import { ArrowRightIcon, CheckIcon, CodeIcon, InfoIcon, LinuxIcon, PeopleIcon, ServerRackIcon, ShieldIcon, WindowsIcon } from "@/components/icons";
import { JsonLd } from "@/components/json-ld";
import { CREATE_REQUIREMENTS_NOTE, PLAYER_REQUIREMENT_SHORT } from "@/lib/requirements";
import { breadcrumbNode, jsonLdGraph, pageMetadata } from "@/lib/seo";
import { site } from "@/lib/site";

export const metadata = pageMetadata({
  title: "Create a Server",
  description: `Everyone with Alpha access can download the OPEN//77 server and build a custom Cyberpunk 2077 gamemode. No separate developer application. Players need ${PLAYER_REQUIREMENT_SHORT}.`,
  path: "/create",
});

const BENEFITS = [
  { icon: ServerRackIcon, title: "A dedicated, persistent world", body: "Your server keeps running when players log off. Economies, factions and stories continue — the world remembers, because you host it.", href: "/docs/host-a-server", action: "Hosting guide" },
  { icon: ShieldIcon, title: "Your rules & moderation", body: "Whitelist or open door, hardcore or casual — you set the rules, pick the staff, and shape the culture of your community.", href: "/docs/warden", action: "Meet Warden, the admin panel" },
  { icon: CodeIcon, title: "Custom gameplay & resources", body: "Add jobs, economies, missions, vehicles and UI through resources — drop-in packages of gameplay. Use what the community shares, or script your own.", href: "/docs/server-resources", action: "How resources work" },
  { icon: PeopleIcon, title: "A front door for your community", body: "Your server page in the public browser shows your world, mode, language and player count — discovery is built into the platform.", href: "/servers", action: "Preview the server browser" },
];

const STEPS = [
  { title: "Get the server", body: <>Download the <Link href="/host">dedicated server software</Link> and run it on your own hardware or a rented machine. It is a normal server process — it does not need Cyberpunk 2077 installed, and you own it entirely.</> },
  { title: "License it to your account", body: <>Create a free account, mint a license key in the <Link href="/account/keys">keymaster</Link>, and put it in your server config. The key ties the server to you and is what the master checks before it lets the server onto the platform.</> },
  { title: "Open the doors", body: <>Shape your slots, rules, language and mode, add the resources you want, and your licensed server appears in the public browser — players&apos; clients auto-download everything your world needs.</> },
];

export default function CreatePage() {
  return (
    <>
      <DownloadSurface active="server" artwork="/assets/home/night-city-v2.webp">
        <section className={styles.hero} aria-labelledby="create-title">
          <div className={styles.heroCopy}>
            <SurfaceEyebrow>CREATE A SERVER</SurfaceEyebrow>
            <h1 id="create-title">Run your own<em>Night City.</em></h1>
            <p className={styles.intro}>A dedicated Cyberpunk&nbsp;2077 server that stays online for your community — with your rules, your identity, and gameplay you design. Everyone with Alpha access can download it and start building now.</p>
            <div className={styles.actions}>
              <Link className={styles.primary} href="/host">Download server <ArrowRightIcon size={17} /></Link>
              <Link className={styles.secondary} href="/docs/host-a-server">Hosting guide</Link>
              <Link className={styles.textLink} href="/docs/platform#dedicated-servers">Technical docs <ArrowRightIcon size={16} /></Link>
            </div>
            <p className={styles.heroNote}><CheckIcon size={15} />{CREATE_REQUIREMENTS_NOTE}</p>
          </div>
          <aside className={styles.serverIntro}>
            <SurfaceEyebrow>FROM RP TO RACING TO UNKNOWN</SurfaceEyebrow>
            <h2>Any experience<br />you can script.</h2>
            <p>OPEN//77 doesn&apos;t ship a game mode — it ships the platform. A hardcore roleplay city, a ranked racing league, a survival district, a social hub with zero combat, or something nobody has built yet: they&apos;re all just servers.</p>
            <div className={styles.modes}><span>Roleplay</span><span>Racing</span><span>PvP</span><span>Battle Royale</span><span>Survival</span><span>Social hub</span></div>
          </aside>
        </section>
        <QuickFacts facts={[
          { icon: WindowsIcon, label: "Windows host", value: ".NET runtime included · 64-bit" },
          { icon: LinuxIcon, label: "Linux host", value: ".NET runtime included · 64-bit" },
          { icon: CodeIcon, label: "Scripting", value: "Lua 5.4 resources · Chromium WebUI" },
          { icon: ServerRackIcon, label: "Hosting", value: "Your hardware or a rented machine" },
        ]} />

        <section className={styles.section} id="benefits">
          <SurfaceHeading label="WHAT A SERVER GIVES YOU" title="Your world, your call." />
          <div className={styles.features}>{BENEFITS.map(({ icon: Icon, title, body, href, action }) => <article className={styles.feature} key={title}><Icon size={29} /><h3>{title}</h3><p>{body}</p><Link className={styles.textLink} href={href}>{action}<ArrowRightIcon size={15} /></Link></article>)}</div>
        </section>

        <section className={styles.section} id="how">
          <SurfaceHeading label="HOW IT WORKS" title="Three steps to open the doors." />
          <ol className={styles.steps}>
            {STEPS.map((step) => <li key={step.title}><h3>{step.title}</h3><p>{step.body}</p></li>)}
          </ol>
          <div className={styles.notice}><InfoIcon size={18} /><p><strong>Licensing.</strong> Every server on the platform belongs to an account. The <Link href="/docs/server-licensing">server licensing guide</Link> walks through creating an account, getting a license key, and linking it to your server so the master authorises it. See also the <Link href="/docs/platform#requirements">platform requirements</Link>.</p></div>
        </section>

        <section className={styles.section} id="alpha-access">
          <div className={styles.resourceBanner}>
            <Image src="/assets/home/build-v2.webp" alt="" fill sizes="100vw" />
            <div><SurfaceEyebrow>ALPHA ACCESS · BUILD NOW</SurfaceEyebrow><h2>It&apos;s time to build.</h2><p>Everyone with Alpha access can now download the server and start building. Roleplay, PvP, Battle Royale, Racing, Survival — create your own gamemode and your own experience in Night City. No separate developer application, project review or staff role. Need Alpha access? Use <code>/alpha apply</code> with the bot in any channel on our official Discord.</p></div>
            <div className={styles.actions}><a className={styles.primary} href={site.links.discord ?? "https://discord.open2077.net"} target="_blank" rel="noreferrer noopener">Join our Discord <ArrowRightIcon size={16} /></a><Link className={styles.secondary} href="/docs/alpha-access">Read the Alpha guide</Link></div>
          </div>
        </section>

        <section className={styles.section}>
          <SurfaceHeading label="FOR BUILDERS" title="Want the technical details?"><p>Architecture, dedicated servers, the resource format and the complete Lua API live in the documentation — written for people who build.</p></SurfaceHeading>
          <div className={styles.actions}><Link className={styles.primary} href="/docs/server-resources">Server docs <ArrowRightIcon size={16} /></Link><Link className={styles.secondary} href="/docs/server-licensing">Server licensing</Link><Link className={styles.textLink} href="/docs/api">Lua API reference <ArrowRightIcon size={16} /></Link></div>
        </section>
      </DownloadSurface>
      <JsonLd data={jsonLdGraph(breadcrumbNode([{ name: "Home", path: "/" }, { name: "Create a Server", path: "/create" }]))} />
    </>
  );
}
