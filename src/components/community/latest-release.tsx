import Link from "next/link";
import type { CommunityRelease } from "@/lib/community/types";
import { communityMarkdown } from "@/lib/community/markdown";
import { formatBytes, formatDate } from "@/lib/community/format";
import { DownloadButton } from "./download-button";

/** The sidebar download box: what you get, what it needs, then the button. */
export async function LatestRelease({ release, versionsHref }: { release: CommunityRelease | null; versionsHref: string }) {
  if (!release) return <section className="hub-panel" aria-label="Latest stable release"><p className="hub-kicker">DOWNLOAD</p>
    <h2>No stable release yet</h2><p>The author has not published a stable version. Prereleases and withdrawn versions, if any, are listed in the version history.</p>
    <Link className="btn btn-ghost btn-small" href={versionsHref}>Version history</Link></section>;
  const [installation, license] = await Promise.all([communityMarkdown(release.metadata.installation), communityMarkdown(release.metadata.license)]);
  const preload = release.resources.some(resource => resource.manifest.preloadMods.length > 0);
  const permissions = [...new Set(release.resources.flatMap(resource => resource.manifest.permissions))];
  return <section className="hub-panel hub-download-panel" aria-label="Latest stable release">
    <p className="hub-kicker">DOWNLOAD · STABLE</p>
    <h2>Version {release.version}</h2>
    <dl className="hub-info">
      <div><dt>Size</dt><dd>{formatBytes(release.sizeBytes)}</dd></div>
      <div><dt>Published</dt><dd>{formatDate(release.publishedAtUtc)}</dd></div>
      <div><dt>Tested on</dt><dd>{release.metadata.testedBuilds.length ? [...new Set(release.metadata.testedBuilds)].join(", ") : "not declared"}</dd></div>
      <div><dt>Requires</dt><dd>{release.metadata.requiredResources.length ? release.metadata.requiredResources.join(", ") : "nothing else"}</dd></div>
      <div><dt>Includes</dt><dd>{release.resources.map(resource => resource.name).join(", ") || "—"}</dd></div>
      {permissions.length > 0 && <div><dt>Permissions</dt><dd>{permissions.join(", ")}</dd></div>}
    </dl>
    {preload && <p className="hub-notice hub-notice-warn">Includes preload assets: server and game restarts may be required. Follow the author’s instructions.</p>}
    <DownloadButton releaseId={release.releaseId} version={release.version} />
    <details className="hub-panel-details"><summary>Installation notes and license</summary>
      <div className="hub-prose hub-prose-small" dangerouslySetInnerHTML={{ __html: installation }} />
      <div className="hub-prose hub-prose-small" dangerouslySetInnerHTML={{ __html: license }} />
      {release.sha256 && <p className="hub-release-digest">SHA-256 <code>{release.sha256}</code></p>}
    </details>
    <p className="hub-panel-foot"><Link href={versionsHref}>All versions and changelogs →</Link></p>
  </section>;
}
