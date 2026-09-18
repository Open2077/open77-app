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
    { title: "Find your starting point.", description: "Discover the platform, Alpha access and what you need to play.", href: "/docs/platform", action: "Start here", icon: ShieldIcon, tone: "cyan" },
    { title: "Run your own server.", description: "From a local test to a community. Install, configure and launch.", href: "/docs/host-a-server", action: "Hosting guide", icon: ServerRackIcon, tone: "amber" },
    { title: "Make your first resource.", description: "Build custom gameplay with Lua, native systems and WebUI.", href: "/docs/server-resources", action: "Developer guide", icon: CodeIcon, tone: "cyan" },
    { title: "Build alongside us.", description: "Find help, share your projects and follow the latest releases.", href: site.links.discord ?? "https://discord.open2077.net", action: "Join Discord", icon: DiscordIcon, tone: "violet" },
  ];
  return (
    <>
      <DocsShell breadcrumbs={[{ label: "Documentation" }]} title="Your ideas. A whole city to build." landing>
        <div className="docs-home docs-hub">
          <section className="docs-hub-hero" aria-labelledby="docs-home-title">
            <div className="docs-hub-art" aria-hidden="true"><Image src="/assets/artwork/docs-retro-v1.jpg" alt="" fill preload sizes="(max-width: 760px) 100vw, 60vw" /></div>
            <div className="docs-hub-hero-copy">
              <p className="docs-kicker"><span aria-hidden="true">{"//"}</span> OPEN//77 DOCUMENTATION</p>
              <h1 id="docs-home-title">Your ideas.<br /><em>A whole city to build.</em></h1>
              <p>Turn Night City into your next multiplayer experience. Learn the platform, explore the APIs and make something of your own.</p>
              <div className="docs-hub-actions"><Link className="docs-button docs-button-primary" href="/docs/server-resources">Start building <ArrowRightIcon size={16} /></Link><Link className="docs-button docs-button-secondary" href="/docs/api">Explore the API <CodeIcon size={17} /></Link></div>
              <div className="docs-hub-stats"><span><i /> Lua 5.4</span><span>{api.count.toLocaleString("en-GB")} API functions</span><span>Client &amp; server</span></div>
            </div>
            <span className="docs-hub-scene-note" aria-hidden="true">ONE CITY.<br />ENDLESS POSSIBILITIES.</span>
          </section>

          <div className="docs-hub-content">
            <section id="start-here">
              <div className="docs-hub-section-heading"><div><p className="docs-kicker">PICK YOUR PATH</p><h2>Start something.</h2><p>Everything you need, from your first connection to your first creation.</p></div><Link href="#explore">Browse all guides <ArrowRightIcon size={15} /></Link></div>
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
                <p className="docs-kicker"><span className="docs-alpha-dot" /> ALPHA · OPEN TO BUILDERS</p><h2>Have Alpha access?<br />You’re ready to create.</h2><p>Everyone with Alpha access can download the server and start building. No separate developer application. Need access? Use <code>/alpha apply</code> in any channel on our Discord.</p>
                <div className="docs-hub-actions"><Link className="docs-button docs-button-secondary" href="/host">Download server <DownloadIcon size={15} /></Link><Link className="docs-inline-link" href="/docs/alpha-access">Alpha guide <ArrowRightIcon size={15} /></Link></div>
              </section>
              <section className="docs-quick-card" aria-labelledby="docs-quick-title">
                <h2 id="docs-quick-title">A few useful shortcuts.</h2>
                <div className="docs-quick-links">
                  <Link href="/docs/api"><CodeIcon size={20} /><span><strong>API reference</strong><small>Find a function</small></span><ArrowRightIcon size={14} /></Link>
                  <Link href="/docs/resource-runtime"><DocsIcon name="scripting" size={20} /><span><strong>Resource lifecycle</strong><small>Scripts, events &amp; permissions</small></span><ArrowRightIcon size={14} /></Link>
                  <Link href="/docs/warden"><ShieldIcon size={20} /><span><strong>Warden</strong><small>Manage your server</small></span><ArrowRightIcon size={14} /></Link>
                  <Link href="/devblog"><DocsIcon name="introduction" size={20} /><span><strong>What’s new</strong><small>Updates &amp; devblog</small></span><ArrowRightIcon size={14} /></Link>
                </div>
              </section>
            </div>

            <div className="docs-hub-paths">
              <section id="server-owners"><div className="docs-path-title"><ServerRackIcon size={22} /><div><p className="docs-kicker">HOST &amp; ADMINISTER</p><h2>Make room for your community.</h2></div></div>
                <ul className="docs-home-links">
                  <li><Link href="/docs/host-a-server">Set up a dedicated server <ArrowRightIcon size={14} /></Link><span>Installation, configuration and first launch.</span></li>
                  <li><Link href="/docs/warden">Manage your server with Warden <ArrowRightIcon size={14} /></Link><span>Players, resources and administration.</span></li>
                  <li><Link href="/docs/connection-control">Control who can join <ArrowRightIcon size={14} /></Link><span>Admission, whitelists and connection events.</span></li>
                </ul>
              </section>
              <section id="resource-developers"><div className="docs-path-title"><CodeIcon size={22} /><div><p className="docs-kicker">SCRIPT &amp; CREATE</p><h2>Your next system starts here.</h2></div></div>
                <ul className="docs-home-links">
                  <li><Link href="/docs/resource-runtime">Understand the resource lifecycle <ArrowRightIcon size={14} /></Link><span>Client and server scripts, events and permissions.</span></li>
                  <li><Link href="/docs/writing-a-gamemode">Write your first gamemode <ArrowRightIcon size={14} /></Link><span>Build on the platform’s shared systems.</span></li>
                  <li><Link href="/docs/resource-exports">Use the built-in resource exports <ArrowRightIcon size={14} /></Link><span>Interfaces, interactions and world services.</span></li>
                </ul>
              </section>
            </div>

            <section id="explore">
              <div className="docs-hub-section-heading"><div><p className="docs-kicker">THE WHOLE TOOLBOX</p><h2>Find your system.</h2><p>Guides grouped by theme, with the same organization as the sidebar.</p></div><span className="docs-directory-count">{nav.sections.length} topics · {nav.sections.reduce((sum, section) => sum + section.pages.filter(page => page.slug !== "index").length, 0)} pages</span></div>
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
            <div className="docs-hub-bottom"><PeopleIcon size={19} /><p>Built by modders. Made for the next Night City.</p><Link href="/docs/launcher">Just here to play? <ArrowRightIcon size={15} /></Link></div>
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
