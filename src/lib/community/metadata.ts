import "server-only";
import type { Metadata } from "next";
import { getMedia } from "./public-api";

export async function withCommunityImage(metadata: Metadata, mediaId: string | undefined | null, alt: string): Promise<Metadata> {
  if (!mediaId) return metadata;
  const media = await getMedia(mediaId).catch(() => null);
  const cover = media?.derivatives.find(item => item.name === "gallery") ?? media?.derivatives.find(item => item.name === "card");
  if (!cover) return metadata;
  return { ...metadata, openGraph: { ...metadata.openGraph, images: [{ url: cover.url, width: cover.width, height: cover.height, alt }] },
    twitter: { ...metadata.twitter, card: "summary_large_image", images: [{ url: cover.url, alt }] } };
}
