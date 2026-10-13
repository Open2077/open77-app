import { getMedia } from "@/lib/community/public-api";
import type { CommunityContent } from "@/lib/community/types";
import { MediaLightbox } from "./media-lightbox";

import styles from "./media-gallery.module.css";

/** Screenshots with a lightbox, led by the hover clip when the creation has one. */
export async function MediaGallery({ media, clipMediaId }: { media: NonNullable<CommunityContent["media"]>; clipMediaId?: string | null }) {
  const [clip, images] = await Promise.all([
    clipMediaId ? getMedia(clipMediaId).catch(() => null) : Promise.resolve(null),
    Promise.all(media.map(async reference => {
      const info = await getMedia(reference.mediaId).catch(() => null);
      return { reference, gallery: info?.derivatives.find(item => item.name === "gallery"), full: info?.derivatives.find(item => item.name === "full") };
    })),
  ]);
  const video = clip?.derivatives.find(item => item.name === "clip");
  const poster = clip?.derivatives.find(item => item.name === "poster");
  if (!images.length && !video) return null;
  // Worker derivatives retain authorization at the asset origin; the client
  // lightbox does not proxy them through Next's image optimizer.
  return <section className={styles.stage} aria-label="Media" data-media-stage>
    {video ? (
      <figure className={styles.clip}>
        <div className={styles.player}>
          <video src={video.url} poster={poster?.url} controls muted loop playsInline preload="metadata" width={video.width} height={video.height} aria-label="Preview clip" />
        </div>
        <figcaption className={styles.caption}><span>{"//"}</span> Preview clip · muted</figcaption>
      </figure>
    ) : null}
    {images.length > 0 ? <MediaLightbox images={images} lead={!video} /> : null}
  </section>;
}
