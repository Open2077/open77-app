"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import * as github from "@/lib/community/github-api";
import type { StoredSession } from "@/lib/account/session";
import { GitHubConnectionControl } from "./github-connection";

const message = (error: unknown) => error instanceof Error ? error.message : "GitHub could not complete this request.";
const size = (bytes: number) => `${(bytes / 1024 / 1024).toFixed(2)} MiB`;
const eligible = (asset: github.GitHubAsset) => asset.name.toLowerCase().endsWith(".zip") && asset.sizeBytes > 0 && asset.sizeBytes <= 100 * 1024 * 1024 && !!asset.sha256;

function Provenance({ selection, verifiedAt }: { selection: github.GitHubSelection; verifiedAt?: string | null }) {
  return <div className="hub-notice">
    <p><a href={selection.sourceUrl} target="_blank" rel="noopener noreferrer">{selection.repository.fullName} · {selection.release.tag} ↗</a></p>
    <p><strong>{selection.asset.name}</strong> · {size(selection.asset.sizeBytes)} · Asset {selection.asset.assetId}</p>
    <p className="hub-release-digest">SHA-256 <code>{selection.asset.sha256}</code></p>
    {selection.release.commitSha && <p className="hub-release-digest">Commit <code>{selection.release.commitSha}</code></p>}
    <p>{verifiedAt ? `Repository control was verified on ${new Date(verifiedAt).toLocaleString()}.` : "A source link does not establish repository control or permission to redistribute."}</p>
  </div>;
}

export function GitHubImportStatus({ token, id, checkedAt }: { token: string; id: string; checkedAt: number }) {
  const [value, setValue] = useState<github.GitHubImport | null>(null);
  const [error, setError] = useState("");
  useEffect(() => {
    const controller = new AbortController();
    void github.status(token, id, AbortSignal.any([controller.signal, AbortSignal.timeout(15000)]))
      .then(value => { if (!controller.signal.aborted) { setValue(value); setError(""); } })
      .catch(error => { if (!controller.signal.aborted) setError(message(error)); });
    return () => controller.abort();
  }, [token, id, checkedAt]);
  return <div>
    {error && <p className="hub-notice" role="alert">Import status unavailable: {error} Use Refresh status to retry.</p>}
    {value && <><p role="status">GitHub import: {value.state.replaceAll("_", " ")}{value.state === "accepted" ? " · Technical validation passed; publication still requires review." : ""}</p>
      {value.errorCode && <p className="hub-notice">Import result: <code>{value.errorCode}</code>. {["rejected", "dead"].includes(value.state) ? "Create a new ZIP submission after checking this result." : "The same selected asset is queued for another attempt."}</p>}
      {value.state === "expired" && <p>The import reservation expired. Start a new upload from the release above.</p>}
      <details><summary>Imported source and integrity</summary><Provenance selection={value.selection} verifiedAt={value.controlVerifiedAtUtc} />
        {value.fetchedAtUtc && <p>Fetched <time dateTime={value.fetchedAtUtc}>{new Date(value.fetchedAtUtc).toLocaleString()}</time></p>}</details></>}
  </div>;
}

export function GitHubImportPicker(props: { session: StoredSession; projectId: string; releaseId: string; sourceUrl?: string | null; changed: () => void }) {
  const [open, setOpen] = useState(false);
  return <details onToggle={event => { if (event.currentTarget.open) setOpen(true); }}><summary>Import a ZIP from a GitHub release</summary>
    {open && <Picker {...props} />}
  </details>;
}

