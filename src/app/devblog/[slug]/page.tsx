import Link from "next/link";
import { notFound } from "next/navigation";

import { Eyebrow } from "@/components/brand";
import { DiscordIcon } from "@/components/icons";
import { JsonLd } from "@/components/json-ld";
import { SiteFooter } from "@/components/site-footer";
import {
  blogHref,
  blogMarkdownHref,
  formatBlogDate,
  getBlogPost,
  getBlogPosts,
} from "@/lib/devblog";
import { blogPostingNode, breadcrumbNode, jsonLdGraph, pageMetadata } from "@/lib/seo";
import { site } from "@/lib/site";

/** Only committed posts exist; anything else is a static 404. */
export const dynamicParams = false;

export async function generateStaticParams() {
  const posts = await getBlogPosts();
  return posts.map((post) => ({ slug: post.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const post = await getBlogPost(slug);
  if (!post) {
    return pageMetadata({
      title: "Post not found",
      description: "This devblog post does not exist.",
      path: `/devblog/${slug}`,
    });
  }

  return pageMetadata({
    title: post.title,
    description: post.description,
    path: blogHref(slug),
    type: "article",
    markdownPath: blogMarkdownHref(slug),
    publishedTime: post.date,
  });
}

export default async function DevblogPostPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const [post, posts] = await Promise.all([getBlogPost(slug), getBlogPosts()]);
  if (!post) notFound();

  const index = posts.findIndex((entry) => entry.slug === slug);
  const newer = index > 0 ? posts[index - 1] : null;
  const older = index >= 0 && index < posts.length - 1 ? posts[index + 1] : null;

  return (
    <>
      <main id="main">
        <article className="section blog-post">
          <div className="section-inner blog-post-inner">
            <header className="blog-post-head">
              <p className="blog-back">
                <Link href="/devblog">{"// BACK TO DEVBLOG"}</Link>
              </p>
              <Eyebrow>UNDER THE HOOD</Eyebrow>
              <h1 className="page-title blog-post-title">{post.title}</h1>
              <p className="section-lead">{post.description}</p>
              <div className="blog-post-meta">
                <time className="blog-date" dateTime={post.date}>
                  {formatBlogDate(post.date)}
                </time>
                <span className="blog-read">{post.readingMinutes} MIN READ</span>
                {post.tags.map((tag) => (
                  <span key={tag} className="blog-tag">
                    <span>{tag}</span>
                  </span>
                ))}
                <a className="blog-md-link" href={blogMarkdownHref(slug)}>
                  MARKDOWN
                </a>
              </div>
            </header>

            <div className="dx-prose blog-prose" dangerouslySetInnerHTML={{ __html: post.html }} />

            <aside className="blog-cta">
              <div>
                <p className="blog-cta-kicker">FOLLOW THE BUILD</p>
                <p className="blog-cta-text">
                  A post like this lands every working day. The short versions hit Discord first —
                  and when the alpha opens its doors, that&apos;s where it will be announced.
                </p>
              </div>
              <div className="blog-cta-actions">
                {site.links.discord ? (
                  <a
                    className="btn btn-discord"
                    href={site.links.discord}
                    target="_blank"
                    rel="noreferrer noopener"
                  >
                    <DiscordIcon size={16} />
                    Join our Discord
                  </a>
                ) : null}
                <a className="btn btn-ghost" href="/devblog/rss.xml">
                  RSS FEED
                </a>
              </div>
            </aside>

            <nav className="blog-pager" aria-label="More posts">
              {older ? (
                <Link className="blog-pager-link" href={blogHref(older.slug)} rel="prev">
                  <span className="blog-pager-label">← OLDER</span>
                  {older.title}
                </Link>
              ) : (
                <span />
              )}
              {newer ? (
                <Link
                  className="blog-pager-link blog-pager-next"
                  href={blogHref(newer.slug)}
                  rel="next"
                >
                  <span className="blog-pager-label">NEWER →</span>
                  {newer.title}
                </Link>
              ) : (
                <span />
              )}
            </nav>
          </div>
        </article>
      </main>

      <SiteFooter fineprint="Pre-alpha. Development is documented as it happens." />

      <JsonLd
        data={jsonLdGraph(
          blogPostingNode({
            headline: post.title,
            description: post.description,
            path: blogHref(slug),
            datePublished: post.date,
            keywords: post.tags,
            wordCount: post.wordCount,
          }),
          breadcrumbNode([
            { name: "Home", path: "/" },
            { name: "Devblog", path: "/devblog" },
            { name: post.title, path: blogHref(slug) },
          ]),
        )}
      />
    </>
  );
}
