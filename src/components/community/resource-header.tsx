import Link from "next/link";
import { DownloadIcon } from "@/components/icons";
import { formatBytes, formatCount, formatDate } from "@/lib/community/format";
import { categoryLabel, type CommunityProject, type CommunityRelease } from "@/lib/community/types";
import { DownloadButton } from "./download-button";

export type ResourceTab = "overview" | "versions" | "discussion";

const EyeIcon = () => <svg viewBox="0 0 16 16" width="13" height="13" aria-hidden="true"><path d="M1.5 8s2.5-4.5 6.5-4.5S14.5 8 14.5 8 12 12.5 8 12.5 1.5 8 1.5 8z" fill="none" stroke="currentColor" strokeWidth="1.4" /><circle cx="8" cy="8" r="2" fill="currentColor" /></svg>;
const UpIcon = () => <svg viewBox="0 0 16 16" width="12" height="12" aria-hidden="true"><path d="M8 2.5 13.5 9H10v4.5H6V9H2.5z" fill="currentColor" /></svg>;

/**
 * The top of every Workshop item page: breadcrumb, a plain title block with the
 * creator, tags and the counters that matter, and the one action on the right.
 * Sub-pages (all versions, discussion threads) add their own crumb.
 */
export function ResourceHeader({ project, latest, tab }: { project: CommunityProject; latest: CommunityRelease | null; tab: ResourceTab }) {
  const { content } = project;
  const base = `/workshop/${project.slug}`;
  return <>
    <nav className="ws-crumbs" aria-label="Breadcrumb"><Link href="/workshop">Workshop</Link><span>/</span><Link href={`/workshop?category=${content.category}`}>{categoryLabel(content.category)}</Link>
      {tab !== "overview" && <><span>/</span><Link href={base}>{content.title}</Link><span>/</span><span>{tab === "versions" ? "All versions" : "Discussion"}</span></>}</nav>
    <header className="ws-head">
      <div className="ws-head-main">
        <p className="hub-kicker">{content.kind === "showcase" ? "SHOWCASE" : "RESOURCE"}
          <span className={`hub-pill${content.maturity === "stable" ? " is-stable" : ""}`}>{content.maturity}</span>
          {project.state === "archived" && <span className="hub-pill is-muted">archived</span>}</p>
        <h1 className="ws-title">{content.title}</h1>
        <p className="ws-summary">{content.summary}</p>
        <p className="ws-byline">{project.creatorHandle ? <>by <Link href={`/workshop/creators/${project.creatorHandle}`}>@{project.creatorHandle}</Link></> : "by a community creator"}
          <span className="ws-byline-sep">·</span>updated {formatDate(project.updatedAtUtc)}
          {content.tags.length > 0 && <><span className="ws-byline-sep">·</span>{content.tags.map(tag => <Link className="ws-tag" key={tag} href={`/workshop?tag=${encodeURIComponent(tag)}`}>{tag}</Link>)}</>}</p>
        <ul className="ws-stats" aria-label="Statistics">
          {content.kind === "resource" && <li title="Completed downloads"><DownloadIcon size={13} /><b>{formatCount(project.downloads)}</b> downloads</li>}
          <li title="Upvotes"><UpIcon /><b>{formatCount(project.upvotes)}</b> upvotes</li>
          <li title="Page views"><EyeIcon /><b>{formatCount(project.views)}</b> views</li>
          {content.kind === "resource" && latest && <li title="Latest stable release"><b>v{latest.version}</b> · {formatBytes(latest.sizeBytes)}</li>}
        </ul>
      </div>
      <div className="ws-head-actions">
        {content.kind === "resource" && latest && latest.state === "published" ? <DownloadButton releaseId={latest.releaseId} version={latest.version} /> :
          content.kind === "resource" ? <Link className="btn btn-ghost" href={`${base}/versions`}>Browse versions</Link> : null}
        {tab === "overview" && <p className="ws-head-jump"><a href="#discussion">Jump to discussion ↓</a></p>}
      </div>
    </header>
  </>;
}
