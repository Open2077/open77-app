"use client";

import { useEffect, useState, type FormEvent } from "react";
import { useSession } from "@/lib/account/session";
import * as api from "@/lib/community/client-api";
import type { CommunityPage, CommunityProject, CommunityRelease, CommunityReviewItem } from "@/lib/community/types";
import { PrivateMediaPreview } from "@/components/community/private-media-preview";
import { useAdminActivity } from "./admin-activity";

const message = (error: unknown) => error instanceof Error ? error.message : "The request failed. Please try again.";

export function CommunityReviewPanel() {
  const { session } = useSession();
  const [kind, setKind] = useState<"projects" | "releases">("projects");
  const [cursor, setCursor] = useState<string>();
  const [page, setPage] = useState<CommunityPage<CommunityReviewItem> | null>(null);
  const [error, setError] = useState("");
  const [refresh, setRefresh] = useState(0);
  const [selected, setSelected] = useState<CommunityReviewItem | null>(null);
  const token = session?.token;
  const { begin } = useAdminActivity();
  useEffect(() => {
    const refresh = () => setRefresh(value => value + 1);
    window.addEventListener("open77:admin-refresh", refresh);
    return () => window.removeEventListener("open77:admin-refresh", refresh);
  }, []);
  useEffect(() => {
    if (!token) return;
    const controller = new AbortController();
    const finish = begin();
    api.reviewQueue(token, kind, cursor, AbortSignal.any([controller.signal, AbortSignal.timeout(10000)]))
      .then(result => { if (!controller.signal.aborted) { setPage(result); setError(""); finish(true); } })
      .catch(error => { if (!controller.signal.aborted) { setError(message(error)); finish(false); } });
    return () => { controller.abort(); finish(); };
  }, [token, kind, cursor, refresh, begin]);
  if (!token) return null;
  return <div className="hub-review-panel"><div className="hub-actions" aria-label="Review queues">
    {(["projects", "releases"] as const).map(value => <button key={value} className="btn btn-ghost" aria-pressed={value === kind} onClick={() => {
      setKind(value); setCursor(undefined); setPage(null); setSelected(null);
    }}>{value === "projects" ? "Project pages" : "Package releases"}</button>)}
    <button className="btn btn-ghost" onClick={() => setRefresh(value => value + 1)}>Refresh queue</button></div>
    {error && <p className="hub-notice" role="alert">{error}</p>}
    {!page && !error && <p role="status">Loading review queue…</p>}
    {page?.items.length === 0 && <p className="hub-notice">Nothing is waiting in this queue.</p>}
    {page?.items.map(item => <article className="hub-draft-row" key={item.id}><div><h2>{item.title}</h2><p>{item.version ? `Version ${item.version} · ` : ""}Revision {item.revision} · {new Date(item.queuedAtUtc).toLocaleString()}</p></div>
      <button className="btn btn-primary" onClick={() => setSelected(item)}>Inspect submission</button></article>)}
    <nav className="hub-actions" aria-label="Review queue pages">{cursor && <button className="btn btn-ghost" onClick={() => setCursor(undefined)}>Start of queue</button>}
      {page?.nextCursor && <button className="btn btn-ghost" onClick={() => setCursor(page.nextCursor ?? undefined)}>Next page</button>}</nav>
    {selected && <ReviewDetail key={`${selected.kind}-${selected.id}-${selected.revision}`} token={token} item={selected}
      completed={() => { setSelected(null); setRefresh(value => value + 1); }} />}
  </div>;
}

