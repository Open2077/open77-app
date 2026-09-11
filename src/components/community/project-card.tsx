import Link from "next/link";
import Image from "next/image";
import { getMedia } from "@/lib/community/public-api";
import { categories, categoryLabel, type CommunityProject } from "@/lib/community/types";
export async function ProjectCard({ project }: { project: CommunityProject }) {
  const { content } = project;
  const reference = content.media?.[0];
  const cover = reference ? (await getMedia(reference.mediaId).catch(() => null))?.derivatives.find(item => item.name === "card") : null;
  return <article className="hub-card">
    <Link className="hub-card-art" href={`/resources/${project.slug}`} tabIndex={-1} aria-hidden="true">
      {cover ? <Image unoptimized src={cover.url} width={cover.width} height={cover.height} alt="" loading="lazy" referrerPolicy="no-referrer" /> :
        <><span>{categories.find(category => category.id === content.category)?.mark ?? "//"}</span><small>{categoryLabel(content.category)}</small></>}
    </Link><div className="hub-card-body">
      <div className="hub-card-labels"><span>{categoryLabel(content.category)}</span><span>{content.kind === "showcase" ? "Showcase" : "Resource"}</span></div>
      <h3><Link href={`/resources/${project.slug}`}>{content.title}</Link></h3><p>{content.summary}</p>
      <div className="hub-tags">{content.tags.map(tag => <span key={tag}>{tag}</span>)}</div>
    </div></article>;
}
