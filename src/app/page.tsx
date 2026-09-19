import Image from "next/image";
import Link from "next/link";

import { JsonLd } from "@/components/json-ld";
import { ArrowDownIcon, ArrowRightIcon, CodeIcon, DiscordIcon, GlobeIcon, PeopleIcon, PlugIcon, ServerRackIcon, ShieldIcon } from "@/components/icons";
import { SiteFooter } from "@/components/site-footer";
import { highlightCode } from "@/lib/docs";
import { PLAYER_REQUIREMENT_SHORT } from "@/lib/requirements";
import { HOME_CLIENT_LUA, HOME_SERVER_LUA, SCRIPT_DOC_LINKS, SCRIPT_PILLARS, SCRIPT_SAMPLE_NOTE } from "@/lib/scripting";
import { breadcrumbNode, jsonLdGraph, pageMetadata, softwareApplicationNode } from "@/lib/seo";
import { site } from "@/lib/site";
import styles from "./home.module.css";

export const metadata = pageMetadata({ description: site.description, path: "/" });

/** The four load-bearing facts about the platform, stated without adjectives. */
const HERO_FACTS = [
  { key: "Model", value: "Community-run dedicated servers", icon: ServerRackIcon },
  { key: "Requires", value: PLAYER_REQUIREMENT_SHORT, icon: ShieldIcon },
  { key: "Game modes", value: "Whatever creators build", icon: PeopleIcon },
  { key: "Stage", value: "Alpha · Build your server", icon: CodeIcon },
];

const DESTINATIONS = [
  { href: "/servers", title: "Play Cyberpunk together.", label: "FOR PLAYERS", body: "Community servers turn Night City into multiplayer worlds, each with its own rules and its own experience.", image: "/assets/home/play-v2.webp", icon: PeopleIcon, number: "01" },
  { href: "/create", title: "Create your own server.", label: "FOR SERVER CREATORS", body: "A dedicated server you operate — your rules, your mods, and gameplay you design.", image: "/assets/home/servers-v2.webp", icon: ServerRackIcon, number: "02" },
  { href: "/workshop", title: "Share what you build.", label: "WORKSHOP", body: "Scripts, gamemodes, maps and interfaces made by the community, free to download and ready for your world.", image: "/assets/home/worlds-v2.webp", icon: GlobeIcon, number: "03" },
  { href: "/docs", title: "Script your own Night City.", label: "FOR DEVELOPERS", body: "Lua 5.4, real game APIs and web interfaces — the complete documentation and the Lua API reference.", image: "/assets/home/build-v2.webp", icon: CodeIcon, number: "04" },
];

const WORLDS = [
  { title: "Live another life.", tag: "ROLEPLAY", href: "/servers?mode=Roleplay", image: "/assets/exp-roleplay.jpg", body: "Strict roleplay cities with their own economies, factions, jobs and staff." },
  { title: "Own the streets.", tag: "RACING", href: "/servers?mode=Racing", image: "/assets/exp-racing.jpg", body: "Racing leagues, late-night meets and a city full of open roads." },
  { title: "Rewrite the rules.", tag: "CUSTOM WORLDS", href: "/servers", image: "/assets/exp-combat.jpg", body: "PvP, survival, freeroam — or a game mode nobody has seen yet." },
];

const CREATE_POINTS = [
  { title: "Your own dedicated server", body: "A persistent world you operate — on your hardware or a rented machine." },
  { title: "Custom gameplay", body: "Build anything from a strict roleplay city to a racing league to a game mode nobody has seen yet." },
  { title: "Your rules, your community", body: "Whitelists, moderation, staff, identity — your server page is your front door." },
];

const PILLAR_ICONS = { "LUA 5.4": CodeIcon, "REAL GAME APIS": PlugIcon, "WEB INTERFACES": GlobeIcon } as const;

function Snippet({ filename, badge, html }: { filename: string; badge: string; html: string }) {
  return (
    <div className={styles.codePanel}>
      <div className={styles.codeHead}><span><i /><i /><i /></span><span>{filename}</span><b>{badge}</b></div>
      <div className={styles.code} dangerouslySetInnerHTML={{ __html: html }} />
    </div>
  );
}

