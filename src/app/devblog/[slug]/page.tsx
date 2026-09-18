import Link from "next/link";
import { notFound } from "next/navigation";

import { ArrowLeftIcon, ArrowRightIcon, DiscordIcon } from "@/components/icons";
import { PostTools } from "@/components/devblog/post-tools";
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
import { postTopics } from "@/lib/devblog-presentation";

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
      <main id="main" className="blog-surface blog-article-surface">
        <article className="blog-post">
          <div className="blog-article-hero">
            <header className="blog-post-head">
              <Link href="/devblog" className="blog-back"><ArrowLeftIcon />Back to devblog</Link>
              <p className="blog-kicker"><span aria-hidden="true">{"//"}</span> DEVELOPMENT NOTES</p>
              <h1>{post.title}</h1>
              <p className="blog-post-description">{post.description}</p>
              <div className="blog-meta blog-post-meta">
                <time dateTime={post.date}>
                  {formatBlogDate(post.date)}
                </time>
                <span>{post.readingMinutes} min read</span>
                <span>Open//77 team</span>
                <span className="blog-topics">{postTopics(post).map(topic => <Link href={`/devblog?topic=${topic.id}`} key={topic.id}>{topic.label}</Link>)}</span>
              </div>
            </header>
          </div>
          <div className="blog-article-layout">
            <div className="blog-article-body">
              {post.headings.length > 0 && <details className="blog-mobile-toc"><summary>In this article</summary><nav aria-label="In this article (mobile)"><ol>{post.headings.map(heading => <li key={heading.id}><a href={`#${heading.id}`}>{heading.title}</a></li>)}</ol></nav></details>}
              <div className="dx-prose blog-prose" dangerouslySetInnerHTML={{ __html: post.html }} />

            <aside className="blog-cta">
              <div>
                <p className="blog-kicker">THE NEXT CHAPTER</p>
                <h2>Help shape what comes next.</h2>
                <p>Follow the updates, meet other builders and share your Alpha feedback with the team.</p>
              </div>
              <div className="blog-cta-actions">
                {site.links.discord ? (
                  <a
                    className="blog-button blog-button-discord"
                    href={site.links.discord}
                    target="_blank"
                    rel="noreferrer noopener"
                  >
                    <DiscordIcon size={16} />
                    Join our Discord
                  </a>
                ) : null}
                <a className="blog-button" href="/devblog/rss.xml">
                  RSS feed
                </a>
              </div>
            </aside>

            <nav className="blog-pager" aria-label="More posts">
              {older ? (
                <Link className="blog-pager-link" href={blogHref(older.slug)} rel="prev">
                  <span className="blog-pager-label"><ArrowLeftIcon /> Older update</span>
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
                  <span className="blog-pager-label">Newer update <ArrowRightIcon /></span>
                  {newer.title}
                </Link>
              ) : (
                <span />
              )}
            </nav>
            </div>
            <aside className="blog-article-tools" aria-label="Article tools">
              {post.headings.length > 0 && <nav className="blog-side-panel blog-toc" aria-label="In this article"><h2 className="blog-kicker"><span aria-hidden="true">{"//"}</span> IN THIS ARTICLE</h2><ol>{post.headings.map(heading => <li key={heading.id}><a href={`#${heading.id}`}>{heading.title}</a></li>)}</ol></nav>}
              <div className="blog-side-panel blog-share"><p className="blog-kicker">TAKE IT WITH YOU</p><PostTools key={slug} /><a className="blog-text-link" href={blogMarkdownHref(slug)}>Read as Markdown <ArrowRightIcon /></a><Link className="blog-text-link" href="/docs">Explore the documentation <ArrowRightIcon /></Link></div>
            </aside>
          </div>
        </article>
      </main>

      <SiteFooter tone="dark" />

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
