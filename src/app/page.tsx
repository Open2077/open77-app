import Image from "next/image";
import Link from "next/link";

import { JsonLd } from "@/components/json-ld";
import { ArrowDownIcon, ArrowRightIcon, CodeIcon, DiscordIcon, GlobeIcon, PeopleIcon, ServerRackIcon, ShieldIcon } from "@/components/icons";
import { SiteFooter } from "@/components/site-footer";
import { highlightCode } from "@/lib/docs";
import { PLAYER_REQUIREMENT_SHORT } from "@/lib/requirements";
import { HOME_SERVER_LUA } from "@/lib/scripting";
import { breadcrumbNode, jsonLdGraph, pageMetadata, softwareApplicationNode } from "@/lib/seo";
import { site } from "@/lib/site";
import styles from "./home.module.css";

export const metadata = pageMetadata({ description: site.description, path: "/" });

const DESTINATIONS = [
  { href: "/servers", title: "Find your people.", label: "PLAY TOGETHER", body: "A different Night City on every server. Find a community that feels like yours.", image: "/assets/home/play-v2.webp", icon: PeopleIcon, number: "01" },
  { href: "/create", title: "Build your server.", label: "MAKE IT YOURS", body: "Your rules. Your resources. Your own multiplayer experience.", image: "/assets/home/servers-v2.webp", icon: ServerRackIcon, number: "02" },
  { href: "/workshop", title: "Create something new.", label: "COMMUNITY WORKSHOP", body: "Discover resources and ideas from the people building alongside you.", image: "/assets/home/worlds-v2.webp", icon: GlobeIcon, number: "03" },
  { href: "/docs", title: "Go beyond the game.", label: "DEVELOPER TOOLS", body: "Lua APIs, native systems and custom interfaces. The tools are yours.", image: "/assets/home/build-v2.webp", icon: CodeIcon, number: "04" },
];

const WORLDS = [
  { title: "Another life. Same city.", tag: "ROLEPLAY", href: "/servers?mode=Roleplay", image: "/assets/exp-roleplay.jpg", body: "Build a character. Find your crew. Write a story that is yours." },
  { title: "Take the long way home.", tag: "RACING", href: "/servers?mode=Racing", image: "/assets/exp-racing.jpg", body: "Late-night meets, custom races and a city full of open roads." },
  { title: "Your next idea belongs here.", tag: "CUSTOM GAMEMODES", href: "/create", image: "/assets/exp-combat.jpg", body: "PvP, survival, freeroam — build the experience you want to play." },
];

