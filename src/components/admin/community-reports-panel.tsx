"use client";

import Link from "next/link";
import { useCallback, useState, type FormEvent } from "react";
import { useSession } from "@/lib/account/session";
import * as api from "@/lib/community/client-api";
import type { CommunityProject, CommunityRelease, CommunityReport } from "@/lib/community/types";
import { useAdminData } from "./use-admin-data";
import { PrivateMediaPreview } from "@/components/community/private-media-preview";
import { DownloadButton } from "@/components/community/download-button";
import { ProjectModerationControls, ReleaseRevocationControls } from "./community-moderation-controls";
import { ActivityHistory } from "@/components/community/activity-history";

export function CommunityReportsPanel() {
  const { session } = useSession();
  const [state, setState] = useState<CommunityReport["state"]>("open");
  const [cursor, setCursor] = useState<string>();
  const load = useCallback((token: string) => api.reports(token, state, cursor, AbortSignal.timeout(10000)), [state, cursor]);
  const result = useAdminData(load);
  if (!session) return null;
  return <div className="hub-review-panel"><div className="hub-actions">
    {(["open", "action_taken", "dismissed"] as const).map(value => <button key={value} className="btn btn-ghost" aria-pressed={state === value} onClick={() => { setState(value); setCursor(undefined); }}>{value.replaceAll("_", " ")}</button>)}
    <Link href="/admin/resources">Project and release review →</Link></div>
    {result.error && <p className="hub-notice" role="alert">{result.error}</p>}
    {!result.data && !result.error && <p role="status">Loading reports…</p>}
    {result.data?.items.length === 0 && <p className="hub-notice">No reports match this filter.</p>}
    <div className="hub-releases">{result.data?.items.map(report => <ReportRow key={`${report.reportId}-${report.state}`} token={session.token} accountId={session.accountId} report={report} updated={result.reload} />)}</div>
    <nav className="hub-actions" aria-label="Report pages">{cursor && <button className="btn btn-ghost" onClick={() => setCursor(undefined)}>Start of queue</button>}
      {result.data?.nextCursor && <button className="btn btn-ghost" onClick={() => setCursor(result.data?.nextCursor ?? undefined)}>Next page</button>}</nav>
  </div>;
}

