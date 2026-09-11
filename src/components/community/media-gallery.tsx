import Image from "next/image";
import { getMedia } from "@/lib/community/public-api";
import type { CommunityContent } from "@/lib/community/types";

export async function MediaGallery({ media }: { media: NonNullable<CommunityContent["media"]> }) {
  const images = await Promise.all(media.map(async reference => {
    const info = await getMedia(reference.mediaId).catch(() => null);
    return { reference, gallery: info?.derivatives.find(item => item.name === "gallery"), full: info?.derivatives.find(item => item.name === "full") };
  }));
  if (!images.length) return null;
  return <section className="hub-media-gallery" aria-label="Project screenshots">
    {images.map(({ reference, gallery, full }, index) => <figure key={reference.mediaId}>
      {gallery ? <a href={full?.url ?? gallery.url} target="_blank" rel="noopener noreferrer" aria-label={`Open full screenshot: ${reference.altText}`}>
        {/* Already processed by the Hub worker. Keep delivery authorization at the asset origin; do not cache through Next's optimizer. */}
        <Image unoptimized src={gallery.url} width={gallery.width} height={gallery.height} alt={reference.altText}
          loading={index === 0 ? "eager" : "lazy"} referrerPolicy="no-referrer" />
      </a> : <div className="hub-media-unavailable">Screenshot temporarily unavailable</div>}
      {reference.caption && <figcaption>{reference.caption}</figcaption>}
    </figure>)}
  </section>;
}
