"use client";

import { useState } from "react";
import { communityVideo, type CommunityVideo } from "@/lib/community/video";

function Video({ video, index }: { video: CommunityVideo; index: number }) {
  const [loaded, setLoaded] = useState(false);
  return <article className="hub-video"><h3>Video {index + 1} · {video.provider}</h3>
    {video.embed && <div className="hub-video-frame">{loaded ? <iframe src={video.embed} title={`Project video ${index + 1} on ${video.provider}`}
      allow="encrypted-media; fullscreen; picture-in-picture" allowFullScreen referrerPolicy="strict-origin-when-cross-origin" sandbox="allow-scripts allow-same-origin allow-presentation" /> :
      <div className="hub-video-placeholder"><p>Load the {video.provider} player to watch this showcase.</p><button type="button" className="btn btn-primary" onClick={() => setLoaded(true)}>Load video</button></div>}</div>}
    <p><a href={video.source} target="_blank" rel="noopener noreferrer nofollow ugc">Watch on {video.provider} ↗</a>{loaded && " · Use this link if the embedded player is unavailable."}</p>
    {loaded && <button type="button" className="btn btn-ghost" onClick={() => setLoaded(false)}>Close player</button>}
  </article>;
}

export function ExternalVideos({ urls }: { urls: string[] }) {
  if (!urls.length) return null;
  return <section className="hub-section" aria-label="Project videos">{urls.slice(0, 2).map((source, index) => {
    const video = communityVideo(source);
    return video ? <Video key={source} video={video} index={index} /> : <p className="hub-notice" key={index}>Video {index + 1} needs a supported YouTube or Vimeo HTTPS link.</p>;
  })}</section>;
}
