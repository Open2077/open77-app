"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import type { StoredSession } from "@/lib/account/session";
import * as api from "@/lib/community/client-api";
import { transferUpload } from "@/lib/community/upload";
import type { CommunityPage, CommunityProject, CommunityRelease, CommunityUploadItem } from "@/lib/community/types";
import { validationHelp } from "@/lib/community/validation-help";
import { useReleaseEditor } from "./use-release-editor";
import { ReleaseFiles } from "./release-files";
import { GitHubImportPicker, GitHubImportStatus } from "./github-import";
import { MasterApiError } from "@/lib/account/api";
import type { FieldErrors } from "@/lib/account/field-errors";
import { CreateAttempt } from "@/lib/community/create-attempt";
import { ValidationIssues } from "./validation-issues";

const errorText = (error: unknown) => error instanceof Error ? error.message : "The request failed. Please try again.";
/** An upload still able to complete for this release: reserved, in flight or queued, and not yet expired. */
const activeUploadFor = (releaseId: string, checkedAt: number) => (item: CommunityUploadItem) =>
  item.upload.releaseId === releaseId && ["pending", "receiving", "uploaded", "processing", "importing"].includes(item.upload.state) && Date.parse(item.upload.expiresAtUtc) > checkedAt;
const lines = (value: string) => [...new Set(value.split(/\r?\n/).map(line => line.trim()).filter(Boolean))];

