import Link from "next/link";
import { notFound } from "next/navigation";

import { BlogCover } from "@/components/devblog/blog-cover";
import { rss } from "@/components/devblog/glyphs";
import { PostToc } from "@/components/devblog/post-toc";
import { PostTools } from "@/components/devblog/post-tools";
import { JsonLd } from "@/components/json-ld";
import { Button } from "@/components/ui/button";
import { Chip } from "@/components/ui/chip";
import { Icon } from "@/components/ui/icon";
import { arrowLeft02, arrowRight02, arrowUpRight01, discord, sourceCode } from "@/components/ui/icons";
import { Page } from "@/components/ui/page";
import { Panel } from "@/components/ui/panel";
import { Prose } from "@/components/ui/prose";
import { Display, Eyebrow, Lead } from "@/components/ui/typography";
import { blogHref, blogMarkdownHref, formatBlogDate, getBlogPost, getBlogPosts } from "@/lib/devblog";
import { postTopics } from "@/lib/devblog-presentation";
import { blogPostingNode, breadcrumbNode, jsonLdGraph, pageMetadata } from "@/lib/seo";
import { site } from "@/lib/site";

import styles from "@/components/devblog/post.module.css";

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
  const issue = index >= 0 ? posts.length - index : undefined;
  const topics = postTopics(post);

  return (
    <>
      <Page tone="red">
        <article className={styles.article} data-devblog="article">
          <header className={styles.head}>
            <div className={styles.headCopy}>
              <p className={styles.crumbs}>
                <Link href="/devblog" className={styles.back} data-devblog="back">
                  <Icon glyph={arrowLeft02} />
                  Devblog
                </Link>
                <span className={styles.separator} aria-hidden="true">
                  {"//"}
                </span>
                <span>{issue !== undefined ? `No.${String(issue).padStart(3, "0")}` : "Post"}</span>
              </p>
              {/* An article title names the post; the post itself starts in the first screen. */}
              <Display as="h1" size={post.title.length > 18 ? "md" : "lg"} className={styles.title}>
                {post.title}
              </Display>
              <Lead className={styles.lead}>{post.description}</Lead>
              <div className={styles.facts}>
                <div className={styles.meta}>
                  <time dateTime={post.date}>{formatBlogDate(post.date)}</time>
                  <span>{post.readingMinutes} min read</span>
                  <span>OPEN//77 team</span>
                </div>
                <ul className={styles.topics} aria-label="Topics">
                  {topics.map((topic) => (
                    <li key={topic.id}>
                      <Chip size="sm" href={`/devblog?topic=${topic.id}`}>
                        {topic.label}
                      </Chip>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
            <BlogCover post={post} issue={issue} variant="article" className={styles.cover} />
          </header>

          <div className={styles.layout}>
            <div className={styles.body}>
              {post.headings.length > 0 ? (
                <details className={styles.mobileToc} data-devblog="mobile-toc">
                  <summary>
                    <span>In this article</span>
                    <span className={styles.toggle} aria-hidden="true" />
                  </summary>
                  <nav aria-label="In this article (mobile)">
                    <ol>
                      {post.headings.map((heading) => (
                        <li key={heading.id}>
                          <a href={`#${heading.id}`}>{heading.title}</a>
                        </li>
                      ))}
                    </ol>
                  </nav>
                </details>
              ) : null}

              <div data-devblog="prose">
                <Prose html={post.html} className={styles.prose} />
              </div>

              <p className={styles.signoff} aria-hidden="true">
                {"// END.OF.TRANSMISSION"}
              </p>

              <Panel as="aside" brackets padding="lg" className={styles.cta} aria-label="Follow the build">
                <div className={styles.ctaCopy}>
                  <Eyebrow>{"// Follow the build"}</Eyebrow>
                  <Display size="sm" as="h2">
                    A post like this lands every working day.
                  </Display>
                  <p>The short versions hit Discord first. It is also where you share Alpha feedback and reproducible issues with the team.</p>
                </div>
                <div className={styles.ctaActions}>
                  {site.links.discord ? (
                    <Button color="red" lines="left" icon={discord} iconPosition="left" href={site.links.discord}>
                      Join our Discord
                    </Button>
                  ) : null}
                  <Button color="red" border lines="none" icon={rss} iconPosition="left" href="/devblog/rss.xml">
                    RSS feed
                  </Button>
                </div>
              </Panel>

              <nav className={styles.pager} aria-label="More posts">
                {older ? (
                  <Link className={styles.pagerLink} href={blogHref(older.slug)} rel="prev">
                    <span className={styles.pagerLabel}>
                      <Icon glyph={arrowLeft02} /> Older post
                    </span>
                    <span className={styles.pagerTitle}>{older.title}</span>
                    <span className={styles.pagerDate}>{formatBlogDate(older.date)}</span>
                  </Link>
                ) : (
                  <span />
                )}
                {newer ? (
                  <Link className={styles.pagerLink} data-next href={blogHref(newer.slug)} rel="next">
                    <span className={styles.pagerLabel}>
                      Newer post <Icon glyph={arrowRight02} />
                    </span>
                    <span className={styles.pagerTitle}>{newer.title}</span>
                    <span className={styles.pagerDate}>{formatBlogDate(newer.date)}</span>
                  </Link>
                ) : (
                  <span />
                )}
              </nav>
            </div>

            <aside className={styles.tools} aria-label="Article tools">
              <div className={styles.toolsInner}>
                {post.headings.length > 0 ? <PostToc headings={post.headings} /> : null}
                <div className={styles.share}>
                  <h2 className={styles.toolsLabel}>
                    <span aria-hidden="true">{"// "}</span>Share &amp; formats
                  </h2>
                  <PostTools key={slug} />
                  <a className={styles.toolLink} href={blogMarkdownHref(slug)}>
                    <Icon glyph={sourceCode} />
                    Read as Markdown
                  </a>
                  <a className={styles.toolLink} href="/devblog/rss.xml">
                    <Icon glyph={rss} />
                    Subscribe via RSS
                  </a>
                  <Link className={styles.toolLink} href="/docs">
                    <Icon glyph={arrowUpRight01} />
                    Explore the documentation
                  </Link>
                </div>
              </div>
            </aside>
          </div>
        </article>
      </Page>

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
