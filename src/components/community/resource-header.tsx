import Link from "next/link";
import Image from "next/image";
import { SlashMark } from "@/components/brand";
import { getMedia } from "@/lib/community/public-api";
import { formatBytes, formatCount, formatDate } from "@/lib/community/format";
import { categoryLabel, type CommunityProject, type CommunityRelease } from "@/lib/community/types";
import { DownloadButton } from "./download-button";

export type ResourceTab = "overview" | "versions" | "discussion";

/**
 * The top of every resource page: cover band, identity, primary action, a stat
 * bar and the three tabs. Shared so Overview, Versions and Discussion read as
 * one place rather than three pages.
 */
export async function ResourceHeader({ project, latest, tab }: { project: CommunityProject; latest: CommunityRelease | null; tab: ResourceTab }) {
  const { content } = project;
  const reference = content.media?.[0];
  const cover = reference ? (await getMedia(reference.mediaId).catch(() => null))?.derivatives.find(item => item.name === "gallery") : null;
  const base = `/resources/${project.slug}`;
  const tabs: { id: ResourceTab; href: string; label: string }[] = [
    { id: "overview", href: base, label: "Overview" },
    ...(content.kind === "resource" ? [{ id: "versions" as const, href: `${base}/versions`, label: "Versions" }] : []),
    { id: "discussion", href: `${base}/discussion`, label: "Discussion" },
  ];
  return <header className="hub-cover-card">
    <div className={`hub-cover${cover ? " has-image" : ""}`}>
      {cover && <Image unoptimized className="hub-cover-img" src={cover.url} width={cover.width} height={cover.height} alt="" priority referrerPolicy="no-referrer" />}
      <span className="hub-cover-scrim" aria-hidden="true" /><span className="hud-corners" aria-hidden="true" />
      <div className="hub-cover-bottom"><div className="hub-cover-id">
        <p className="hub-cover-eyebrow"><SlashMark />{content.kind === "showcase" ? "SHOWCASE" : "RESOURCE"} · {categoryLabel(content.category)}
          <span className={`hub-pill${content.maturity === "stable" ? " is-stable" : ""}`}>{content.maturity}</span>
          {project.state === "archived" && <span className="hub-pill is-muted">archived</span>}</p>
        <h1 className="hub-cover-title">{content.title}</h1>
        <p className="hub-cover-sub">{project.creatorHandle ? <>by <Link href={`/creators/${project.creatorHandle}`}>@{project.creatorHandle}</Link></> : "by a community creator"}
          {" · "}updated {formatDate(project.updatedAtUtc)}{content.tags.length > 0 && <> · {content.tags.slice(0, 5).map(tag => <span className="hub-cover-tag" key={tag}>{tag}</span>)}</>}</p>
      </div>
      <div className="hub-cover-actions">{content.kind === "resource" && latest && latest.state === "published" ? <DownloadButton releaseId={latest.releaseId} version={latest.version} /> :
        content.kind === "resource" ? <Link className="btn btn-ghost" href={`${base}/versions`}>Browse versions</Link> : null}</div></div>
    </div>
    <div className="hub-statbar">
      {content.kind === "resource" && <div className="hub-stat"><span className="hub-stat-k">Latest</span><span className="hub-stat-v">{latest ? `v${latest.version}` : "—"}</span></div>}
      {content.kind === "resource" && <div className="hub-stat"><span className="hub-stat-k">Size</span><span className="hub-stat-v">{latest ? formatBytes(latest.sizeBytes) : "—"}</span></div>}
      {content.kind === "resource" && <div className="hub-stat"><span className="hub-stat-k">Downloads</span><span className="hub-stat-v">{formatCount(project.downloads)}</span></div>}
      <div className="hub-stat"><span className="hub-stat-k">Upvotes</span><span className="hub-stat-v">{formatCount(project.upvotes)}</span></div>
      <div className="hub-stat"><span className="hub-stat-k">Views</span><span className="hub-stat-v">{formatCount(project.views)}</span></div>
      <div className="hub-stat"><span className="hub-stat-k">Tested on</span><span className="hub-stat-v hub-stat-dim">{latest?.metadata.testedBuilds.length ? latest.metadata.testedBuilds.slice(0, 2).join(", ") : "not declared"}</span></div>
      <div className="hub-stat"><span className="hub-stat-k">Published</span><span className="hub-stat-v">{formatDate(project.publishedAtUtc)}</span></div>
    </div>
    <nav className="hub-tabs" aria-label="Resource sections">{tabs.map(item =>
      <Link key={item.id} href={item.href} {...(item.id === tab ? { "aria-current": "page" as const } : {})}>{item.label}</Link>)}</nav>
  </header>;
}
