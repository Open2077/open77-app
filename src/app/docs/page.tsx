import Link from "next/link";
import { DocsShell } from "@/components/docs/docs-shell";
import { DocToc } from "@/components/docs/doc-toc";
import { JsonLd } from "@/components/json-ld";
import { getApiIndex } from "@/lib/api-reference";
import { docHref, getDocsNav, getDocsManifest } from "@/lib/docs";
import { breadcrumbNode, collectionPageNode, itemListNode, jsonLdGraph, pageMetadata } from "@/lib/seo";

const DESCRIPTION = "Build your world in Night City. Guides for players, server owners and resource developers, plus the complete OPEN//77 Lua API reference.";
export const metadata = pageMetadata({ title: "Documentation", description: DESCRIPTION, path: "/docs", markdownPath: "/docs.md" });

export default async function DocsHomePage() {
  const [nav, api, manifest] = await Promise.all([getDocsNav(), getApiIndex(), getDocsManifest()]);
  const sections = [
    { id: "start-here", text: "Start here", depth: 2 },
    { id: "server-owners", text: "Server owners", depth: 2 },
    { id: "resource-developers", text: "Resource developers", depth: 2 },
    { id: "explore", text: "Explore the documentation", depth: 2 },
  ];
  return (
    <>
      <DocsShell breadcrumbs={[{ label: "Documentation" }]} title="Welcome to OPEN//77"
        lede="Everything you need to play, host a server and build multiplayer experiences in Night City."
        toc={<DocToc entries={sections} />}>
        <div className="docs-home">
          <p className="docs-home-intro">OPEN//77 is a multiplayer platform for Cyberpunk 2077. Start with a guide, explore the built-in systems, or look up a function in the API reference.</p>
          <div className="docs-notice"><span className="docs-notice-icon" aria-hidden="true">i</span><p><strong>A work in progress.</strong> OPEN//77 is in pre-alpha. These guides describe the current platform; APIs and supported features may change.</p></div>
          <section id="start-here">
            <h2>Start here</h2>
            <div className="docs-start-grid">
              <Link href="/docs/launcher"><span className="docs-start-icon" aria-hidden="true">↗</span><strong>Join a server</strong><p>Install the launcher and find your first world.</p><span className="docs-link-label">Player guide →</span></Link>
              <Link href="/docs/host-a-server"><span className="docs-start-icon" aria-hidden="true">▤</span><strong>Host your world</strong><p>Set up a server and make it your own.</p><span className="docs-link-label">Server guide →</span></Link>
              <Link href="/docs/server-resources"><span className="docs-start-icon" aria-hidden="true">&lt;/&gt;</span><strong>Create a resource</strong><p>Bring your ideas to life with Lua.</p><span className="docs-link-label">Developer guide →</span></Link>
            </div>
          </section>
          <section id="server-owners">
            <h2>Server owners</h2>
            <p>From your first local server to a world ready for your community.</p>
            <ul className="docs-home-links">
              <li><Link href="/docs/host-a-server">Set up a dedicated server</Link><span>Installation, configuration and first launch.</span></li>
              <li><Link href="/docs/warden">Manage your server with Warden</Link><span>Players, resources and administration.</span></li>
              <li><Link href="/docs/server-resources">Install and configure resources</Link><span>Choose the features your world runs.</span></li>
              <li><Link href="/docs/connection-control">Control who can join</Link><span>Admission, whitelists and connection events.</span></li>
            </ul>
          </section>
          <section id="resource-developers">
            <h2>Resource developers</h2>
            <p>Resources bring together Lua scripts, a manifest and optional web interfaces.</p>
            <ul className="docs-home-links">
              <li><Link href="/docs/resource-runtime">Understand the resource lifecycle</Link><span>Client and server scripts, events and permissions.</span></li>
              <li><Link href="/docs/writing-a-gamemode">Write your first gamemode</Link><span>Build on the platform’s shared systems.</span></li>
              <li><Link href="/docs/resource-exports">Use the built-in resource exports</Link><span>Integrate interfaces, interactions and world services.</span></li>
            </ul>
            <Link className="docs-reference-banner" href="/docs/api"><span className="docs-reference-symbol" aria-hidden="true">{ "{ }" }</span><span><strong>Looking for a function?</strong><span>Explore {api.count} Lua functions by category and client / server runtime.</span></span><span aria-hidden="true">→</span></Link>
          </section>
          <section id="explore">
            <h2>Explore the documentation</h2>
            <div className="docs-category-directory">
              {nav.sections.filter((section) => section.id !== "introduction").map((section) => (
                <div key={section.id}><h3>{section.title}</h3><ul>{section.pages.map((page) => <li key={page.slug}><Link href={docHref(page.slug)}>{page.nav}</Link></li>)}</ul></div>
              ))}
            </div>
          </section>
          <p className="docs-updated">Based on the Open77 wiki · Updated <time dateTime={manifest.syncedAt}>{new Date(manifest.syncedAt).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })}</time></p>
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
