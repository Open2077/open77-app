import Link from "next/link";
import { notFound } from "next/navigation";

import { Eyebrow } from "@/components/brand";
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
              <nav className="dx-crumbs" aria-label="Breadcrumb">
                <span>
                  <Link href="/devblog">Devblog</Link>
                </span>
                <span>
                  <span className="dx-crumbs-sep">/</span> {formatBlogDate(post.date)}
                </span>
              </nav>
              <Eyebrow>UNDER THE HOOD</Eyebrow>
              <h1 className="page-title blog-post-title">{post.title}</h1>
              <p className="section-lead">{post.description}</p>
              <div className="dx-meta">
                <time dateTime={post.date}>{formatBlogDate(post.date)}</time>
                <span>{post.readingMinutes} min read</span>
                <a href={blogMarkdownHref(slug)}>Markdown</a>
              </div>
              {post.tags.length > 0 ? (
                <p className="blog-tags">
                  {post.tags.map((tag) => (
                    <span key={tag} className="blog-tag">
                      {tag}
                    </span>
                  ))}
                </p>
              ) : null}
            </header>

            <div className="dx-prose" dangerouslySetInnerHTML={{ __html: post.html }} />

            <nav className="blog-pager" aria-label="More posts">
              {older ? (
                <Link className="blog-pager-link" href={blogHref(older.slug)} rel="prev">
                  <span className="blog-pager-label">Older</span>
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
                  <span className="blog-pager-label">Newer</span>
                  {newer.title}
                </Link>
              ) : null}
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