export default async function HomePage() {
  const [clientHtml, serverHtml] = await Promise.all([
    highlightCode(HOME_CLIENT_LUA, "lua"),
    highlightCode(HOME_SERVER_LUA, "lua"),
  ]);

  return (
    <>
      <main id="main" className={styles.home}>
        <div className={styles.opening}>
          <div className={styles.backdrop} aria-hidden="true">
            <Image src="/assets/home/night-city-wallpaper-v3.webp" alt="" fill preload sizes="100vw" className={styles.heroArt} />
          </div>
          <section className={styles.hero} aria-labelledby="home-title">
            <div className={styles.heroCopy}>
              <p className={styles.eyebrow}><span aria-hidden="true">{"//"}</span> {site.stage} · ACTIVE</p>
              <h1 id="home-title">Multiplayer for<br />Cyberpunk <em>2077</em><span className={styles.titleDot}>.</span></h1>
              <p className={styles.intro}>Play Cyberpunk&nbsp;2077 online on community servers — or create your own server and your own multiplayer experience. Everyone with Alpha access can download the server and start building now.</p>
              <div className={styles.actions}>
                <Link className={styles.primary} href="/download">Download launcher<ArrowRightIcon size={20} /></Link>
                <Link className={styles.secondary} href="/create">Build your server<ArrowRightIcon size={18} /></Link>
              </div>
              <Link className={styles.alphaLink} href="/docs/alpha-access"><span aria-hidden="true" />ALPHA ACCESS<span className={styles.alphaText}>Play, host and build — how to get in.</span><ArrowRightIcon size={13} /></Link>
            </div>
            <span className={styles.sceneNote} aria-hidden="true">ONE CITY,<br />MANY WORLDS.<i /></span>
            <a className={styles.scrollHint} href="#discover"><ArrowDownIcon size={30} /><span>SCROLL<br />TO EXPLORE</span></a>
          </section>

          <div className={styles.gateway}>
            <ul className={styles.facts} aria-label="Platform facts">
              {HERO_FACTS.map(({ key, value, icon: Icon }) => (
                <li key={key}><Icon size={28} /><div><span>{key.toUpperCase()}</span><strong>{value}</strong></div></li>
              ))}
            </ul>
            <div className={styles.destinations} id="discover">
              {DESTINATIONS.map(({ icon: Icon, ...card }) => (
                <Link className={styles.destination} key={card.href} href={card.href}>
                  <Image src={card.image} alt="" fill sizes="(max-width: 600px) 100vw, (max-width: 1100px) 50vw, 25vw" />
                  <div className={styles.cardTop}><Icon size={28} /><span>{card.number} /</span></div>
                  <div className={styles.cardCopy}><span className={styles.cardLabel}>{card.label}</span><h2>{card.title}</h2><p>{card.body}</p></div>
                  <span className={styles.cardArrow}><ArrowRightIcon size={17} /></span>
                </Link>
              ))}
            </div>
            <div className={styles.signature}><span /><p>THE CITY WAS BUILT FOR ONE. OPEN IT TO EVERYONE.</p><span /></div>
          </div>
        </div>

        <section className={styles.worlds} id="play" aria-labelledby="worlds-title">
          <div className={styles.sectionHeading}>
            <div><p className={styles.eyebrow}><span aria-hidden="true">{"//"}</span> FOR PLAYERS</p><h2 id="worlds-title">Play Cyberpunk<br /><em>together.</em></h2></div>
            <div><p>Community servers turn Night City into multiplayer worlds, each with its own rules and its own experience. OPEN//77 is the layer that makes them possible.</p><Link href="/servers" className={styles.textLink}>Preview the server browser<ArrowRightIcon size={18} /></Link></div>
          </div>
          <div className={styles.worldGrid}>
            {WORLDS.map((world) => <Link className={styles.worldCard} key={world.tag} href={world.href}>
              <Image src={world.image} alt="" fill sizes="(max-width: 760px) 100vw, 33vw" />
              <span className={styles.worldTag}>{world.tag}</span>
              <div><h3>{world.title}</h3><p>{world.body}</p><span className={styles.worldArrow}><ArrowRightIcon size={21} /></span></div>
            </Link>)}
          </div>
          <p className={styles.worldNote}>One client takes you to every community server — resources download automatically when you join a world.</p>
        </section>

        <section className={styles.creator} id="lua" aria-labelledby="creator-title">
          <div className={styles.creatorCopy}>
            <p className={styles.eyebrow}><span aria-hidden="true">{"//"}</span> FOR DEVELOPERS</p>
            <h2 id="creator-title">Script your own<br /><em>Night City.</em></h2>
            <p>Gameplay on an OPEN//77 server is not configured — it is scripted. A resource is a small Lua&nbsp;5.4 package your server loads, hot-reloads and streams to every player who joins. This is the entire <code>/ride</code> command, for real.</p>
            <ul className={styles.pillars}>
              {SCRIPT_PILLARS.map((pillar) => {
                const Icon = PILLAR_ICONS[pillar.tag];
                return (
                  <li key={pillar.tag}>
                    <Icon size={20} />
                    <div>
                      <span className={styles.cardLabel}>{pillar.tag}</span>
                      <strong>{pillar.title}</strong>
                      <p>{pillar.body} <Link href={pillar.href}>{pillar.link}</Link></p>
                    </div>
                  </li>
                );
              })}
            </ul>
            <div className={styles.actions}>
              <Link className={styles.primary} href="/docs">Read the docs<ArrowRightIcon size={18} /></Link>
              {SCRIPT_DOC_LINKS.filter((link) => link.href !== "/docs").map((link) => (
                <Link key={link.href} className={styles.textLink} href={link.href}>{link.label}<ArrowRightIcon size={16} /></Link>
              ))}
            </div>
          </div>
          <div className={styles.codeStack}>
            <Snippet filename="resources/ride/server/main.lua" badge="SERVER RUNTIME" html={serverHtml} />
            <Snippet filename="resources/ride/client/main.lua" badge="CLIENT RUNTIME" html={clientHtml} />
            <p className={styles.codeFoot}><span aria-hidden="true" />{SCRIPT_SAMPLE_NOTE}</p>
          </div>
        </section>

        <section className={styles.alpha} id="create" aria-labelledby="create-title">
          <div className={styles.alphaGlow} aria-hidden="true" />
          <div>
            <p className={styles.eyebrow}><span aria-hidden="true">{"//"}</span> FOR SERVER CREATORS</p>
            <h2 id="create-title">Create your<br /><em>own server.</em></h2>
            <p>Run a dedicated server that stays online for your community — with your rules, your mods, and gameplay you design. Everyone with Alpha access can download it and start building now. No separate developer application.</p>
            <ul className={styles.points}>
              {CREATE_POINTS.map((point) => (
                <li key={point.title}><strong>{point.title}</strong><p>{point.body}</p></li>
              ))}
            </ul>
            <div className={styles.actions}><Link className={styles.primary} href="/host">Download server<ArrowRightIcon size={18} /></Link><Link className={styles.secondary} href="/docs/host-a-server">Hosting guide<ArrowRightIcon size={18} /></Link></div>
          </div>
          <aside className={styles.join}>
            <DiscordIcon size={36} />
            <h3>Need Alpha access?</h3>
            <p>Use <code>/alpha apply</code> with the bot in any channel on our official Discord. It is also where Alpha members follow the changelog and report reproducible issues to the team.</p>
            {site.links.discord && <a href={site.links.discord} target="_blank" rel="noreferrer noopener" className={styles.textLink}>Join our Discord<ArrowRightIcon size={18} /></a>}
            <small>Alpha software: expect bugs, crashes and API changes while the platform grows.</small>
          </aside>
        </section>
      </main>
      <div className={styles.footer}><SiteFooter tone="dark" /></div>
      <JsonLd data={jsonLdGraph(softwareApplicationNode(), breadcrumbNode([{ name: "Home", path: "/" }]))} />
    </>
  );
}
