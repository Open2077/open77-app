import Image from "next/image";
import Link from "next/link";
import type { CSSProperties } from "react";

import { AgentNote } from "@/components/docs/agent-note";
import { DocsIcon } from "@/components/docs/docs-icon";
import { DocsSearchTrigger } from "@/components/docs/docs-search";
import { JsonLd } from "@/components/json-ld";
import { Button } from "@/components/ui/button";
import { GlitchFrame } from "@/components/ui/glitch-frame";
import { Icon } from "@/components/ui/icon";
import {
  arrowRight01,
  arrowUpRight01,
  code,
  discord,
  download02,
  gameController03,
  news,
  serverStack01,
  serverStack02,
  shield01,
  sourceCode,
  userGroup,
} from "@/components/ui/icons";
import { Display, Eyebrow, Lead } from "@/components/ui/typography";
import { getApiIndex } from "@/lib/api-reference";
import { docHref, getDocsNav } from "@/lib/docs";
import { breadcrumbNode, collectionPageNode, itemListNode, jsonLdGraph, pageMetadata } from "@/lib/seo";
import { site } from "@/lib/site";

import styles from "./docs-home.module.css";

const DESCRIPTION = "Build your world in Night City. Guides for players, server owners and resource developers, plus the complete OPEN//77 Lua API reference.";
export const metadata = pageMetadata({ title: "Documentation", description: DESCRIPTION, path: "/docs", markdownPath: "/docs.md" });

/** One way in per audience, each in its audience's colour. */
const STARTS = [
  {
    title: "Join a server.",
    description: "Install the launcher, find your first world and press connect.",
    href: "/docs/launcher",
    action: "Player guide",
    glyph: gameController03,
    audience: "For players",
    tone: "var(--yellow)",
  },
  {
    title: "Host your world.",
    description: "Set up a dedicated server, license it to your account and make it your own.",
    href: "/docs/host-a-server",
    action: "Server guide",
    glyph: serverStack01,
    audience: "For server owners",
    tone: "var(--blue)",
  },
  {
    title: "Create a resource.",
    description: "Bring your ideas to life with Lua 5.4, the game's real APIs and web interfaces.",
    href: "/docs/server-resources",
    action: "Developer guide",
    glyph: sourceCode,
    audience: "For developers",
    tone: "var(--red)",
  },
  {
    title: "Ask the community.",
    description: "Platform bugs, missing APIs and general help live on the OPEN//77 Discord.",
    href: site.links.discord ?? "https://discord.open2077.net",
    action: "Join the Discord",
    glyph: discord,
    audience: "Everyone",
    tone: "var(--text-primary)",
  },
];

const QUICK_LINKS = [
  { href: "/docs/api", title: "API reference", glyph: code },
  { href: "/docs/resource-runtime", title: "Resource lifecycle", detail: "Scripts, events & permissions", icon: "scripting" },
  { href: "/docs/warden", title: "Warden", detail: "Manage your server", glyph: shield01 },
  { href: "/devblog", title: "Devblog", detail: "What shipped, one post per working day", glyph: news },
];

const PATHS = [
  {
    id: "server-owners",
    kicker: "Host & administer",
    title: "Server owners.",
    lead: "From your first local server to a world ready for your community.",
    glyph: serverStack02,
    tone: "var(--blue)",
    links: [
      { href: "/docs/host-a-server", label: "Set up a dedicated server", detail: "Installation, configuration and first launch." },
      { href: "/docs/warden", label: "Manage your server with Warden", detail: "Players, resources and administration." },
      { href: "/docs/connection-control", label: "Control who can join", detail: "Admission, whitelists and connection events." },
    ],
  },
  {
    id: "resource-developers",
    kicker: "Script & create",
    title: "Resource developers.",
    lead: "Resources bring together Lua scripts, a manifest and optional web interfaces.",
    glyph: code,
    tone: "var(--red)",
    links: [
      { href: "/docs/resource-runtime", label: "Understand the resource lifecycle", detail: "Client and server scripts, events and permissions." },
      { href: "/docs/writing-a-gamemode", label: "Write your first gamemode", detail: "Build on the platform’s shared systems." },
      { href: "/docs/resource-exports", label: "Use the built-in resource exports", detail: "Integrate interfaces, interactions and world services." },
    ],
  },
];

