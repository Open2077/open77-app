import Link from "next/link";
import { DownloadIcon } from "@/components/icons";
import { getMedia } from "@/lib/community/public-api";
import { formatCount, formatDate } from "@/lib/community/format";
import { categories, categoryLabel, type CommunityProject } from "@/lib/community/types";
import { HoverArt } from "./hover-art";

/**
 * One creation in a grid, media first: the cover carries the identity and the
 * hover clip or screenshots take over under the pointer. `wide` is the
 * featured variant, image beside the copy.
 */
export async function ProjectCard({ project, wide = false }: { project: CommunityProject; wide?: boolean }) {
  const { content } = project;
  const reference = content.media?.[0];
  const derivative = wide ? "gallery" : "card";
  const cover = reference ? (await getMedia(reference.mediaId).catch(() => null))?.derivatives.find(item => item.name === derivative) ?? null : null;
  const href = `/workshop/${project.slug}`;
  const mark = categories.find(category => category.id === content.category)?.mark ?? "//";
  return <article className={`hub-card${wide ? " hub-card-wide" : ""}`}>
    <Link className="hub-card-art" href={href} tabIndex={-1} aria-hidden="true">
      <HoverArt className="hub-card-media" cover={cover} media={content.media} clipMediaId={content.clipMediaId} fallback={<span className="hub-card-mark"><span>{mark}</span></span>} />
      <span className="hub-card-badges"><span>{categoryLabel(content.category)}</span>{content.kind === "showcase" ? <span className="is-showcase">Showcase</span> : content.maturity === "stable" ? <span className="is-stable">Stable</span> : null}
        {content.clipMediaId && <span className="is-clip">▶ Clip</span>}</span>
      {!wide && <span className="hub-card-caption"><span className="hub-card-title">{content.title}</span><span className="hub-card-author">{project.creatorHandle ? `@${project.creatorHandle}` : "Community creator"}</span></span>}
    </Link>
    <div className="hub-card-body">
      {wide && <p className="hub-kicker">FEATURED CREATION</p>}
      {wide && <h3><Link href={href}>{content.title}</Link></h3>}
      {!wide && <h3 className="hub-sr-only"><Link href={href}>{content.title}</Link></h3>}
      {wide && <p className="hub-card-summary">{content.summary}</p>}
      <div className="hub-card-foot">
        {wide ? <span className="hub-card-author">{project.creatorHandle ? <Link href={`/workshop/creators/${project.creatorHandle}`}>@{project.creatorHandle}</Link> : "Community creator"}</span> : <span className="hub-card-date">{formatDate(project.updatedAtUtc)}</span>}
        <span className="hub-card-stats"><span title="Upvotes">▲ {formatCount(project.upvotes)}</span>
          {content.kind === "resource" && <span title="Downloads"><DownloadIcon size={11} /> {formatCount(project.downloads)}</span>}</span>
      </div>
      {wide && content.tags.length > 0 && <div className="hub-tags">{content.tags.map(tag => <span key={tag}>{tag}</span>)}</div>}
      {wide && <div className="hub-actions"><Link className="btn btn-primary btn-small" href={href}>{content.kind === "resource" ? "View and download" : "View showcase"}</Link></div>}
    </div>
  </article>;
}
