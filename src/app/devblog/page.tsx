import Link from "next/link";

import { Eyebrow } from "@/components/brand";
import { DiscordIcon } from "@/components/icons";
import { JsonLd } from "@/components/json-ld";
import { SiteFooter } from "@/components/site-footer";
import { blogHref, formatBlogDate, getBlogPosts, type BlogPostMeta } from "@/lib/devblog";
import { blogNode, breadcrumbNode, itemListNode, jsonLdGraph, pageMetadata } from "@/lib/seo";
import { site } from "@/lib/site";

const DESCRIPTION =
  "The OPEN//77 devblog: what shipped in the Cyberpunk 2077 multiplayer mod, posted daily — replication work, dedicated server tooling, launcher and platform progress.";

export const metadata = pageMetadata({
  title: "Devblog",
  description: DESCRIPTION,
  path: "/devblog",
});

/**
 * The tag strip. A `span` rather than a `p` because rows render it inside the
 * inline body of the row link, where a paragraph is not valid content.
 */
function Tags({ tags }: { tags: readonly string[] }) {
  if (tags.length === 0) return null;
  return (
    <span className="blog-tags">
      {tags.map((tag) => (
        <span key={tag} className="blog-tag">
          <span>{tag}</span>
        </span>
      ))}
    </span>
  );
}

function FeaturedPost({ post }: { post: BlogPostMeta }) {
  return (
    <Link href={blogHref(post.slug)} className="blog-feat">
      <article>
        <p className="blog-feat-flag">
          <span className="blog-latest-chip">
            <span>LATEST</span>
          </span>
          <time className="blog-date" dateTime={post.date}>
            {formatBlogDate(post.date)}
          </time>
          <span className="blog-read">{post.readingMinutes} MIN</span>
        </p>
        <h2 className="blog-feat-title">{post.title}</h2>
        <p className="blog-feat-description">{post.description}</p>
        <div className="blog-feat-foot">
          <Tags tags={post.tags} />
          <span className="blog-more" aria-hidden="true">
            READ THE POST //
          </span>
        </div>
      </article>
    </Link>
  );
}

export default async function DevblogIndexPage() {
  const posts = await getBlogPosts();
  const [latest, ...earlier] = posts;

  return (
    <>
      <main id="main">
        <section className="page-hero page-hero-plain">
          <div className="section-inner">
            <Eyebrow>UNDER THE HOOD</Eyebrow>
            <h1 className="page-title">Devblog</h1>
            <p className="section-lead">
              What actually shipped, written up as it happens — the replication work, the server
              tooling, the platform. One post per working day, straight from the commits. The short
              versions land on Discord; the full write-ups live here.
            </p>
            <div className="hero-ctas">
              <a className="btn btn-ghost" href="/devblog/rss.xml">
                RSS FEED
              </a>
              {site.links.discord ? (
                <a
                  className="btn btn-discord"
                  href={site.links.discord}
                  target="_blank"
                  rel="noreferrer noopener"
                >
                  <DiscordIcon size={16} />
                  Daily summaries on Discord
                </a>
              ) : null}
            </div>
          </div>
        </section>

        <section className="section blog-index">
          <div className="section-inner">
            {!latest ? (
              <p className="section-lead">No posts yet — the first one is on its way.</p>
            ) : (
              <>
                <FeaturedPost post={latest} />

                {earlier.length > 0 ? (
                  <>
                    <h2 className="blog-earlier-title">
                      <span className="blog-earlier-rule" aria-hidden="true" />
                      EARLIER POSTS
                    </h2>
                    <ol className="blog-rows">
                      {earlier.map((post) => (
                        <li key={post.slug}>
                          <Link href={blogHref(post.slug)} className="blog-row">
                            <time className="blog-date" dateTime={post.date}>
                              {formatBlogDate(post.date)}
                            </time>
                            <span className="blog-row-body">
                              <span className="blog-row-title">{post.title}</span>
                              <span className="blog-row-description">{post.description}</span>
                              <Tags tags={post.tags} />
                            </span>
                            <span className="blog-row-side">
                              <span className="blog-read">{post.readingMinutes} MIN</span>
                            </span>
                          </Link>
                        </li>
                      ))}
                    </ol>
                  </>
                ) : null}
              </>
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