export default async function DocsHomePage() {
  const [nav, api] = await Promise.all([getDocsNav(), getApiIndex()]);
  const pageCount = nav.sections.reduce((sum, section) => sum + section.pages.filter((page) => page.slug !== "index").length, 0);
  const collections = [...new Set(nav.sections.map((section) => section.group))];

  return (
    <>
      <section className={styles.hero} aria-labelledby="docs-home-title">
        <div className={styles.heroArt} aria-hidden="true">
          <Image src="/home/img/devs-bg.webp" alt="" fill preload sizes="100vw" quality={75} />
        </div>
        <div className={styles.heroCharacter} aria-hidden="true">
          <GlitchFrame>
            <Image src="/home/img/devs-character.webp" alt="" width={1089} height={1413} preload sizes="(max-width: 1084px) 80vw, 40vw" quality={75} />
          </GlitchFrame>
        </div>
        <p className={styles.heroSide} aria-hidden="true">
          Play <span>{"//"}</span> Host <span>{"//"}</span> Build
        </p>

        <div className={styles.heroInner}>
          <div className={styles.heroCopy}>
            <Eyebrow>{"// Documentation"}</Eyebrow>
            <Display as="h1" id="docs-home-title" size="xl" lines={["Welcome to", "OPEN//77."]} accent={[1]} glitch />
            <Lead className={styles.heroLead}>
              Everything you need to play, host a server and build multiplayer experiences in Night City.
            </Lead>
            {/* The search is the page's first tool: it sits in the first screen, the two ways in beside it. */}
            <div className={styles.heroTools}>
              <DocsSearchTrigger size="lg" className={styles.heroSearch} />
              <div className={styles.heroActions}>
                <Button color="red" size="sm" lines="none" href="/docs/platform" icon={arrowRight01}>
                  How the platform works
                </Button>
                <Button color="red" size="sm" lines="none" border href="/docs/api" icon={code}>
                  Lua API reference
                </Button>
              </div>
            </div>
          </div>
          <dl className={styles.heroStats}>
            <div className={styles.heroStat}>
              <dt>API functions</dt>
              <dd>{api.count.toLocaleString("en-GB")}</dd>
            </div>
            <div className={styles.heroStat}>
              <dt>Guides</dt>
              <dd>{pageCount}</dd>
            </div>
            <div className={styles.heroStat}>
              <dt>Lua</dt>
              <dd>5.4</dd>
            </div>
          </dl>
        </div>
      </section>

      <section id="start-here" className={`${styles.section} ${styles.sectionFirst}`} aria-labelledby="start-here-title">
        <header className={styles.sectionHead}>
          <div className={styles.sectionCopy}>
            <Eyebrow index={1}>Start here</Eyebrow>
            <Display size="md" id="start-here-title">
              Start here.
            </Display>
            <Lead>One guide for each way in (playing, hosting, building) and the place to ask when a guide is missing.</Lead>
          </div>
          <Link href="#explore" className={styles.headLink}>
            Browse all guides <Icon glyph={arrowRight01} />
          </Link>
        </header>
        <ol className={styles.starts}>
          {STARTS.map((start, index) => {
            const external = start.href.startsWith("https:");
            return (
              <li key={start.title}>
                <Link
                  href={start.href}
                  className={styles.start}
                  style={{ "--tone": start.tone } as CSSProperties}
                  {...(external ? { target: "_blank", rel: "noreferrer noopener" } : {})}
                >
                  <span className={styles.startAudience}>{start.audience}</span>
                  <span className={styles.startTop}>
                    <Icon glyph={start.glyph} className={styles.startIcon} />
                    <span className={styles.startIndex}>{String(index + 1).padStart(2, "0")}</span>
                  </span>
                  <strong className={styles.startTitle}>{start.title}</strong>
                  <span className={styles.startText}>{start.description}</span>
                  <span className={styles.startAction}>
                    {start.action}
                    <Icon glyph={external ? arrowUpRight01 : arrowRight01} />
                  </span>
                </Link>
              </li>
            );
          })}
        </ol>
      </section>

      <div className={styles.bento}>
        <section className={styles.alpha} aria-labelledby="docs-alpha-title">
          <Image src="/home/img/server-custom-worlds.webp" alt="" fill sizes="(max-width: 1084px) 100vw, 60vw" quality={75} className={styles.alphaArt} />
          <div className={styles.alphaCopy}>
            <Eyebrow>
              <span className={styles.liveDot} aria-hidden="true" /> Alpha access · Build now
            </Eyebrow>
            <Display size="lg" id="docs-alpha-title" lines={["It’s time", "to build."]} accent={[1]} />
            <p className={styles.alphaText}>{site.alphaNotice}</p>
            <div className={styles.alphaActions}>
              <Button color="red" lines="none" border size="sm" href="/host" icon={download02}>
                Download server
              </Button>
              <Link className={styles.headLink} href="/docs/alpha-access">
                Alpha guide <Icon glyph={arrowRight01} />
              </Link>
            </div>
          </div>
        </section>

        <section className={styles.quick} aria-labelledby="docs-quick-title">
          <Eyebrow muted>Quick links</Eyebrow>
          <Display size="sm" as="h2" id="docs-quick-title">
            Looking for a function?
          </Display>
          <ul className={styles.quickLinks}>
            {QUICK_LINKS.map((link) => (
              <li key={link.href}>
                <Link href={link.href}>
                  <span className={styles.quickIcon}>{link.glyph ? <Icon glyph={link.glyph} /> : <DocsIcon name={link.icon ?? "introduction"} size={20} />}</span>
                  <span className={styles.quickText}>
                    <strong>{link.title}</strong>
                    <small>{link.href === "/docs/api" ? `${api.count.toLocaleString("en-GB")} Lua functions by category and runtime` : link.detail}</small>
                  </span>
                  <Icon glyph={arrowRight01} className={styles.quickArrow} />
                </Link>
              </li>
            ))}
          </ul>
        </section>
      </div>

      <div className={styles.paths}>
        {PATHS.map((path, index) => (
          <section id={path.id} key={path.id} className={styles.path} style={{ "--tone": path.tone } as CSSProperties} aria-labelledby={`${path.id}-title`}>
            <div className={styles.pathHead}>
              <Icon glyph={path.glyph} className={styles.pathIcon} />
              <div>
                <Eyebrow index={index + 2}>{path.kicker}</Eyebrow>
                <Display size="sm" id={`${path.id}-title`}>
                  {path.title}
                </Display>
              </div>
            </div>
            <p className={styles.pathLead}>{path.lead}</p>
            <ul className={styles.pathLinks}>
              {path.links.map((link) => (
                <li key={link.href}>
                  <Link href={link.href}>
                    <span>{link.label}</span>
                    <Icon glyph={arrowRight01} />
                  </Link>
                  <small>{link.detail}</small>
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>

      <section id="explore" className={styles.section} aria-labelledby="explore-title">
        <header className={styles.sectionHead}>
          <div className={styles.sectionCopy}>
            <Eyebrow index={4}>Explore</Eyebrow>
            <Display size="md" id="explore-title">
              Explore the documentation.
            </Display>
            <Lead>Find a system by theme. Each guide has one home, shared with the sidebar.</Lead>
          </div>
          <p className={styles.directoryCount}>
            {nav.sections.length} topics <span>{"//"}</span> {pageCount} pages
          </p>
        </header>
        {collections.map((group, groupIndex) => {
          const sections = nav.sections.filter((section) => section.group === group);
          return (
            <div className={styles.collection} key={group} data-docs-directory>
              <div className={styles.collectionHead}>
                <span className={styles.collectionIndex}>{String(groupIndex + 1).padStart(2, "0")}</span>
                <h3>{group}</h3>
                <span className={styles.collectionCount}>
                  {sections.length} {sections.length === 1 ? "topic" : "topics"}
                </span>
              </div>
              <div className={styles.topics}>
                {sections.map((section) => (
                  <div key={section.id} id={`topic-${section.id}`} className={styles.topic}>
                    <div className={styles.topicHead}>
                      <DocsIcon name={section.id} />
                      <h4>{section.title}</h4>
                    </div>
                    <p>{section.description}</p>
                    <ul>
                      {section.pages
                        .filter((page) => page.slug !== "index")
                        .map((page) => (
                          <li key={page.slug}>
                            <Link href={docHref(page.slug)}>{page.nav}</Link>
                          </li>
                        ))}
                    </ul>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </section>

      <div className={styles.bottom}>
        <p className={styles.bottomNote}>
          <Icon glyph={userGroup} />
          OPEN//77 is an unofficial, independent community project, unaffiliated with CD PROJEKT RED.
        </p>
        <Link href="/docs/launcher" className={styles.headLink}>
          Just here to play? The launcher guide <Icon glyph={arrowRight01} />
        </Link>
        <AgentNote markdownHref="/docs.md" />
      </div>

      <JsonLd
        data={jsonLdGraph(
          collectionPageNode({ name: "OPEN//77 documentation", description: DESCRIPTION, path: "/docs" }),
          itemListNode({ name: "Documentation pages", path: "/docs", items: nav.sections.flatMap((section) => section.pages.map((page) => ({ name: page.nav, path: docHref(page.slug) }))) }),
          breadcrumbNode([{ name: "Home", path: "/" }, { name: "Documentation", path: "/docs" }]),
        )}
      />
    </>
  );
}
