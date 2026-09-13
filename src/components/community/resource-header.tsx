import Link from "next/link";
import { formatBytes, formatCount, formatDate } from "@/lib/community/format";
import { categoryLabel, type CommunityProject, type CommunityRelease } from "@/lib/community/types";
import { DownloadButton } from "./download-button";

export type ResourceTab = "overview" | "versions" | "discussion";

/**
 * The top of every Workshop item page: a plain title block with the creator
 * and tags on the left, the one action that matters on the right, then the
 * section tabs. The media lives in the page body, not in a banner.
 */
export function ResourceHeader({ project, latest, tab }: { project: CommunityProject; latest: CommunityRelease | null; tab: ResourceTab }) {
  const { content } = project;
  const base = `/workshop/${project.slug}`;
  const tabs: { id: ResourceTab; href: string; label: string }[] = [
    { id: "overview", href: base, label: "Overview" },
    ...(content.kind === "resource" ? [{ id: "versions" as const, href: `${base}/versions`, label: "Versions" }] : []),
    { id: "discussion", href: `${base}/discussion`, label: "Discussion" },
  ];
  return <>
    <nav className="ws-crumbs" aria-label="Breadcrumb"><Link href="/workshop">Workshop</Link><span>/</span><Link href={`/workshop?category=${content.category}`}>{categoryLabel(content.category)}</Link></nav>
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
      </div>
      <div className="ws-head-actions">
        {content.kind === "resource" && latest && latest.state === "published" ? <DownloadButton releaseId={latest.releaseId} version={latest.version} /> :
          content.kind === "resource" ? <Link className="btn btn-ghost" href={`${base}/versions`}>Browse versions</Link> : null}
        <p className="ws-head-meta">
          {content.kind === "resource" && latest && <span>v{latest.version} · {formatBytes(latest.sizeBytes)}</span>}
          {content.kind === "resource" && <span title="Downloads">⤓ {formatCount(project.downloads)}</span>}
          <span title="Upvotes">▲ {formatCount(project.upvotes)}</span>
        </p>
      </div>
    </header>
    <nav className="hub-tabs ws-tabs" aria-label="Sections">{tabs.map(item =>
      <Link key={item.id} href={item.href} {...(item.id === tab ? { "aria-current": "page" as const } : {})}>{item.label}</Link>)}</nav>
  </>;
}
