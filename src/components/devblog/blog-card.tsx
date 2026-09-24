import Link from "next/link";
import { ArrowRightIcon } from "@/components/icons";
import type { BlogPostMeta } from "@/lib/devblog";
import { blogDate, postTopics } from "@/lib/devblog-presentation";

export function BlogCard({ post, featured = false, latest = false }: { post: BlogPostMeta; featured?: boolean; latest?: boolean }) {
  return <article className={`blog-card${featured ? " blog-card-featured" : ""}`} data-post-date={post.date}>
    <Link href={`/devblog/${post.slug}`} className="blog-card-link">
      <div className="blog-card-copy"><div className="blog-meta">{latest && <span className="blog-latest">Latest</span>}<time dateTime={post.date}>{blogDate(post.date)}</time><span>{post.readingMinutes} min read</span></div><h2>{post.title}</h2><p>{post.description}</p><div className="blog-card-foot"><span className="blog-topics">{postTopics(post).slice(0, 3).map(topic => <span key={topic.id}>{topic.label}</span>)}</span><span className="blog-card-arrow" aria-hidden="true"><ArrowRightIcon size={21} /></span></div></div>
    </Link>
  </article>;
}
