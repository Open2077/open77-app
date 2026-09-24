export type CommunityVideo = { provider: "YouTube" | "Vimeo"; source: string; embed: string | null };

export function communityVideo(source: string): CommunityVideo | null {
  if (source.length > 2048 || /[\u0000-\u001f\u007f]/.test(source)) return null;
  let url: URL;
  try { url = new URL(source); } catch { return null; }
  if (url.protocol !== "https:" || url.username || url.password || url.port) return null;
  if (["youtube.com", "www.youtube.com", "youtu.be"].includes(url.hostname)) {
    const path = url.pathname.split("/").filter(Boolean);
    const id = url.hostname === "youtu.be" && path.length === 1 ? path[0] : url.pathname === "/watch" && url.searchParams.getAll("v").length === 1 ? url.searchParams.get("v") :
      path.length === 2 && ["embed", "shorts", "live"].includes(path[0] ?? "") ? path[1] : null;
    return { provider: "YouTube", source: url.href, embed: id && /^[a-zA-Z0-9_-]{11}$/.test(id) ? `https://www.youtube-nocookie.com/embed/${id}?autoplay=0&playsinline=1` : null };
  }
  if (["vimeo.com", "www.vimeo.com"].includes(url.hostname)) {
    const match = /^\/(\d{1,20})(?:\/([a-zA-Z0-9]{1,128}))?\/?$/.exec(url.pathname);
    const hash = url.searchParams.get("h") ?? match?.[2];
    const parameters = new URLSearchParams({ autoplay: "0", dnt: "1" });
    if (hash && /^[a-zA-Z0-9]{1,128}$/.test(hash)) parameters.set("h", hash);
    return { provider: "Vimeo", source: url.href, embed: match ? `https://player.vimeo.com/video/${match[1]}?${parameters}` : null };
  }
  return null;
}