function Picker({ session, projectId, releaseId, sourceUrl, changed }: { session: StoredSession; projectId: string; releaseId: string; sourceUrl?: string | null; changed: () => void }) {
  const token = session.token;
  const initial = (() => { try { const url = new URL(sourceUrl ?? ""); return url.hostname === "github.com" ? url.pathname.split("/").filter(Boolean).slice(0, 2) : []; } catch { return []; } })();
  const [owner, setOwner] = useState(initial[0] ?? "");
  const [repo, setRepo] = useState(initial[1] ?? "");
  const [available, setAvailable] = useState<boolean | null>(null);
  const [repository, setRepository] = useState<github.GitHubRepository | null>(null);
  const [releases, setReleases] = useState<github.GitHubPage<github.GitHubRelease> | null>(null);
  const [release, setRelease] = useState<github.GitHubRelease | null>(null);
  const [assets, setAssets] = useState<github.GitHubPage<github.GitHubAsset> | null>(null);
  const [selection, setSelection] = useState<github.GitHubSelection | null>(null);
  const [rights, setRights] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [submitted, setSubmitted] = useState<github.GitHubImport | null>(null);
  const [attempted, setAttempted] = useState(false);
  const requestId = useRef<string | null>(null);
  const controller = useRef<AbortController | null>(null);
  useEffect(() => {
    if (!busy) return;
    const warn = (event: BeforeUnloadEvent) => event.preventDefault();
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [busy]);
  useEffect(() => {
    const operation = new AbortController();
    void github.capabilities(AbortSignal.any([operation.signal, AbortSignal.timeout(10000)]))
      .then(value => { if (!operation.signal.aborted) setAvailable(value.features?.githubImports === true); })
      .catch(error => { if (!operation.signal.aborted) setError(message(error)); });
    return () => { operation.abort(); controller.current?.abort(); };
  }, []);
  async function run(action: (signal: AbortSignal) => Promise<void>) {
    if (busy) return;
    const operation = new AbortController(); controller.current = operation;
    setBusy(true); setError("");
    try { await action(AbortSignal.any([operation.signal, AbortSignal.timeout(55000)])); }
    catch (error) { if (!operation.signal.aborted) setError(message(error)); }
    finally { if (!operation.signal.aborted) setBusy(false); if (controller.current === operation) controller.current = null; }
  }
  function resetSelection() { setSelection(null); setRights(false); requestId.current = null; }
  function loadRepository(event: FormEvent) {
    event.preventDefault();
    void run(async signal => {
      const found = await github.repository(token, projectId, owner.trim(), repo.trim(), signal);
      const [canonicalOwner = "", canonicalRepo = ""] = found.fullName.split("/");
      const page = await github.releases(token, projectId, canonicalOwner, canonicalRepo, 1, signal);
      if (signal.aborted) return;
      setRepository(found); setReleases(page); setRelease(null); setAssets(null); resetSelection();
    });
  }
  function releasePage(page: number) {
    if (!repository) return;
    const [owner = "", repo = ""] = repository.fullName.split("/");
    void run(async signal => { const value = await github.releases(token, projectId, owner, repo, page, signal);
      if (!signal.aborted) { setReleases(value); setRelease(null); setAssets(null); resetSelection(); } });
  }
  function assetPage(selected: github.GitHubRelease, page: number) {
    if (!repository) return;
    const [owner = "", repo = ""] = repository.fullName.split("/");
    void run(async signal => { const value = await github.assets(token, projectId, owner, repo, selected.releaseId, page, signal);
      if (!signal.aborted) { setRelease(selected); setAssets(value); resetSelection(); } });
  }
  function preview(asset: github.GitHubAsset) {
    if (!repository || !release) return;
    const [owner = "", repo = ""] = repository.fullName.split("/");
    void run(async signal => { const value = await github.selection(token, projectId, owner, repo, release.releaseId, asset.assetId, signal);
      if (!signal.aborted) { setSelection(value); setRights(false); requestId.current = null; } });
  }
  function submit() {
    if (!selection || !rights) return;
    requestId.current ??= crypto.randomUUID(); setAttempted(true);
    void run(async signal => { const result = await github.submit(token, projectId, releaseId, requestId.current!, selection, signal);
      if (!signal.aborted) { setSubmitted(result); changed(); } });
  }
  if (submitted) return <p role="status">GitHub import queued. Follow its progress in your upload history. Validation and review are still required.</p>;
  const locked = busy || attempted;
  return <div className="hub-form">
    <p>Choose an uploaded ZIP asset from a public release. Source archives and repository build scripts are not imported.</p>
    {available === false && <p className="hub-notice">GitHub imports are currently paused. You can upload a ZIP directly.</p>}
    {available === null && !error && <p role="status">Checking import availability…</p>}
    {error && <p className="hub-notice" role="alert">{error}{attempted && " Your submission may already exist. Retry the same submission or refresh upload history before choosing another file."}</p>}
    {available === null && error && <button type="button" className="btn btn-ghost" disabled={busy} onClick={() => void run(async signal => setAvailable((await github.capabilities(signal)).features?.githubImports === true))}>Retry availability check</button>}
    {available && <><form onSubmit={loadRepository} className="hub-form">
      <div className="hub-form-row"><label>GitHub owner<input required maxLength={39} value={owner} disabled={locked} onChange={event => setOwner(event.target.value)} /></label>
        <label>Repository<input required maxLength={100} value={repo} disabled={locked} onChange={event => setRepo(event.target.value)} /></label></div>
      <button className="btn btn-ghost" disabled={locked}>Find public releases</button></form>
      {repository && <><p>Browsing <strong>{repository.fullName}</strong></p><GitHubConnectionControl key={`${session.token}:${repository.repositoryId}`} session={session} projectId={projectId} repository={repository} /></>}
      {releases && <div><h4>Choose a release</h4>{releases.items.length === 0 && <p>No public releases on this page. Upload a ZIP directly if the repository has no release assets.</p>}
        <div className="hub-actions">{releases.items.map(item => <button type="button" className="btn btn-ghost" key={item.releaseId} disabled={locked}
          aria-pressed={release?.releaseId === item.releaseId} onClick={() => assetPage(item, 1)}>{item.tag}{item.prerelease ? " · prerelease" : ""}</button>)}</div>
        <div className="hub-actions"><button type="button" className="btn btn-ghost" disabled={locked} onClick={() => releasePage(1)}>First release page</button>
          {releases.nextPage && <button type="button" className="btn btn-ghost" disabled={locked} onClick={() => releasePage(releases.nextPage!)}>More releases</button>}</div></div>}
      {assets && release && <div><h4>ZIP assets for {release.tag}</h4>{assets.items.length === 0 && <p>No uploaded assets on this page.</p>}
        <ul>{assets.items.map(asset => <li key={asset.assetId}><button type="button" className="btn btn-ghost" disabled={locked || !eligible(asset)} onClick={() => preview(asset)}>{asset.name} · {size(asset.sizeBytes)}</button>
          {!eligible(asset) && <small> Requires a ZIP up to 100 MiB with a GitHub SHA-256 digest. Older assets can be uploaded directly.</small>}</li>)}</ul>
        <div className="hub-actions"><button type="button" className="btn btn-ghost" disabled={locked} onClick={() => assetPage(release, 1)}>First asset page</button>
          {assets.nextPage && <button type="button" className="btn btn-ghost" disabled={locked} onClick={() => assetPage(release, assets.nextPage!)}>More assets</button>}</div></div>}
      {selection && <><h4>Confirm this source</h4><Provenance selection={selection} />
        <label className="hub-rights"><input type="checkbox" checked={rights} disabled={locked} onChange={event => setRights(event.target.checked)} />I have permission to redistribute this asset and all its included files under this release’s license.</label>
        <button type="button" className="btn btn-primary" disabled={busy || !rights} onClick={submit}>{busy ? "Submitting…" : attempted ? "Retry the same submission" : "Import ZIP for validation"}</button>
        {attempted && !busy && <button type="button" className="btn btn-ghost" onClick={() => { changed(); }}>Refresh upload history</button>}</>}
      {busy && <p role="status">Contacting GitHub…</p>}
    </>}
  </div>;
}
