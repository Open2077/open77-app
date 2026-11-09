import { BlogFeed } from "@/components/devblog/blog-feed";
import { rss } from "@/components/devblog/glyphs";
import { JsonLd } from "@/components/json-ld";
import { Button } from "@/components/ui/button";
import { discord } from "@/components/ui/icons";
import { Page, PageHero } from "@/components/ui/page";
import { blogHref, getBlogPosts } from "@/lib/devblog";
import { blogNode, breadcrumbNode, itemListNode, jsonLdGraph, pageMetadata } from "@/lib/seo";
import { site } from "@/lib/site";

import styles from "@/components/devblog/devblog.module.css";

const DESCRIPTION = "The OPEN//77 devblog: what shipped in the Cyberpunk 2077 multiplayer mod, posted daily: replication work, dedicated server tooling, launcher and platform progress.";
export const metadata = pageMetadata({ title: "Devblog", description: DESCRIPTION, path: "/devblog" });

export default async function DevblogIndexPage() {
  const posts = await getBlogPosts();
  const latest = posts[0];
  const latestDate = latest ? new Date(`${latest.date}T00:00:00Z`) : null;
  return (
    <>
      <Page tone="red">
        <PageHero
          size="compact"
          className={styles.hero}
          eyebrow="// Under the hood · one post per working day"
          title={["Devblog."]}
          lead={
            <>
              What actually shipped, written up as it happens, <strong>straight from the commits</strong>.
            </>
          }
          art={{ src: "/assets/artwork/devblog-nightdrive-v1.webp", position: "center 45%" }}
          aside={
            <div className={styles.side}>
              <dl className={styles.facts}>
                <div className={styles.fact}>
                  <dt>Posts so far</dt>
                  <dd>{String(posts.length).padStart(2, "0")}</dd>
                </div>
                {latest && latestDate ? (
                  <div className={styles.fact}>
                    <dt>Last entry</dt>
                    <dd>
                      <time dateTime={latest.date}>
                        {latestDate.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric", timeZone: "UTC" }).toUpperCase()}
                      </time>
                    </dd>
                  </div>
                ) : null}
              </dl>
              <div className={styles.actions}>
                <Button color="red" size="sm" lines="none" icon={rss} iconPosition="left" href="/devblog/rss.xml">
                  RSS feed
                </Button>
                {site.links.discord ? (
                  <Button color="red" size="sm" border lines="none" icon={discord} iconPosition="left" href={site.links.discord}>
                    Daily on Discord
                  </Button>
                ) : null}
              </div>
            </div>
          }
        />
        <BlogFeed posts={posts} />
      </Page>
      <JsonLd
        data={jsonLdGraph(
          blogNode({ description: DESCRIPTION, path: "/devblog" }),
          itemListNode({ name: "OPEN//77 devblog posts", path: "/devblog", items: posts.map((post) => ({ name: post.title, path: blogHref(post.slug) })) }),
          breadcrumbNode([
            { name: "Home", path: "/" },
            { name: "Devblog", path: "/devblog" },
          ]),
        )}
      />
    </>
  );
}