export default async function HomePage() {
  const code = await highlightCode(HOME_SERVER_LUA, "lua");
  return (
    <>
      <main id="main" className={styles.home}>
        <div className={styles.opening}>
          <div className={styles.backdrop} aria-hidden="true">
            <Image src="/assets/home/night-city-wallpaper-v3.webp" alt="" fill preload sizes="100vw" className={styles.heroArt} />
          </div>
          <section className={styles.hero} aria-labelledby="home-title">
            <div className={styles.heroCopy}>
              <p className={styles.eyebrow}><span aria-hidden="true">{"//"}</span> COMMUNITY RUN. A BIGGER NIGHT CITY.</p>
              <h1 id="home-title">Multiplayer for<br />Cyberpunk <em>2077</em><span className={styles.titleDot}>.</span></h1>
              <p className={styles.intro}>The city you know. The people you haven’t met yet.<br className={styles.desktopBreak} /> Play Cyberpunk 2077 on community servers — or build your own world, with your own rules.</p>
              <div className={styles.actions}>
                <Link className={styles.primary} href="/download">Download launcher<ArrowRightIcon size={20} /></Link>
                <Link className={styles.secondary} href="/create">Create your server<ArrowRightIcon size={18} /></Link>
              </div>
              <Link className={styles.alphaLink} href="/docs/alpha-access"><span aria-hidden="true" />ALPHA ACCESS<span className={styles.alphaText}>Play, host & build.</span><ArrowRightIcon size={13} /></Link>
            </div>
            <span className={styles.sceneNote} aria-hidden="true">SAME WORLD.<br />MORE PEOPLE.<i /></span>
            <a className={styles.scrollHint} href="#discover"><ArrowDownIcon size={30} /><span>SCROLL<br />TO EXPLORE</span></a>
          </section>

          <div className={styles.gateway}>
            <ul className={styles.facts} aria-label="Platform facts">
              <li><ServerRackIcon size={28} /><div><span>THE PLATFORM</span><strong>Community-run servers</strong></div></li>
              <li><ShieldIcon size={28} /><div><span>WHAT YOU NEED</span><strong>{PLAYER_REQUIREMENT_SHORT}</strong></div></li>
              <li><PeopleIcon size={28} /><div><span>YOUR EXPERIENCE</span><strong>Whatever creators build</strong></div></li>
              <li><CodeIcon size={28} /><div><span>ALPHA IS OPEN TO BUILDERS</span><strong>Your next project starts here</strong></div></li>
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
            <div className={styles.signature}><span /><p>NIGHT CITY IS BETTER TOGETHER</p><span /></div>
          </div>
        </div>

        <section className={styles.worlds} id="play" aria-labelledby="worlds-title">
          <div className={styles.sectionHeading}>
            <div><p className={styles.eyebrow}><span aria-hidden="true">{"//"}</span> ONE CITY. ENDLESS POSSIBILITIES.</p><h2 id="worlds-title">Not one server.<br /><em>A world of them.</em></h2></div>
            <div><p>Open//77 is the multiplayer platform. The community decides what happens next. Choose a world — or make something no one has played before.</p><Link href="/servers" className={styles.textLink}>Explore servers<ArrowRightIcon size={18} /></Link></div>
          </div>
          <div className={styles.worldGrid}>
            {WORLDS.map((world) => <Link className={styles.worldCard} key={world.tag} href={world.href}>
              <Image src={world.image} alt="" fill sizes="(max-width: 760px) 100vw, 33vw" />
              <span className={styles.worldTag}>{world.tag}</span>
              <div><h3>{world.title}</h3><p>{world.body}</p><span className={styles.worldArrow}><ArrowRightIcon size={21} /></span></div>
            </Link>)}
          </div>
          <p className={styles.worldNote}>Possibilities, not promises: each server’s features and gamemode are built by its own community.</p>
        </section>

        <section className={styles.creator} id="lua" aria-labelledby="creator-title">
          <div className={styles.creatorCopy}>
            <p className={styles.eyebrow}><span aria-hidden="true">{"//"}</span> BUILT FOR THE BUILDERS</p>
            <h2 id="creator-title">Less “what if”.<br /><em>More “I made this”.</em></h2>
            <p>Real game systems, exposed to Lua. Control vehicles, players, NPCs and the world. Build your own interfaces. Ship resources your whole server can use.</p>
            <ul><li><CodeIcon size={20} /><span>Lua 5.4 · Client & server scripting</span></li><li><GlobeIcon size={20} /><span>HTML, CSS & JavaScript interfaces</span></li><li><ServerRackIcon size={20} /><span>Dedicated servers for Windows & Linux</span></li></ul>
            <div className={styles.actions}><Link className={styles.primary} href="/docs">Explore the docs<ArrowRightIcon size={18} /></Link><Link className={styles.textLink} href="/docs/api">Lua API reference<ArrowRightIcon size={16} /></Link></div>
          </div>
          <div className={styles.codePanel}>
            <div className={styles.codeHead}><span><i /><i /><i /></span><span>resources/ride/server/main.lua</span><b>LUA</b></div>
            <div className={styles.code} dangerouslySetInnerHTML={{ __html: code }} />
            <div className={styles.codeFoot}><span aria-hidden="true" /><p>A real <code>/ride</code> command. A server-owned vehicle.<br />Every call is in the documentation.</p></div>
          </div>
        </section>

        <section className={styles.alpha} id="alpha-access" aria-labelledby="alpha-title">
          <div className={styles.alphaGlow} aria-hidden="true" />
          <div><p className={styles.eyebrow}><span aria-hidden="true">{"//"}</span> IT’S TIME TO BUILD</p><h2 id="alpha-title">You have Alpha access?<br /><em>You have the tools.</em></h2><p>Everyone with Alpha access can download the server and start building now. No separate developer application is required.</p><div className={styles.actions}><Link className={styles.primary} href="/host">Download server<ArrowRightIcon size={18} /></Link><Link className={styles.secondary} href="/docs/host-a-server">Hosting guide<ArrowRightIcon size={18} /></Link></div></div>
          <aside className={styles.join}><DiscordIcon size={36} /><h3>Meet us in Night City.</h3><p>Need access? Use <code>/alpha apply</code> in any channel on our Discord. Find your people, share your builds and follow the changelog.</p>{site.links.discord && <a href={site.links.discord} target="_blank" rel="noreferrer noopener" className={styles.textLink}>Join the community<ArrowRightIcon size={18} /></a>}<small>We’re in Alpha. Expect bugs and evolving APIs.<br />Build with us as the platform grows.</small></aside>
        </section>
      </main>
      <div className={styles.footer}><SiteFooter tone="dark" /></div>
      <JsonLd data={jsonLdGraph(softwareApplicationNode(), breadcrumbNode([{ name: "Home", path: "/" }]))} />
    </>
  );
}
