import { getMedia } from "@/lib/community/public-api";
import type { CommunityContent } from "@/lib/community/types";
import { MediaLightbox } from "./media-lightbox";

export async function MediaGallery({ media }: { media: NonNullable<CommunityContent["media"]> }) {
  const images = await Promise.all(media.map(async reference => {
    const info = await getMedia(reference.mediaId).catch(() => null);
    return { reference, gallery: info?.derivatives.find(item => item.name === "gallery"), full: info?.derivatives.find(item => item.name === "full") };
  }));
  if (!images.length) return null;
  // Worker derivatives retain authorization at the asset origin; the client
  // lightbox does not proxy them through Next's image optimizer.
  return <MediaLightbox images={images} />;
}
