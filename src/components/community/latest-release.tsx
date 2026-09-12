import type { CommunityRelease } from "@/lib/community/types";
import { communityMarkdown } from "@/lib/community/markdown";
import { DownloadButton } from "./download-button";

export async function LatestRelease({ release }: { release: CommunityRelease | null }) {
  if (!release) return <section aria-label="Latest stable release"><h2>No stable release yet</h2><p>Check the version history for available prereleases and withdrawn versions.</p></section>;
  const [installation, license] = await Promise.all([communityMarkdown(release.metadata.installation), communityMarkdown(release.metadata.license)]);
  return <section aria-label="Latest stable release"><p className="hub-kicker">LATEST STABLE RELEASE</p><h2>Version {release.version}</h2>
    <p>{release.sizeBytes != null && `${(release.sizeBytes / (1024 * 1024)).toFixed(2)} MiB`}{release.publishedAtUtc && <> · <time dateTime={release.publishedAtUtc}>{new Date(release.publishedAtUtc).toLocaleDateString("en-GB", { dateStyle: "medium", timeZone: "UTC" })}</time></>}</p>
    <p>{release.metadata.testedBuilds.length ? "Author-declared tested builds:" : "No tested Open77 builds declared."}</p>
    <div className="hub-tags">{[...new Set(release.metadata.testedBuilds)].map(build => <span key={build}>{build}</span>)}</div>
    {release.metadata.requiredResources.length > 0 && <p>Required resources: {release.metadata.requiredResources.join(", ")}</p>}
    {release.resources.some(resource => resource.manifest.preloadMods.length > 0) && <p className="hub-notice">Includes preload assets. Server and game restarts may be required.</p>}
    <DownloadButton releaseId={release.releaseId} version={release.version} />
    <details><summary>Installation, dependencies, permissions and license</summary>
      <div className="hub-prose" dangerouslySetInnerHTML={{ __html: installation }} />
      <ul>{release.resources.map(resource => <li key={resource.name}><strong>{resource.name}</strong> · {resource.manifest.version}
        <p>Open77: {resource.manifest.open77Version}</p>
        {resource.manifest.dependencies.length > 0 && <p>Dependencies: {resource.manifest.dependencies.join(", ")}</p>}
        {resource.manifest.permissions.length > 0 && <p>Permissions: {resource.manifest.permissions.join(", ")}</p>}
      </li>)}</ul><div className="hub-prose" dangerouslySetInnerHTML={{ __html: license }} />
      {release.sha256 && <p className="hub-release-digest">SHA-256 <code>{release.sha256}</code></p>}
    </details>
  </section>;
}
