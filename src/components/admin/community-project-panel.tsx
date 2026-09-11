"use client";

import Link from "next/link";
import { useCallback, useState } from "react";
import { useSession } from "@/lib/account/session";
import * as api from "@/lib/community/client-api";
import { useAdminData } from "./use-admin-data";
import { ProjectModerationControls, ReleaseRevocationControls } from "./community-moderation-controls";
import { PrivateMediaPreview } from "@/components/community/private-media-preview";
import { DownloadButton } from "@/components/community/download-button";

export function CommunityProjectPanel({ id }: { id: string }) {
  const { session } = useSession();
  const [cursor, setCursor] = useState<string>();
  const load = useCallback(async (token: string) => {
    const signal = AbortSignal.timeout(15000);
    const [project, releases] = await Promise.all([api.myProject(token, id, signal), api.myReleases(token, id, cursor, signal)]);
    return { project, releases };
  }, [id, cursor]);
  const result = useAdminData(load);
  if (!session) return null;
  if (result.error) return <p className="hub-notice" role="alert">{result.error}<button className="btn btn-ghost" onClick={result.reload}>Retry</button></p>;
  if (!result.data) return <p role="status">Loading project…</p>;
  const { project, releases } = result.data;
  return <div className="hub-review-panel"><Link href="/admin/resources">← Review queue</Link><h2>{project.content.title}</h2>
    <p>Current draft revision {project.revision} · {project.revisionStatus} · {project.state}</p>
    <p>{project.content.summary}</p><pre className="hub-review-text">{project.content.description}</pre>
    <div className="hub-media-editor">{project.content.media?.map(image => <PrivateMediaPreview key={image.mediaId} token={session.token} mediaId={image.mediaId} alt={image.altText} />)}</div>
    <ProjectModerationControls token={session.token} projectId={id} updated={result.reload} />
    <h3>Release history</h3><div className="hub-releases">{releases.items.map(release => <article className="hub-release" key={`${release.releaseId}-${release.revision}`}>
      <h4>Version {release.version} · {release.state}</h4><pre className="hub-review-text">{release.metadata.changelog}</pre>
      {release.sha256 && <p className="hub-release-digest">SHA-256 <code>{release.sha256}</code></p>}
      {release.inspection != null && <><DownloadButton releaseId={release.releaseId} version={release.version} review={{ token: session.token, revision: release.revision }} />
        <details><summary>Inspection snapshot</summary><pre className="hub-review-text">{JSON.stringify(release.inspection, null, 2)}</pre></details></>}
      <ReleaseRevocationControls token={session.token} release={release} updated={result.reload} />
    </article>)}</div>
    <nav className="hub-actions" aria-label="Project release pages">{cursor && <button className="btn btn-ghost" onClick={() => setCursor(undefined)}>Newest releases</button>}
      {releases.nextCursor && <button className="btn btn-ghost" onClick={() => setCursor(releases.nextCursor ?? undefined)}>Older releases</button>}</nav>
  </div>;
}
