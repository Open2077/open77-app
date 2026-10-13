import { getMedia } from "@/lib/community/public-api";
import type { CommunityProject } from "@/lib/community/types";
import { WorkshopCard } from "./workshop-card";

/**
 * One creation in a server-rendered list, media first: the cover carries the
 * identity and the hover clip or screenshots take over under the pointer.
 * `wide` is the featured variant; `rank` numbers a ranked shelf.
 */
export async function ProjectCard({ project, wide = false, rank, eager = false }: { project: CommunityProject; wide?: boolean; rank?: number; eager?: boolean }) {
  const { content } = project;
  const reference = content.media?.[0];
  const [image, clip] = await Promise.all([
    reference ? getMedia(reference.mediaId).catch(() => null) : null,
    !reference && content.clipMediaId ? getMedia(content.clipMediaId).catch(() => null) : null,
  ]);
  const cover = image?.derivatives.find(item => item.name === (wide ? "gallery" : "card"))?.url
    ?? clip?.derivatives.find(item => item.name === "poster")?.url
    ?? null;
  return <WorkshopCard project={project} cover={cover} variant={wide ? "feature" : "tile"} rank={rank} eager={eager || wide} />;
}
