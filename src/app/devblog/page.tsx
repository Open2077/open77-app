import Image from "next/image";
import { BlogFeed } from "@/components/devblog/blog-feed";
import { ArrowRightIcon, DiscordIcon } from "@/components/icons";
import { JsonLd } from "@/components/json-ld";
import { SiteFooter } from "@/components/site-footer";
import { blogHref, getBlogPosts } from "@/lib/devblog";
import { blogNode, breadcrumbNode, itemListNode, jsonLdGraph, pageMetadata } from "@/lib/seo";
import { site } from "@/lib/site";

const DESCRIPTION = "The OPEN//77 devblog: what shipped in the Cyberpunk 2077 multiplayer mod, posted daily: replication work, dedicated server tooling, launcher and platform progress.";
export const metadata = pageMetadata({ title: "Devblog", description: DESCRIPTION, path: "/devblog" });

export default async function DevblogIndexPage() {
  const posts = await getBlogPosts();
  return <>
    <main id="main" className="blog-surface">
      <header className="blog-hero">
        <div className="blog-hero-art" aria-hidden="true"><Image src="/assets/artwork/devblog-nightdrive-v1.webp" alt="" fill sizes="(max-width: 960px) 100vw, 65vw" preload /></div>
        <div className="blog-hero-inner"><div className="blog-hero-copy"><p className="blog-kicker"><span aria-hidden="true">{"//"}</span> UNDER THE HOOD</p><h1>Devblog<span>.</span></h1><p>What actually shipped, written up as it happens.</p><p>The replication work, the server tooling, the platform. One post per working day, straight from the commits. The short versions land on Discord; the full write-ups live here.</p><div className="blog-hero-actions"><a className="blog-button" href="/devblog/rss.xml"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true"><path d="M4 10a10 10 0 0 1 10 10M4 4a16 16 0 0 1 16 16" /><circle cx="5" cy="19" r="1" /></svg>RSS feed</a>{site.links.discord && <a className="blog-button blog-button-discord" href={site.links.discord} target="_blank" rel="noreferrer noopener"><DiscordIcon size={18} />Daily summaries on Discord <ArrowRightIcon /></a>}</div></div><span className="blog-hero-note" aria-hidden="true">ONE POST PER WORKING DAY.<br />STRAIGHT FROM THE COMMITS.</span></div>
      </header>
      <BlogFeed posts={posts} />
    </main>
    <SiteFooter tone="dark" />
    <JsonLd data={jsonLdGraph(blogNode({ description: DESCRIPTION, path: "/devblog" }), itemListNode({ name: "OPEN//77 devblog posts", path: "/devblog", items: posts.map(post => ({ name: post.title, path: blogHref(post.slug) })) }), breadcrumbNode([{ name: "Home", path: "/" }, { name: "Devblog", path: "/devblog" }]))} />
  </>;
}
