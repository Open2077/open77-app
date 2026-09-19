import Image from "next/image";
import Link from "next/link";
import { DocsShell } from "@/components/docs/docs-shell";
import { DocsIcon } from "@/components/docs/docs-icon";
import { ArrowRightIcon, CodeIcon, DiscordIcon, DownloadIcon, PeopleIcon, ServerRackIcon, ShieldIcon } from "@/components/icons";
import { JsonLd } from "@/components/json-ld";
import { getApiIndex } from "@/lib/api-reference";
import { docHref, getDocsNav } from "@/lib/docs";
import { breadcrumbNode, collectionPageNode, itemListNode, jsonLdGraph, pageMetadata } from "@/lib/seo";
import { site } from "@/lib/site";

const DESCRIPTION = "Build your world in Night City. Guides for players, server owners and resource developers, plus the complete OPEN//77 Lua API reference.";
export const metadata = pageMetadata({ title: "Documentation", description: DESCRIPTION, path: "/docs", markdownPath: "/docs.md" });

export default async function DocsHomePage() {
  const [nav, api] = await Promise.all([getDocsNav(), getApiIndex()]);
  const starts = [
    { title: "Join a server.", description: "Install the launcher, find your first world and press connect.", href: "/docs/launcher", action: "Player guide", icon: ShieldIcon, tone: "cyan" },
    { title: "Host your world.", description: "Set up a dedicated server, license it to your account and make it your own.", href: "/docs/host-a-server", action: "Server guide", icon: ServerRackIcon, tone: "amber" },
    { title: "Create a resource.", description: "Bring your ideas to life with Lua 5.4, the game's real APIs and web interfaces.", href: "/docs/server-resources", action: "Developer guide", icon: CodeIcon, tone: "cyan" },
    { title: "Ask the community.", description: "Platform bugs, missing APIs and general help live on the OPEN//77 Discord.", href: site.links.discord ?? "https://discord.open2077.net", action: "Join the Discord", icon: DiscordIcon, tone: "violet" },
  ];
  return (
    <>
      <DocsShell breadcrumbs={[{ label: "Documentation" }]} title="Welcome to OPEN//77" landing>
        <div className="docs-home docs-hub">
          <section className="docs-hub-hero" aria-labelledby="docs-home-title">
            <div className="docs-hub-art" aria-hidden="true"><Image src="/assets/artwork/docs-retro-v1.webp" alt="" fill preload sizes="(max-width: 760px) 100vw, 60vw" /></div>
            <div className="docs-hub-hero-copy">
              <p className="docs-kicker"><span aria-hidden="true">{"//"}</span> DOCUMENTATION</p>
              <h1 id="docs-home-title">Welcome to<br /><em>OPEN//77.</em></h1>
              <p>Everything you need to play, host a server and build multiplayer experiences in Night City. OPEN//77 is a multiplayer platform for Cyberpunk 2077: start with a guide, explore the built-in systems, or look up a function in the API reference.</p>
              <div className="docs-hub-actions"><Link className="docs-button docs-button-primary" href="/docs/platform">How the platform works <ArrowRightIcon size={16} /></Link><Link className="docs-button docs-button-secondary" href="/docs/api">Lua API reference <CodeIcon size={17} /></Link></div>
              <div className="docs-hub-stats"><span><i /> Lua 5.4</span><span>{api.count.toLocaleString("en-GB")} API functions</span><span>Client &amp; server</span></div>
            </div>
            <span className="docs-hub-scene-note" aria-hidden="true">PLAY · HOST · BUILD</span>
          </section>

          <div className="docs-hub-content">
            <section id="start-here">
              <div className="docs-hub-section-heading"><div><p className="docs-kicker">START HERE</p><h2>Start here.</h2><p>One guide for each way in — playing, hosting, building — and the place to ask when a guide is missing.</p></div><Link href="#explore">Browse all guides <ArrowRightIcon size={15} /></Link></div>
              <div className="docs-start-grid">
                {starts.map(({ icon: Icon, title, description, href, action, tone }, index) => (
                  <Link href={href} key={title} className="docs-start-card" data-tone={tone} {...(href.startsWith("https:") ? { target: "_blank", rel: "noreferrer noopener" } : {})}>
                    <div className="docs-start-top"><span className="docs-start-icon"><Icon size={22} /></span><span className="docs-start-number">0{index + 1}</span></div>
                    <strong>{title}</strong><p>{description}</p><span className="docs-link-label">{action}<ArrowRightIcon size={16} /></span>
                  </Link>
                ))}
              </div>
            </section>

            <div className="docs-hub-bento">
              <section className="docs-alpha-card">
                <Image src="/assets/home/play-v2.webp" alt="" fill sizes="(max-width: 1000px) 100vw, 50vw" />
                <p className="docs-kicker"><span className="docs-alpha-dot" /> ALPHA ACCESS · BUILD NOW</p><h2>It’s time<br />to build.</h2><p>{site.alphaNotice}</p>
                <div className="docs-hub-actions"><Link className="docs-button docs-button-secondary" href="/host">Download server <DownloadIcon size={15} /></Link><Link className="docs-inline-link" href="/docs/alpha-access">Alpha guide <ArrowRightIcon size={15} /></Link></div>
              </section>
              <section className="docs-quick-card" aria-labelledby="docs-quick-title">
                <h2 id="docs-quick-title">Looking for a function?</h2>
                <div className="docs-quick-links">
                  <Link href="/docs/api"><CodeIcon size={20} /><span><strong>API reference</strong><small>{api.count.toLocaleString("en-GB")} Lua functions by category and runtime</small></span><ArrowRightIcon size={14} /></Link>
                  <Link href="/docs/resource-runtime"><DocsIcon name="scripting" size={20} /><span><strong>Resource lifecycle</strong><small>Scripts, events &amp; permissions</small></span><ArrowRightIcon size={14} /></Link>
                  <Link href="/docs/warden"><ShieldIcon size={20} /><span><strong>Warden</strong><small>Manage your server</small></span><ArrowRightIcon size={14} /></Link>
                  <Link href="/devblog"><DocsIcon name="introduction" size={20} /><span><strong>Devblog</strong><small>What shipped, one post per working day</small></span><ArrowRightIcon size={14} /></Link>
                </div>
              </section>
            </div>

            <div className="docs-hub-paths">
              <section id="server-owners"><div className="docs-path-title"><ServerRackIcon size={22} /><div><p className="docs-kicker">HOST &amp; ADMINISTER</p><h2>Server owners.</h2></div></div><p className="docs-path-lead">From your first local server to a world ready for your community.</p>
                <ul className="docs-home-links">
                  <li><Link href="/docs/host-a-server">Set up a dedicated server <ArrowRightIcon size={14} /></Link><span>Installation, configuration and first launch.</span></li>
                  <li><Link href="/docs/warden">Manage your server with Warden <ArrowRightIcon size={14} /></Link><span>Players, resources and administration.</span></li>
                  <li><Link href="/docs/connection-control">Control who can join <ArrowRightIcon size={14} /></Link><span>Admission, whitelists and connection events.</span></li>
                </ul>
              </section>
              <section id="resource-developers"><div className="docs-path-title"><CodeIcon size={22} /><div><p className="docs-kicker">SCRIPT &amp; CREATE</p><h2>Resource developers.</h2></div></div><p className="docs-path-lead">Resources bring together Lua scripts, a manifest and optional web interfaces.</p>
                <ul className="docs-home-links">
                  <li><Link href="/docs/resource-runtime">Understand the resource lifecycle <ArrowRightIcon size={14} /></Link><span>Client and server scripts, events and permissions.</span></li>
                  <li><Link href="/docs/writing-a-gamemode">Write your first gamemode <ArrowRightIcon size={14} /></Link><span>Build on the platform’s shared systems.</span></li>
                  <li><Link href="/docs/resource-exports">Use the built-in resource exports <ArrowRightIcon size={14} /></Link><span>Integrate interfaces, interactions and world services.</span></li>
                </ul>
              </section>
            </div>

            <section id="explore">
              <div className="docs-hub-section-heading"><div><p className="docs-kicker">EXPLORE</p><h2>Explore the documentation.</h2><p>Find a system by theme. Each guide has one home, shared with the sidebar.</p></div><span className="docs-directory-count">{nav.sections.length} topics · {nav.sections.reduce((sum, section) => sum + section.pages.filter(page => page.slug !== "index").length, 0)} pages</span></div>
              {[...new Set(nav.sections.map((section) => section.group))].map((group) => (
                <div className="docs-topic-directory" key={group}>
                  <h3>{group}</h3>
                  <div className="docs-category-directory">
                    {nav.sections.filter((section) => section.group === group).map((section) => (
                      <div key={section.id} id={`topic-${section.id}`}>
                        <div className="docs-directory-title"><DocsIcon name={section.id} /><h4>{section.title}</h4></div><p>{section.description}</p>
                        <ul>{section.pages.filter((page) => page.slug !== "index").map((page) => <li key={page.slug}><Link href={docHref(page.slug)}>{page.nav}<ArrowRightIcon size={12} /></Link></li>)}</ul>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </section>
            <div className="docs-hub-bottom"><PeopleIcon size={19} /><p>OPEN//77 is an unofficial, independent community project — unaffiliated with CD PROJEKT RED.</p><Link href="/docs/launcher">Just here to play? The launcher guide <ArrowRightIcon size={15} /></Link></div>
          </div>
        </div>
      </DocsShell>
      <JsonLd data={jsonLdGraph(
        collectionPageNode({ name: "OPEN//77 documentation", description: DESCRIPTION, path: "/docs" }),
        itemListNode({ name: "Documentation pages", path: "/docs", items: nav.sections.flatMap((section) => section.pages.map((page) => ({ name: page.nav, path: docHref(page.slug) }))) }),
        breadcrumbNode([{ name: "Home", path: "/" }, { name: "Documentation", path: "/docs" }]),
      )} />
    </>
  );
}
