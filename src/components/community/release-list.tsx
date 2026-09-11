import { communityMarkdown } from "@/lib/community/markdown";
import type { CommunityRelease } from "@/lib/community/types";
import { DownloadButton } from "./download-button";
import { ReportForm } from "./report-form";
import { ReleaseFiles } from "./release-files";

function bytes(value: number) { return value < 1024 * 1024 ? `${Math.ceil(value / 1024)} KiB` : `${(value / (1024 * 1024)).toFixed(1)} MiB`; }

async function ReleaseCard({ release, downloadable }: { release: CommunityRelease; downloadable: boolean }) {
  const changelog = await communityMarkdown(release.metadata.changelog);
  const installation = await communityMarkdown(release.metadata.installation);
  const license = await communityMarkdown(release.metadata.license);
  return <article className="hub-release" id={`release-${release.releaseId}`}>
    <div className="hub-release-heading"><div><p className="hub-kicker">{release.channel === "stable" ? "STABLE RELEASE" : "PRERELEASE"}</p>
      <h2>Version {release.version}</h2></div><span className={`hub-release-state${release.state === "revoked" ? " is-revoked" : ""}`}>{release.state}</span></div>
    <p className="hub-release-meta">{release.publishedAtUtc && <time dateTime={release.publishedAtUtc}>{new Date(release.publishedAtUtc).toLocaleDateString("en-GB", { dateStyle: "medium", timeZone: "UTC" })}</time>}
      {release.sizeBytes != null && <> · {bytes(release.sizeBytes)}</>}</p>
    {release.state === "revoked" ? <p className="hub-notice" role="status">This release has been withdrawn and cannot be downloaded. Choose another published version.</p> :
      downloadable && release.state === "published" && <DownloadButton releaseId={release.releaseId} version={release.version} />}
    <div className="hub-prose" dangerouslySetInnerHTML={{ __html: changelog }} />
    <div className="hub-release-requirements"><h3>Compatibility</h3>
      <p>{release.metadata.testedBuilds.length ? "Author-declared tested Open77 builds:" : "The author has not listed tested Open77 builds."}</p>
      <div className="hub-tags">{[...new Set(release.metadata.testedBuilds)].map(build => <span key={build}>{build}</span>)}</div>
      {release.metadata.requiredResources.length > 0 && <p>Required resources: {release.metadata.requiredResources.join(", ")}</p>}
      {release.resources.some(resource => resource.manifest.preloadMods.length > 0) && <p className="hub-notice">Includes preload assets. Follow the author’s server and game restart instructions before connecting.</p>}
    </div>
    <details><summary>Installation, included resources and license</summary>
      <div className="hub-prose" dangerouslySetInnerHTML={{ __html: installation }} />
      <ul className="hub-release-resources">{release.resources.map(resource => <li key={resource.name}>
        <strong>{resource.name}</strong> · {resource.manifest.version}<p>Open77 requirement: {resource.manifest.open77Version}</p>
        {resource.manifest.dependencies.length > 0 && <p>Dependencies: {resource.manifest.dependencies.join(", ")}</p>}
        {resource.manifest.permissions.length > 0 && <p>Requested permissions: {resource.manifest.permissions.join(", ")}</p>}
      </li>)}</ul>
      <div className="hub-prose" dangerouslySetInnerHTML={{ __html: license }} />
      {release.sha256 && <p className="hub-release-digest">SHA-256 <code>{release.sha256}</code></p>}
      {release.source && <div className="hub-notice"><h3>Imported source</h3>
        <p><a href={release.source.sourceUrl} target="_blank" rel="noopener noreferrer">Original GitHub release ↗</a> · Asset {release.source.assetId}</p>
        <p>Fetched <time dateTime={release.source.fetchedAtUtc}>{new Date(release.source.fetchedAtUtc).toLocaleDateString("en-GB", { dateStyle: "medium", timeZone: "UTC" })}</time>. This Hub release contains the pinned bytes shown above.</p>
        {release.source.commitSha && <p className="hub-release-digest">Commit <code>{release.source.commitSha}</code></p>}
        <p>{release.source.repositoryControlVerified ? "Repository control was verified for this import." : "Repository control was not verified. The publisher confirmed permission to redistribute these files."}</p>
      </div>}
    </details>
    <ReportForm targetType="release" targetId={release.releaseId} />
    <ReleaseFiles releaseId={release.releaseId} />
  </article>;
}

export function ReleaseList({ releases, downloadable = true }: { releases: CommunityRelease[]; downloadable?: boolean }) {
  const stable = releases.filter(release => release.channel === "stable");
  const prerelease = releases.filter(release => release.channel === "prerelease");
  return <div className="hub-releases">{stable.map(release => <ReleaseCard key={release.releaseId} release={release} downloadable={downloadable} />)}
    {prerelease.length > 0 && <details className="hub-prereleases"><summary>Show prerelease versions ({prerelease.length})</summary>
      <p className="hub-notice">Prereleases may introduce breaking changes. Review compatibility before installing.</p>
      {prerelease.map(release => <ReleaseCard key={release.releaseId} release={release} downloadable={downloadable} />)}
    </details>}
    {releases.length === 0 && <p className="hub-notice">No public releases are available yet.</p>}
  </div>;
}
