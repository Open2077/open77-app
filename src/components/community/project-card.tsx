import Link from "next/link";
import { categories, categoryLabel, type CommunityProject } from "@/lib/community/types";
export function ProjectCard({ project }: { project: CommunityProject }) {
  const { content } = project;
  return <article className="hub-card">
    <Link className="hub-card-art" href={`/resources/${project.slug}`} tabIndex={-1} aria-hidden="true">
      <span>{categories.find(category => category.id === content.category)?.mark ?? "//"}</span><small>{categoryLabel(content.category)}</small>
    </Link><div className="hub-card-body">
      <div className="hub-card-labels"><span>{categoryLabel(content.category)}</span><span>{content.kind === "showcase" ? "Showcase" : "Resource"}</span></div>
      <h3><Link href={`/resources/${project.slug}`}>{content.title}</Link></h3><p>{content.summary}</p>
      <div className="hub-tags">{content.tags.map(tag => <span key={tag}>{tag}</span>)}</div>
    </div></article>;
}
