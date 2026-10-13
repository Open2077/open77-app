"use client";

import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Notice } from "@/components/ui/feedback";
import { Icon } from "@/components/ui/icon";
import { play, video01 } from "@/components/ui/icons";
import { communityVideo, type CommunityVideo } from "@/lib/community/video";

import styles from "./external-videos.module.css";

/** A provider player is only loaded on request: no third-party request before the click. */
function Video({ video, index }: { video: CommunityVideo; index: number }) {
  const [loaded, setLoaded] = useState(false);
  return (
    <article className={styles.video}>
      <h3 className={styles.title}><span>{"// "}Video {index + 1}</span> · {video.provider}</h3>
      {video.embed ? (
        <div className={styles.frame}>
          {loaded ? (
            <iframe src={video.embed} title={`Project video ${index + 1} on ${video.provider}`}
              allow="encrypted-media; fullscreen; picture-in-picture" allowFullScreen referrerPolicy="strict-origin-when-cross-origin" sandbox="allow-scripts allow-same-origin allow-presentation" />
          ) : (
            <div className={styles.placeholder}>
              <span className={styles.watermark} aria-hidden="true">{video.provider}</span>
              <Icon glyph={video01} className={styles.play} />
              <p className={styles.hint}>Load the {video.provider} player to watch this showcase.</p>
              <Button color="neutral" lines="none" size="sm" icon={play} iconPosition="left" onClick={() => setLoaded(true)}>Load video</Button>
            </div>
          )}
        </div>
      ) : null}
      <p className={styles.links}>
        <a href={video.source} target="_blank" rel="noopener noreferrer nofollow ugc">Watch on {video.provider} ↗</a>
        {loaded ? <span>Use this link if the embedded player is unavailable.</span> : null}
        {loaded ? <Button color="neutral" border lines="none" size="sm" onClick={() => setLoaded(false)}>Close player</Button> : null}
      </p>
    </article>
  );
}

export function ExternalVideos({ urls }: { urls: string[] }) {
  if (!urls.length) return null;
  return (
    <section className={styles.videos} aria-label="Project videos" data-external-videos>
      {urls.slice(0, 2).map((source, index) => {
        const video = communityVideo(source);
        return video ? <Video key={source} video={video} index={index} /> : (
          <Notice key={index} kind="warning" className={styles.unsupported}>Video {index + 1} needs a supported YouTube or Vimeo HTTPS link.</Notice>
        );
      })}
    </section>
  );
}
