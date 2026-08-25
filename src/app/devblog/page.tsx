import Link from "next/link";

import { Eyebrow } from "@/components/brand";
import { JsonLd } from "@/components/json-ld";
import { SiteFooter } from "@/components/site-footer";
import { blogHref, formatBlogDate, getBlogPosts } from "@/lib/devblog";
import { blogNode, breadcrumbNode, itemListNode, jsonLdGraph, pageMetadata } from "@/lib/seo";
import { site } from "@/lib/site";

const DESCRIPTION =
  "The OPEN//77 devblog: what shipped in the Cyberpunk 2077 multiplayer platform, posted as it happens — replication work, server tooling, launcher and platform progress.";

export const metadata = pageMetadata({
  title: "Devblog",
  description: DESCRIPTION,
  path: "/devblog",
});

export default async function DevblogIndexPage() {
  const posts = await getBlogPosts();

  return (
    <>
      <main id="main">
        <section className="page-hero page-hero-plain">
          <div className="section-inner">
            <Eyebrow>UNDER THE HOOD</Eyebrow>
            <h1 className="page-title">Devblog</h1>
            <p className="section-lead">
              What actually shipped, written up as it happens. The daily summaries land on{" "}
              {site.links.discord ? (
                <a href={site.links.discord} target="_blank" rel="noreferrer noopener">
                  Discord
                </a>
              ) : (
                "Discord"
              )}{" "}
              first; the longer, more technical write-ups live here.
            </p>
            <p className="blog-feed-link">
              <a href="/devblog/rss.xml">RSS feed</a>
            </p>
          </div>
        </section>

        <section className="section">
          <div className="section-inner">
            {posts.length === 0 ? (
              <p className="section-lead">No posts yet — the first one is on its way.</p>
            ) : (
              <ol className="blog-list">
                {posts.map((post) => (
                  <li key={post.slug} className="blog-card">
                    <p className="blog-card-date">
                      <time dateTime={post.date}>{formatBlogDate(post.date)}</time>
                    </p>
                    <h2 className="blog-card-title">
                      <Link href={blogHref(post.slug)}>{post.title}</Link>
                    </h2>
                    <p className="blog-card-description">{post.description}</p>
                    {post.tags.length > 0 ? (
                      <p className="blog-tags">
                        {post.tags.map((tag) => (
                          <span key={tag} className="blog-tag">
                            {tag}
                          </span>
                        ))}
                      </p>
                    ) : null}
                  </li>
                ))}
              </ol>
            )}
          </div>
        </section>
      </main>

      <SiteFooter fineprint="Pre-alpha. Development is documented as it happens." />

      <JsonLd
        data={jsonLdGraph(
          blogNode({ description: DESCRIPTION, path: "/devblog" }),
          itemListNode({
            name: "OPEN//77 devblog posts",
            path: "/devblog",
            items: posts.map((post) => ({ name: post.title, path: blogHref(post.slug) })),
          }),
          breadcrumbNode([
            { name: "Home", path: "/" },
            { name: "Devblog", path: "/devblog" },
          ]),
        )}
      />
    </>
  );
}
