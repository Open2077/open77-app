import { Tag } from "@/components/ui/chip";
import { EmptyState, Notice } from "@/components/ui/feedback";
import { Prose } from "@/components/ui/prose";
import { Eyebrow } from "@/components/ui/typography";
import { communityMarkdown } from "@/lib/community/markdown";
import type { CommunityRelease } from "@/lib/community/types";
import { safeHttpUrl } from "@/components/admin/format";
import { DownloadButton } from "./download-button";
import { ReportForm } from "./report-form";
import { ReleaseFiles } from "./release-files";

import styles from "./release-list.module.css";

function bytes(value: number) { return value < 1024 * 1024 ? `${Math.ceil(value / 1024)} KiB` : `${(value / (1024 * 1024)).toFixed(1)} MiB`; }
const day = (iso: string) => new Date(iso).toLocaleDateString("en-GB", { dateStyle: "medium", timeZone: "UTC" });

async function ReleaseCard({ release, downloadable }: { release: CommunityRelease; downloadable: boolean }) {
  const changelog = await communityMarkdown(release.metadata.changelog);
  const installation = await communityMarkdown(release.metadata.installation);
  const license = await communityMarkdown(release.metadata.license);
  const revoked = release.state === "revoked";
  const builds = [...new Set(release.metadata.testedBuilds)];
  return (
    <article className={styles.release} id={`release-${release.releaseId}`} data-release data-channel={release.channel} data-state={release.state}>
      <span className={styles.node} aria-hidden="true" />
      <div className={styles.card}>
        <header className={styles.head}>
          <div className={styles.headCopy}>
            <Eyebrow muted={release.channel !== "stable"}>{release.channel === "stable" ? "Stable release" : "Prerelease"}</Eyebrow>
            <h3 className={styles.version}>Version <span>{release.version}</span></h3>
            <p className={styles.meta}>
              {release.publishedAtUtc ? <time dateTime={release.publishedAtUtc}>{day(release.publishedAtUtc)}</time> : null}
              {release.sizeBytes != null ? <span>{bytes(release.sizeBytes)}</span> : null}
            </p>
          </div>
          <Tag tone={revoked ? "red" : release.state === "published" ? "blue" : "neutral"} variant={release.state === "published" ? "outline" : "solid"}>{release.state}</Tag>
        </header>
        {revoked ? <Notice kind="danger">This release has been withdrawn and cannot be downloaded. Choose another published version.</Notice> :
          downloadable && release.state === "published" ? <DownloadButton releaseId={release.releaseId} version={release.version} compact /> : null}
        <Prose className={styles.notes} size="sm" html={changelog} />
        <div className={styles.compat}>
          <h4 className={styles.compatTitle}>Compatibility</h4>
          <p className={styles.text}>{builds.length ? "Author-declared tested Open77 builds:" : "The author has not listed tested Open77 builds."}</p>
          {builds.length ? <div className={styles.builds}>{builds.map(build => <Tag key={build} tone="neutral">{build}</Tag>)}</div> : null}
          {release.metadata.requiredResources.length > 0 ? <p className={styles.text}>Required resources: {release.metadata.requiredResources.join(", ")}</p> : null}
          {release.resources.some(resource => resource.manifest.preloadMods.length > 0) ? <Notice kind="warning">Includes preload assets. Follow the author’s server and game restart instructions before connecting.</Notice> : null}
        </div>
        <details className={styles.more}>
          <summary>Installation, included resources and license</summary>
          <div className={styles.moreBody}>
            <Prose className={styles.notes} size="sm" html={installation} />
            <ul className={styles.resources}>{release.resources.map(resource => (
              <li key={resource.name}>
                <span className={styles.resourceName}>{resource.name} <span>· {resource.manifest.version}</span></span>
                <p className={styles.text}>Open77 requirement: {resource.manifest.open77Version}</p>
                {resource.manifest.dependencies.length > 0 ? <p className={styles.text}>Dependencies: {resource.manifest.dependencies.join(", ")}</p> : null}
                {resource.manifest.permissions.length > 0 ? <p className={styles.text}>Requested permissions: {resource.manifest.permissions.join(", ")}</p> : null}
              </li>
            ))}</ul>
            <Prose className={styles.notes} size="sm" html={license} />
            {release.sha256 ? <p className={styles.digest}>SHA-256 <code>{release.sha256}</code></p> : null}
            {release.source ? (
              <Notice kind="info" title="Imported source">
                <span className={styles.source}>
                  <span>{safeHttpUrl(release.source.sourceUrl) ? <a href={safeHttpUrl(release.source.sourceUrl)!} target="_blank" rel="noopener noreferrer nofollow ugc">Original GitHub release ↗</a> : "Original GitHub release"} · Asset {release.source.assetId}</span>
                  <span>Fetched <time dateTime={release.source.fetchedAtUtc}>{day(release.source.fetchedAtUtc)}</time>. This Workshop release contains the pinned bytes shown above.</span>
                  {release.source.commitSha ? <span className={styles.digest}>Commit <code>{release.source.commitSha}</code></span> : null}
                  <span>{release.source.repositoryControlVerified ? "Repository control was verified for this import." : "Repository control was not verified. The publisher confirmed permission to redistribute these files."}</span>
                </span>
              </Notice>
            ) : null}
          </div>
        </details>
        <div className={styles.foot}>
          <ReleaseFiles releaseId={release.releaseId} />
          <ReportForm targetType="release" targetId={release.releaseId} />
        </div>
      </div>
    </article>
  );
}

export function ReleaseList({ releases, downloadable = true }: { releases: CommunityRelease[]; downloadable?: boolean }) {
  const stable = releases.filter(release => release.channel === "stable");
  const prerelease = releases.filter(release => release.channel === "prerelease");
  return (
    <div className={styles.releases} data-release-list>
      {stable.map(release => <ReleaseCard key={release.releaseId} release={release} downloadable={downloadable} />)}
      {prerelease.length > 0 ? (
        <details className={styles.pre}>
          <summary>Show prerelease versions ({prerelease.length})</summary>
          <Notice kind="warning">Prereleases may introduce breaking changes. Review compatibility before installing.</Notice>
          <div className={styles.releases}>{prerelease.map(release => <ReleaseCard key={release.releaseId} release={release} downloadable={downloadable} />)}</div>
        </details>
      ) : null}
      {releases.length === 0 ? (
        <EmptyState eyebrow="Releases" title="No public releases yet">
          The creator has not published a downloadable version. Follow the creation to hear about its first release.
        </EmptyState>
      ) : null}
    </div>
  );
}