function ReportRow({ token, accountId, report, updated }: { token: string; accountId: string; report: CommunityReport; updated: () => void }) {
  const [reason, setReason] = useState("");
  const [outcome, setOutcome] = useState<"action_taken" | "dismissed">("dismissed");
  const [project, setProject] = useState<CommunityProject | null>(null);
  const [release, setRelease] = useState<CommunityRelease | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [assignmentReason, setAssignmentReason] = useState("");
  const [publicResponse, setPublicResponse] = useState("");
  async function assign(event: FormEvent) {
    event.preventDefault(); if (busy) return;
    setBusy(true); setError("");
    try { await api.assignReport(token, report.reportId, report.revision, report.assignedAccountId !== accountId, assignmentReason); setAssignmentReason(""); updated(); }
    catch (error) { setError(error instanceof Error ? error.message : "Assignment failed."); }
    finally { setBusy(false); }
  }
  async function inspect() {
    setBusy(true); setError("");
    try {
      const signal = AbortSignal.timeout(15000);
      const [project, release] = await Promise.all([api.myProject(token, report.projectId, signal),
        report.targetType === "release" ? api.reviewRelease(token, report.targetId, signal) : Promise.resolve(null)]);
      setProject(project); setRelease(release);
    } catch (error) { setError(error instanceof Error ? error.message : "Reported content could not be loaded."); }
    finally { setBusy(false); }
  }
  async function resolve(event: FormEvent) {
    event.preventDefault(); if (busy) return;
    setBusy(true); setError("");
    try { await api.resolveReport(token, report.reportId, outcome, reason, report.revision, report.targetType === "appeal" ? publicResponse : undefined); updated(); }
    catch (error) { setError(error instanceof Error ? error.message : "The report could not be resolved."); }
    finally { setBusy(false); }
  }
  return <article className="hub-release"><div className="hub-release-heading"><h2>{report.targetType === "appeal" ? "Decision appeal" : `Reported ${report.targetType}`}</h2><span className="hub-release-state">{report.state.replaceAll("_", " ")}</span></div>
    <p className="hub-release-meta">{new Date(report.createdAtUtc).toLocaleString()}</p><pre className="hub-review-text">{report.reason}</pre>
    {error && <p className="hub-notice" role="alert">{error}</p>}
    <p>Assigned to: {report.assignedAccountId === accountId ? "you" : report.assignedAccountId ? "another moderator" : "unassigned"} · revision {report.revision}</p>
    {report.state === "open" && <form className="hub-form" onSubmit={assign}><label>Assignment note<input required maxLength={5000} value={assignmentReason} onChange={event => setAssignmentReason(event.target.value)} /></label>
      <button className="btn btn-ghost" disabled={busy || !assignmentReason.trim()}>{report.assignedAccountId === accountId ? "Release to queue" : report.assignedAccountId ? "Take over report" : "Assign to me"}</button></form>}
    <button className="btn btn-ghost" disabled={busy} onClick={inspect}>{project ? "Refresh reported content" : "Inspect reported content"}</button>
    {report.targetBody && <details><summary>{report.targetType === "appeal" ? "Original decision being appealed" : "Reported comment"}</summary><pre className="hub-review-text">{report.targetBody}</pre></details>}
    {report.publicResponse && <details><summary>Response sent to creator</summary><pre className="hub-review-text">{report.publicResponse}</pre></details>}
    {project && <details open><summary>Current project draft: {project.content.title} · {project.state} · revision {project.revision}</summary>
      <p>{project.content.summary}</p><pre className="hub-review-text">{project.content.description}</pre>
      <div className="hub-media-editor">{project.content.media?.map(image => <PrivateMediaPreview key={image.mediaId} token={token} mediaId={image.mediaId} alt={image.altText} />)}</div>
      <Link href={`/resources/${project.slug}`}>Open public project page</Link>
      <p><Link href={`/admin/resources/${project.projectId}`}>Open project moderation and release history</Link></p>
      <ProjectModerationControls token={token} projectId={project.projectId} updated={inspect} /></details>}
    {release && <details open><summary>Release {release.version} · {release.state}</summary><pre className="hub-review-text">{release.metadata.changelog}</pre>
      <p className="hub-release-digest">SHA-256 <code>{release.sha256}</code></p><DownloadButton key={`${release.releaseId}-${release.revision}`} releaseId={release.releaseId} version={release.version} review={{ token, revision: release.revision }} />
      <ReleaseRevocationControls token={token} release={release} updated={inspect} /></details>}
    {report.state === "open" && <form className="hub-form" onSubmit={resolve}><p>Apply any required content action before recording the outcome. Investigation notes stay private.</p>
      <label>Outcome<select value={outcome} onChange={event => setOutcome(event.target.value as typeof outcome)}><option value="dismissed">Dismiss report</option><option value="action_taken">Action taken</option></select></label>
      <label>Private investigation notes<textarea required maxLength={5000} value={reason} onChange={event => setReason(event.target.value)} /></label>
      {report.targetType === "appeal" && <label>Response to the creator<textarea required maxLength={5000} value={publicResponse} onChange={event => setPublicResponse(event.target.value)} /><span>This response is sent to the creator. Explain the outcome and any next steps.</span></label>}
      <button className="btn btn-primary" disabled={busy || !reason.trim() || (!!report.assignedAccountId && report.assignedAccountId !== accountId)}>{busy ? "Working…" : "Resolve report"}</button></form>}
    <ActivityHistory key={`${report.reportId}-${report.revision}`} token={token} kind="report" id={report.reportId} title="Private report history" />
  </article>;
}