function ReviewDetail({ token, item, completed }: { token: string; item: CommunityReviewItem; completed: () => void }) {
  const [project, setProject] = useState<CommunityProject | null>(null);
  const [release, setRelease] = useState<CommunityRelease | null>(null);
  const [error, setError] = useState("");
  const [reason, setReason] = useState("");
  const [approve, setApprove] = useState(false);
  const [checked, setChecked] = useState(false);
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    const controller = new AbortController();
    const signal = AbortSignal.any([controller.signal, AbortSignal.timeout(15000)]);
    Promise.all([api.myProject(token, item.projectId, signal), item.kind === "releases" ? api.reviewRelease(token, item.id, signal) : Promise.resolve(null)])
      .then(([project, release]) => { if (!controller.signal.aborted) { setProject(project); setRelease(release); } })
      .catch(error => { if (!controller.signal.aborted) setError(message(error)); });
    return () => controller.abort();
  }, [token, item]);
  const revision = item.kind === "projects" ? project?.revision : release?.revision;
  const state = item.kind === "projects" ? project?.revisionStatus : release?.state;
  const current = revision === item.revision && state === (item.kind === "projects" ? "submitted" : "pending_review");
  async function decide(event: FormEvent) {
    event.preventDefault(); if (!current || !checked || busy) return;
    setBusy(true); setError("");
    try { await api.reviewDecision(token, item.kind, item.id, item.revision, approve, reason); completed(); }
    catch (error) { setError(message(error)); setChecked(false); }
    finally { setBusy(false); }
  }
  return <section className="hub-section" aria-label="Submission review"><h2>Inspect {item.title}{item.version ? ` · ${item.version}` : ""}</h2>
    <p className="hub-notice">Reviewing revision {item.revision}. A resource project needs an approved release before its page can be approved.</p>
    {error && <p className="hub-notice" role="alert">{error}</p>}
    {!project && !error && <p role="status">Loading submission…</p>}
    {project && <><p>{project.content.summary}</p><p>{project.content.category} · {project.content.kind} · {project.content.maturity}</p>
      <details open><summary>Project description and installation</summary><pre className="hub-review-text">{project.content.description}</pre><pre className="hub-review-text">{project.content.installation}</pre></details>
      <p>License: {project.content.license || "Not provided"}</p><p>Tags: {project.content.tags.join(", ")}</p>
      {[project.content.sourceUrl, project.content.issueUrl, ...(project.content.videoUrls ?? [])].filter(Boolean).map((url, index) => <p key={index}><a href={url!} target="_blank" rel="noopener noreferrer nofollow ugc">{url}</a></p>)}
      <div className="hub-media-editor">{project.content.media?.map(media => <figure key={media.mediaId}><PrivateMediaPreview token={token} mediaId={media.mediaId} alt={media.altText} /><figcaption>{media.altText}{media.caption ? ` — ${media.caption}` : ""}</figcaption></figure>)}</div>
    </>}
    {release && <><h3>Release details</h3><pre className="hub-review-text">{release.metadata.changelog}</pre><pre className="hub-review-text">{release.metadata.installation}</pre>
      <p>License: {release.metadata.license}</p><p>Tested builds: {release.metadata.testedBuilds.join(", ") || "None declared"}</p><p>Required resources: {release.metadata.requiredResources.join(", ") || "None declared"}</p>
      <p className="hub-release-digest">SHA-256 <code>{release.sha256}</code> · {release.sizeBytes} bytes</p>
      <details open><summary>Immutable inspection snapshot and manifests</summary><pre className="hub-review-text">{JSON.stringify(release.inspection, null, 2)}</pre></details></>}
    {project && !current && <p className="hub-notice" role="alert">This submission changed or has already been reviewed. Refresh the queue and inspect the current revision.</p>}
    <form className="hub-form" onSubmit={decide}><label>Decision<select value={approve ? "approve" : "reject"} onChange={event => { setApprove(event.target.value === "approve"); setChecked(false); }}><option value="reject">Request changes / reject</option><option value="approve">Approve</option></select></label>
      <label>Reason for the creator and audit log<textarea required minLength={1} maxLength={5000} value={reason} onChange={event => setReason(event.target.value)} /></label>
      <label className="hub-review-confirm"><input type="checkbox" checked={checked} onChange={event => setChecked(event.target.checked)} />I reviewed this revision and its attached evidence.</label>
      <div className="hub-actions"><button className="btn btn-primary" disabled={!current || !checked || busy || !reason.trim()}>{busy ? "Recording decision…" : "Record decision"}</button><button type="button" className="btn btn-ghost" disabled={busy} onClick={completed}>Close review</button></div>
    </form>
  </section>;
}