function PackageTransfer({ token, projectId, releaseId, existing, checkedAt, changed }: {
  token: string; projectId: string; releaseId: string; existing?: CommunityUploadItem; checkedAt: number; changed: () => void;
}) {
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState(0);
  const [status, setStatus] = useState("");
  const [error, setError] = useState("");
  const controller = useRef<AbortController | null>(null);
  useEffect(() => () => controller.current?.abort(), []);
  useEffect(() => {
    if (!busy) return;
    const warn = (event: BeforeUnloadEvent) => event.preventDefault();
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [busy]);
  async function submit(event: FormEvent) {
    event.preventDefault();
    if (busy) return;
    setError("");
    const finalizeOnly = existing?.upload.state === "uploaded";
    if (!finalizeOnly && (!file || !file.name.toLowerCase().endsWith(".zip") || !file.size || file.size > 100 * 1024 * 1024)) {
      setError("Choose a non-empty ZIP file up to 100 MiB."); return;
    }
    if (!finalizeOnly && existing && file && (file.name !== existing.originalName || file.size > existing.upload.maximumBytes)) {
      setError("Choose the original filename within its reserved size to restart this transfer."); return;
    }
    const operation = new AbortController(); controller.current = operation;
    setBusy(true); setProgress(0); setStatus(finalizeOnly ? "Submitting for validation…" : "Reserving your upload…");
    try {
      let id = existing?.upload.uploadId;
      if (!finalizeOnly && file) {
        const grant = existing ? await api.restartUpload(token, existing.upload.uploadId, operation.signal) :
          await api.reserveUpload(token, projectId, releaseId, "package", file, operation.signal);
        id = grant.uploadId; setStatus("Uploading ZIP…");
        await transferUpload(grant, file, operation.signal, setProgress);
      }
      if (!id) throw new Error("No upload was reserved.");
      setStatus("Submitting for validation…");
      await api.completeUpload(token, id, operation.signal);
      setStatus("Queued for package validation. Review begins after validation succeeds.");
      setFile(null);
    } catch (error) {
      setStatus("");
      setError(operation.signal.aborted ? "Transfer stopped. Refresh status before restarting; completed bytes may already be stored." : errorText(error));
    } finally {
      if (controller.current === operation) controller.current = null;
      setBusy(false); changed();
    }
  }
  if (!busy && existing && (!["pending", "uploaded"].includes(existing.upload.state) || Date.parse(existing.upload.expiresAtUtc) <= checkedAt)) return null;
  return <form className="hub-form hub-upload-form" onSubmit={submit}>
    {existing?.upload.state !== "uploaded" && <label>{existing ? "Select your ZIP again to restart" : "Release ZIP"}<input type="file" accept=".zip,application/zip" disabled={busy}
      onChange={event => { setFile(event.target.files?.[0] ?? null); setError(""); }} /><small>Protocol ceiling: 100 MiB. Your publishing limits may be lower. Include open77.lua and the declared resource files.</small></label>}
    <div className="hub-actions"><button className="btn btn-primary" disabled={busy || (!file && existing?.upload.state !== "uploaded")}>
      {existing?.upload.state === "uploaded" ? "Submit stored file for validation" : existing ? "Restart upload" : "Upload ZIP"}</button>
      {busy && <button type="button" className="btn btn-ghost" onClick={() => controller.current?.abort()}>Stop transfer</button>}</div>
    {busy && <progress aria-label="ZIP upload progress" max={100} value={progress} />}
    {status && <p role="status">{status}</p>}{error && <p className="hub-notice" role="alert">{error}</p>}
  </form>;
}

export function CreatorReleases({ session, project, readOnly = false, onUnsavedChange }: { session: StoredSession; project: CommunityProject; readOnly?: boolean; onUnsavedChange?: (dirty: boolean) => void }) {
  const [releases, setReleases] = useState<CommunityPage<CommunityRelease> | null>(null);
  const [uploads, setUploads] = useState<CommunityPage<CommunityUploadItem> | null>(null);
  const [releaseCursor, setReleaseCursor] = useState<string>();
  const [uploadCursor, setUploadCursor] = useState<string>();
  const [refresh, setRefresh] = useState(0);
  const [error, setError] = useState("");
  const [pollPaused, setPollPaused] = useState(false);
  const [checkedAt, setCheckedAt] = useState(0);
  const draft = useReleaseEditor(session.token, project.projectId, { version: "", changelog: "", license: project.content.license ?? "",
    installation: project.content.installation, testedBuilds: "", requiredResources: "" });
  const { version, changelog, license, installation, testedBuilds, requiredResources } = draft.content;
  const [creating, setCreating] = useState(false);
  const createAttempt = useRef(new CreateAttempt<{ version: string; metadata: CommunityRelease["metadata"]; distributionRightsConfirmed: boolean }>());
  const [pendingCreate, setPendingCreate] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [createError, setCreateError] = useState("");
  const [createStatus, setCreateStatus] = useState("");
  const [rightsContent, setRightsContent] = useState<typeof draft.content | null>(null);
  const rights = rightsContent === draft.content;
  useEffect(() => { onUnsavedChange?.(draft.dirty || pendingCreate); }, [draft.dirty, pendingCreate, onUnsavedChange]);
  function reload() { setRefresh(value => value + 1); }
  useEffect(() => {
    const controller = new AbortController();
    let timer: ReturnType<typeof setTimeout> | undefined;
    let polls = 0;
    async function load() {
      try {
        const signal = AbortSignal.any([controller.signal, AbortSignal.timeout(15000)]);
        const [nextReleases, nextUploads] = await Promise.all([
          api.myReleases(session.token, project.projectId, releaseCursor, signal),
          api.myUploads(session.token, project.projectId, uploadCursor, signal),
        ]);
        if (controller.signal.aborted) return;
        setReleases(nextReleases); setUploads(nextUploads); setError(""); setPollPaused(false); setCheckedAt(Date.now());
        if (nextUploads.items.some(item => ["processing", "receiving", "importing"].includes(item.upload.state))) {
          if (polls++ < 20) timer = setTimeout(load, Math.min(30000, 3000 * 1.3 ** polls));
          else setPollPaused(true);
        }
      } catch (error) { if (!controller.signal.aborted) { setError(errorText(error)); setPollPaused(true); } }
    }
    void load();
    return () => { controller.abort(); clearTimeout(timer); };
  }, [session.token, project.projectId, releaseCursor, uploadCursor, refresh]);
  async function create(event: FormEvent) {
    event.preventDefault(); if (creating || (!createAttempt.current.pending && (!draft.loaded || draft.busy || draft.conflict || !rights))) return;
    setCreating(true); setCreateError(""); setCreateStatus(""); setFieldErrors({});
    try {
      if (!createAttempt.current.pending && !await draft.save()) return;
      const request = createAttempt.current.begin({ version: version.trim(), metadata: { changelog, license, installation,
        testedBuilds: lines(testedBuilds), requiredResources: lines(requiredResources) }, distributionRightsConfirmed: rights });
      setPendingCreate(true);
      await api.createRelease(session.token, project.projectId, request.body.version, request.body.metadata, request.body.distributionRightsConfirmed, request.requestId);
      createAttempt.current.resolved(); setPendingCreate(false);
      const currentDetails = { version: version.trim(), metadata: { changelog, license, installation, testedBuilds: lines(testedBuilds), requiredResources: lines(requiredResources) } };
      if (JSON.stringify(currentDetails) === JSON.stringify({ version: request.body.version, metadata: request.body.metadata })) {
        draft.change("version", ""); draft.change("changelog", "");
      }
      setCreateStatus(`Version ${request.body.version} is created. Find it in the release list below.`); setReleaseCursor(undefined); reload();
    } catch (error) { if (error instanceof MasterApiError) { createAttempt.current.rejected(error.status); setPendingCreate(createAttempt.current.pending); setFieldErrors(error.fieldErrors); } setCreateError(errorText(error)); }
    finally { setCreating(false); }
  }
  return <section id="hub-releases" className="hub-section" aria-label="Manage releases">
    <div className="hub-section-head"><div><p className="hub-kicker">PACKAGE PUBLISHING</p><h2>Releases and uploads</h2></div>
      <button type="button" className="btn btn-ghost" onClick={reload}>Refresh status</button></div>
    {error && <p className="hub-notice" role="alert">{error}</p>}
    {createError && <p className="hub-notice" role="alert">{createError} <a href="/account" target="_blank" rel="noopener noreferrer">Sign in again in another tab</a> with the same account if your session expired. Your details remain here.</p>}
    {createStatus && <p role="status">{createStatus}</p>}
    <ValidationIssues errors={fieldErrors} />
    {pendingCreate && !creating && <p className="hub-notice">The version may already have been created. Retry the same request to recover it before editing these details. Keep this tab open until it finishes.</p>}
    {pollPaused && <p className="hub-notice">Automatic status checks have paused. Use Refresh status to check again.</p>}
    <details className="hub-release" hidden={readOnly}><summary>Create a version</summary>
      <p className="hub-notice">Release versions and their details cannot be reused or edited after creation. Check these details before continuing. Your ZIP is validated and reviewed before publication.</p>
      <p role="status">{!draft.loaded ? "Loading your private release draft…" : draft.busy ? "Saving release details…" : draft.dirty ? "Unsaved release details" : "Release details saved"} · This unfinished form is private to your account.</p>
      {draft.error && <p className="hub-notice" role="alert">{draft.error} Your text is retained; autosave is paused. <button type="button" className="btn btn-ghost" disabled={draft.busy || draft.conflict} onClick={() => { if (draft.loaded) void draft.save(); else draft.retryLoad(); }}>Retry</button></p>}
      {draft.conflict && <div className="hub-notice"><p>Another tab changed your release draft. Compare before resuming.</p><button type="button" className="btn btn-ghost" disabled={draft.busy} onClick={draft.compare}>Compare saved details</button>
        {draft.remote && <><div className="hub-form-row"><div><h3>Your details</h3><pre className="hub-merge-text">{JSON.stringify(draft.content, null, 2)}</pre></div><div><h3>Saved details</h3><pre className="hub-merge-text">{JSON.stringify(draft.remote.content, null, 2)}</pre></div></div>
          <button type="button" className="btn btn-ghost" onClick={() => draft.recover("remote")}>Discard mine and use saved details</button><button type="button" className="btn btn-primary" onClick={() => draft.recover("local")}>Replace saved details with mine</button></>}
      </div>}
      <form className="hub-form" onSubmit={create}>
        <fieldset className="hub-editor-fields" disabled={!draft.loaded || draft.conflict || creating || pendingCreate}>
        <label>Version<input required maxLength={100} placeholder="1.0.0 or 1.0.0-beta.1" value={version} onChange={event => draft.change("version", event.target.value)} /></label>
        <label>Changelog<textarea required maxLength={50000} value={changelog} onChange={event => draft.change("changelog", event.target.value)} /></label>
        <label>Installation and configuration<textarea required maxLength={50000} value={installation} onChange={event => draft.change("installation", event.target.value)} /></label>
        <label>License and attribution<textarea required maxLength={10000} value={license} onChange={event => draft.change("license", event.target.value)} /></label>
        <label>Tested Open77 builds, one per line<textarea maxLength={10000} value={testedBuilds} onChange={event => draft.change("testedBuilds", event.target.value)} /></label>
        <label>Required resources, one per line<textarea maxLength={10000} value={requiredResources} onChange={event => draft.change("requiredResources", event.target.value)} /></label>
        </fieldset>
        <label className="hub-rights"><input type="checkbox" checked={rights} disabled={creating || pendingCreate || !draft.loaded} onChange={event => setRightsContent(event.target.checked ? draft.content : null)} />I have permission to share this creation, its images and all included files under the stated license.</label>
        <button type="button" className="btn btn-ghost" disabled={!draft.loaded || draft.busy || draft.conflict || creating} onClick={() => { void draft.save(); }}>Save release draft</button>
        <button className="btn btn-primary" disabled={creating || (!pendingCreate && (!draft.loaded || draft.busy || draft.conflict || !rights))}>{creating ? "Creating…" : pendingCreate ? "Recover created version" : "Create immutable version"}</button>
      </form></details>
    {!releases && !error && <p role="status">Loading releases…</p>}
    <div className="hub-releases">{releases?.items.map(release => <article className="hub-release" key={release.releaseId}>
      <div className="hub-release-heading"><h3>Version {release.version}</h3><span className="hub-release-state">{release.state.replaceAll("_", " ")}</span></div>
      {release.state === "uploading" && <div hidden={readOnly}><PackageTransfer token={session.token} projectId={project.projectId} releaseId={release.releaseId} checkedAt={checkedAt} changed={reload}
        existing={uploads?.items.find(activeUploadFor(release.releaseId, checkedAt))} />
        {!uploads?.items.some(activeUploadFor(release.releaseId, checkedAt)) &&
          <GitHubImportPicker key={`${session.token}:${release.releaseId}`} session={session} projectId={project.projectId} releaseId={release.releaseId} sourceUrl={project.content.sourceUrl} changed={reload} />}</div>}
      {readOnly && <><p className="hub-merge-text">{release.metadata.changelog}</p><p>Tested builds: {release.metadata.testedBuilds.join(", ") || "None declared"}</p><p>Required resources: {release.metadata.requiredResources.join(", ") || "None declared"}</p><p className="hub-merge-text">License: {release.metadata.license}</p><p className="hub-merge-text">Installation: {release.metadata.installation}</p></>}
      {release.sha256 && <p className="hub-release-digest">SHA-256 <code>{release.sha256}</code></p>}
      {release.resources.length > 0 && <ReleaseFiles key={`${session.accountId}:${release.releaseId}`} releaseId={release.releaseId} token={session.token} />}
      {release.resources.length > 0 && <details><summary>Inspected resources and requirements</summary>{release.resources.map(resource => <div className="hub-release" key={resource.name}><h4>{resource.name}</h4><p>Root: <code>{resource.relativeRoot || "."}</code> · Manifest version: {resource.manifest.version}</p><p>Open77: {resource.manifest.open77Version}</p><p>Dependencies: {resource.manifest.dependencies.join(", ") || "None declared"}</p><p>Permissions: {resource.manifest.permissions.join(", ") || "None declared"}</p><p>Preloads: {resource.manifest.preloadMods.join(", ") || "None declared"}</p></div>)}</details>}
    </article>)}</div>
    <nav className="hub-actions" aria-label="Your release pages">
      {releaseCursor && <button className="btn btn-ghost" onClick={() => setReleaseCursor(undefined)}>Newest releases</button>}
      {releases?.nextCursor && <button className="btn btn-ghost" onClick={() => setReleaseCursor(releases.nextCursor ?? undefined)}>Older releases</button>}</nav>
    <div hidden={readOnly}><div className="hub-section-head"><h2>Your upload history</h2></div>
    <p className="hub-notice">Interrupted transfers restart from the beginning. Pending reservations expire after 30 minutes; stored files can be submitted for validation without uploading again.</p>
    {uploads?.items.length === 0 && <p>No uploads yet.</p>}
    <div className="hub-releases">{uploads?.items.map(item => <article className="hub-release" key={item.upload.uploadId}>
      <div className="hub-release-heading"><h3>{item.originalName}</h3><span className="hub-release-state">{item.upload.state}</span></div>
      {item.importId && <GitHubImportStatus key={`${session.token}:${item.importId}`} token={session.token} id={item.importId} checkedAt={checkedAt} />}
      {item.upload.inspectionCode && <p className="hub-notice" role="alert">Validation result: <code>{item.upload.inspectionCode}</code>. {validationHelp(item.upload.inspectionCode)} <a href="/docs/server-resources" target="_blank" rel="noopener noreferrer">Resource documentation ↗</a></p>}
      {item.upload.state === "accepted" && <p>Technical validation passed. Publication still requires moderation approval.</p>}
      {["pending", "uploaded"].includes(item.upload.state) && Date.parse(item.upload.expiresAtUtc) <= checkedAt && <p>This reservation expired. Select a ZIP from the release above to start a new reservation.</p>}
      {item.upload.releaseId && <PackageTransfer token={session.token} projectId={project.projectId}
        releaseId={item.upload.releaseId} existing={item} checkedAt={checkedAt} changed={reload} />}
    </article>)}</div>
    <nav className="hub-actions" aria-label="Your upload pages">
      {uploadCursor && <button className="btn btn-ghost" onClick={() => setUploadCursor(undefined)}>Newest uploads</button>}
      {uploads?.nextCursor && <button className="btn btn-ghost" onClick={() => setUploadCursor(uploads.nextCursor ?? undefined)}>Older uploads</button>}</nav></div>
  </section>;
}
