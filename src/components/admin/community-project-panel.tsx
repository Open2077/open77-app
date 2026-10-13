"use client";

import { useCallback, useState } from "react";

import { ActivityHistory } from "@/components/community/activity-history";
import { DownloadButton } from "@/components/community/download-button";
import { PrivateMediaPreview } from "@/components/community/private-media-preview";
import { ReleaseFiles } from "@/components/community/release-files";
import { Button } from "@/components/admin/admin-button";
import { Notice } from "@/components/ui/feedback";
import { arrowLeft01, arrowRight01, packageBox, store01 } from "@/components/ui/icons";
import { useSession } from "@/lib/account/session";
import * as api from "@/lib/community/client-api";
import { AdminPanel, Disclosure, EmptyBlock, LoadingBlock, Preformatted, StatusTag, SubHeading } from "./admin-kit";
import { CommunityEditorialControls, CommunityRankingControls } from "./community-editorial-controls";
import { ProjectModerationControls, ReleaseRevocationControls } from "./community-moderation-controls";
import { HashCell } from "./hash-cell";
import { useAdminData } from "./use-admin-data";

import styles from "./community-panels.module.css";

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
  const back = (
    <Button href="/admin/resources" size="sm" color="neutral" border lines="none" icon={arrowLeft01} iconPosition="left">
      Review queue
    </Button>
  );
  if (result.error) {
    return (
      <AdminPanel title="Project moderation" icon={store01} actions={back}>
        <Notice kind="danger" action={<Button size="sm" color="red" border lines="none" onClick={result.reload}>Retry</Button>}>
          {result.error}
        </Notice>
      </AdminPanel>
    );
  }
  if (!result.data) {
    return (
      <AdminPanel title="Project moderation" icon={store01} actions={back}>
        <LoadingBlock label="Loading project…" rows={3} />
      </AdminPanel>
    );
  }
  const { project, releases } = result.data;
  return (
    <>
      <AdminPanel
        title={project.content.title}
        icon={store01}
        brackets
        meta={`revision ${project.revision}`}
        actions={back}
      >
        <div className={styles.tags}>
          <StatusTag status={project.state === "published" ? "ok" : project.state === "suspended" ? "danger" : "neutral"}>{project.state}</StatusTag>
          <StatusTag status="neutral">{project.revisionStatus}</StatusTag>
        </div>
        <p className={styles.summary}>{project.content.summary}</p>
        <Preformatted>{project.content.description}</Preformatted>
        <div className={styles.media}>
          {project.content.media?.map(image => <PrivateMediaPreview key={image.mediaId} token={session.token} mediaId={image.mediaId} alt={image.altText} />)}
        </div>
        <section className={styles.section} aria-label="Moderation">
          <SubHeading>Moderation</SubHeading>
          <ProjectModerationControls token={session.token} projectId={id} updated={result.reload} />
          <CommunityEditorialControls key={`editorial-${id}-${session.token}`} token={session.token} projectId={id} updated={result.reload} />
          <CommunityRankingControls key={`ranking-${session.token}`} token={session.token} />
        </section>
        <ActivityHistory token={session.token} kind="project" id={id} title="Project audit history" />
      </AdminPanel>

      <AdminPanel title="Release history" icon={packageBox} level={2}>
        {releases.items.length === 0 ? <EmptyBlock icon={packageBox}>This project has no release yet.</EmptyBlock> : null}
        <div className={styles.cards}>
          {releases.items.map(release => (
            <article className={styles.card} key={`${release.releaseId}-${release.revision}`}>
              <div className={styles.cardHead}>
                <h3 className={styles.cardTitle}>Version {release.version}</h3>
                <StatusTag status={release.state === "published" ? "ok" : release.state === "revoked" ? "danger" : "neutral"}>{release.state}</StatusTag>
              </div>
              <Preformatted>{release.metadata.changelog}</Preformatted>
              {release.sha256 ? <p className={styles.digest}><span>SHA-256</span> <HashCell sha256={release.sha256} /></p> : null}
              {release.inspection != null ? (
                <>
                  <div>
                    <DownloadButton releaseId={release.releaseId} version={release.version} review={{ token: session.token, revision: release.revision }} color="red" />
                  </div>
                  <ReleaseFiles key={`${session.accountId}:${release.releaseId}`} releaseId={release.releaseId} token={session.token} />
                  <Disclosure summary="Inspection snapshot">
                    <Preformatted>{JSON.stringify(release.inspection, null, 2)}</Preformatted>
                  </Disclosure>
                </>
              ) : null}
              <ReleaseRevocationControls token={session.token} release={release} updated={result.reload} />
            </article>
          ))}
        </div>
        <nav className={styles.queueNav} aria-label="Project release pages">
          {cursor ? <Button size="sm" color="neutral" border lines="none" onClick={() => setCursor(undefined)}>Newest releases</Button> : null}
          {releases.nextCursor ? <Button size="sm" color="neutral" border lines="none" icon={arrowRight01} onClick={() => setCursor(releases.nextCursor ?? undefined)}>Older releases</Button> : null}
        </nav>
      </AdminPanel>
    </>
  );
}
