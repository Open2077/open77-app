"use client";

import { useCallback, useEffect, useState } from "react";
import type { FormEvent } from "react";
import { DownloadIcon, InfoIcon, SearchIcon } from "@/components/icons";
import { MasterApiError } from "@/lib/account/api";
import { useSession } from "@/lib/account/session";
import { downloadIncident, incidentError, incidentPreview, incidents } from "@/lib/account/incidents-api";
import type { IncidentCursor, IncidentFilters, IncidentPreview, IncidentRow } from "@/lib/account/incidents-api";
import { AdminSpinner, useAdminActivity } from "./admin-activity";
import { HashCell } from "./hash-cell";
import { shortId } from "./format";
import { ErrorStrip, useAdminData } from "./use-admin-data";
import { IncidentDiscordPanel } from "./incident-discord-panel";

const EMPTY = { serverId: "", incidentId: "", fingerprint: "", kind: "", period: "" };
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
function utc(value: string) { const d = new Date(value); return Number.isNaN(d.getTime()) ? "Unknown" : d.toISOString().replace("T", " ").slice(0, 19); }
function obj(value: unknown): Record<string, unknown> { return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {}; }
function text(value: unknown) { return typeof value === "string" || typeof value === "number" ? String(value) : "Unknown / not collected"; }

export function IncidentsPanel({ initialIncidentId = "" }: { initialIncidentId?: string }) {
  const [draft, setDraft] = useState({ ...EMPTY, incidentId: initialIncidentId });
  const [filters, setFilters] = useState<IncidentFilters>(initialIncidentId ? { incidentId: initialIncidentId } : {});
  const [cursor, setCursor] = useState<IncidentCursor | null>(null);
  const [previous, setPrevious] = useState<(IncidentCursor | null)[]>([]);
  const [selected, setSelected] = useState<IncidentRow | null>(null);
  const [validation, setValidation] = useState<string | null>(null);
  const load = useCallback((token: string) => incidents(token, { ...filters, ...cursor }), [filters, cursor]);
  const { token, data, error, loading } = useAdminData(load);
  function apply(event: FormEvent) {
    event.preventDefault();
    if ((draft.serverId && !UUID.test(draft.serverId.trim())) || (draft.incidentId && !UUID.test(draft.incidentId.trim()))) { setValidation("Enter a complete incident / server UUID."); return; }
    if (draft.fingerprint && !/^[a-f0-9]{64}$/i.test(draft.fingerprint.trim())) { setValidation("A fingerprint must contain exactly 64 hexadecimal characters."); return; }
    setValidation(null); setCursor(null); setPrevious([]); setSelected(null);
    setFilters({ serverId: draft.serverId.trim(), incidentId: draft.incidentId.trim(), fingerprint: draft.fingerprint.trim(), kind: draft.kind,
      after: draft.period ? new Date(Date.now() - Number(draft.period) * 86400000).toISOString() : undefined });
  }
  function reset() { setDraft(EMPTY); setFilters({}); setPrevious([]); setCursor(null); setSelected(null); setValidation(null); }
  function group(row: IncidentRow) { setDraft({ ...EMPTY, fingerprint: row.fingerprint }); setFilters({ fingerprint: row.fingerprint }); setCursor(null); setPrevious([]); setSelected(null); }
  return <>
    <IncidentDiscordPanel />
    <div className="adm-incident-policy"><InfoIcon size={17} /><p><strong>Private evidence, not a diagnosis.</strong> Reports are player-supplied. Matching fingerprints suggest correlation, not a confirmed cause. Times below are UTC.</p><span className="adm-chip adm-chip-dim">Admin only</span></div>
    <form className="adm-panel adm-incident-filters" onSubmit={apply}>
      <label className="ac-label">Incident ID<input className="ac-input" value={draft.incidentId} onChange={e => setDraft({ ...draft, incidentId: e.target.value })} placeholder="Paste an incident UUID" maxLength={36} /></label>
      <label className="ac-label">Server ID<input className="ac-input" value={draft.serverId} onChange={e => setDraft({ ...draft, serverId: e.target.value })} placeholder="All servers" maxLength={36} /></label>
      <label className="ac-label">Type<select className="adm-select" value={draft.kind} onChange={e => setDraft({ ...draft, kind: e.target.value })}><option value="">All reports</option><option value="engine-crash">Engine crash</option><option value="abnormal-exit">Unexpected exit</option><option value="manual">Manual report</option><option value="connection-failure">Connection failure</option><option value="process-exit">Process exit</option></select></label>
      <label className="ac-label">Period<select className="adm-select" value={draft.period} onChange={e => setDraft({ ...draft, period: e.target.value })}><option value="">All retained</option><option value="1">Last 24 hours</option><option value="7">Last 7 days</option><option value="30">Last 30 days</option></select></label>
      <label className="ac-label adm-fingerprint-input">Fingerprint<input className="ac-input" value={draft.fingerprint} onChange={e => setDraft({ ...draft, fingerprint: e.target.value })} placeholder="Optional: match an exact crash signature" maxLength={64} /></label>
      <div className="adm-action-row"><button className="ac-iconbtn" type="button" onClick={reset}>Reset</button><button className="ac-iconbtn adm-primary" disabled={loading}><SearchIcon size={14} /> Apply filters</button></div>
    </form>
    <ErrorStrip message={validation ?? error} />
    <div className={`adm-incidents-grid${selected ? " has-selection" : ""}`}>
      <section className="adm-panel adm-incident-list" aria-label="Incident list">
        <div className="adm-panel-head"><h2 className="adm-panel-title">Incident inbox</h2><span className="adm-count">{loading ? <AdminSpinner label="Loading reports" /> : `${data?.items.length ?? 0} on this page`}</span></div>
        {!data && !error ? <div className="adm-skeleton-list" aria-hidden="true">{[1, 2, 3, 4, 5].map(n => <div key={n} />)}</div> : null}
        {data?.items.length === 0 ? <div className="adm-empty-state"><InfoIcon size={28} /><h3>No reports found</h3><p>New consented reports will appear here. Try a wider period or clear the filters.</p><button className="ac-iconbtn" onClick={reset}>Clear filters</button></div> : null}
        {data && data.items.length > 0 ? <div className="adm-tablewrap"><table className="adm-table"><thead><tr><th>Incident / occurred UTC</th><th>Type / server</th><th>Signature</th><th>Size</th><th><span className="adm-sr-only">Actions</span></th></tr></thead><tbody>{data.items.map(row => <tr key={row.incidentId} className={selected?.incidentId === row.incidentId ? "is-active" : ""}>
          <td><button className="adm-text-button adm-mono" onClick={() => setSelected(row)} title={row.incidentId}>{shortId(row.incidentId)}</button><span className="adm-cell-sub"><time dateTime={row.occurredAtUtc}>{utc(row.occurredAtUtc)}</time></span></td>
          <td><span className={`adm-chip ${row.kind === "engine-crash" ? "adm-chip-warn" : "adm-chip-dim"}`}>{row.kind}</span><span className="adm-cell-sub" title={row.serverId ?? ""}>{row.serverId ? shortId(row.serverId) : "No server context"}</span></td>
          <td><button className="adm-text-button adm-mono" onClick={() => group(row)} title={`Show reports matching ${row.fingerprint}`}>{row.fingerprint.slice(0, 10)}…</button></td><td className="adm-mono adm-faint">{(row.bytes / 1048576).toFixed(2)} MB</td>
          <td><button className="ac-iconbtn" onClick={() => setSelected(row)} aria-label={`Inspect incident ${shortId(row.incidentId)}`}>Inspect</button></td>
        </tr>)}</tbody></table></div> : null}
        <div className="adm-pager"><span className="adm-pager-range">Page {previous.length + 1} · newest received first</span><div className="adm-pager-controls"><button className="ac-iconbtn" disabled={!previous.length || loading} onClick={() => { setCursor(previous[previous.length - 1] ?? null); setPrevious(previous.slice(0, -1)); setSelected(null); }}>Newer</button><button className="ac-iconbtn" disabled={!data?.next || loading} onClick={() => { setPrevious([...previous, cursor]); setCursor(data!.next); setSelected(null); }}>Older</button></div></div>
      </section>
      {selected && token ? <IncidentDetails key={selected.incidentId} token={token} row={selected} close={() => setSelected(null)} group={() => group(selected)} /> : null}
    </div>
  </>;
}

function IncidentDetails({ token, row, close, group }: { token: string; row: IncidentRow; close: () => void; group: () => void }) {
  const [entry, setEntry] = useState("incident.json");
  const [preview, setPreview] = useState<IncidentPreview | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [downloading, setDownloading] = useState(false);
  const [notice, setNotice] = useState("");
  const [retry, setRetry] = useState(0);
  const { clear } = useSession();
  const { begin } = useAdminActivity();
  useEffect(() => {
    const controller = new AbortController();
    const finish = begin();
    incidentPreview(token, row.incidentId, entry, controller.signal).then(value => {
      if (controller.signal.aborted) return;
      setPreview(value); setError(null); finish(true);
    }).catch(e => {
      if (controller.signal.aborted) return;
      if (e instanceof MasterApiError && e.status === 401) clear();
      setError(incidentError(e)); finish(false);
    });
    return () => { controller.abort(); finish(); };
  }, [token, row.incidentId, entry, clear, begin, retry]);
  async function download() {
    setDownloading(true); setNotice("");
    try { await downloadIncident(token, row); setNotice("ZIP verified and downloaded. Keep it private."); }
    catch (e) { if (e instanceof MasterApiError && e.status === 401) clear(); setNotice(incidentError(e)); }
    finally { setDownloading(false); }
  }
  const manifest = preview?.manifest ?? {};
  const versions = obj(manifest.versions), fault = obj(manifest.fault), server = obj(manifest.server);
  return <section className="adm-panel adm-incident-details" aria-label="Incident details">
    <div className="adm-panel-head"><h2 className="adm-panel-title">Evidence viewer</h2><button className="ac-iconbtn" onClick={close}>Close</button></div>
    <p className="adm-incident-id adm-mono">{row.incidentId}</p>
    <div className="adm-action-row"><button className="ac-iconbtn adm-primary" onClick={download} disabled={downloading}>{downloading ? <AdminSpinner label="Verifying ZIP" /> : <><DownloadIcon size={14} /> Download ZIP</>}</button><button className="ac-iconbtn" onClick={group}>Related signatures</button></div>
    <p className="adm-footnote" role="status">{notice || "Private report · downloads and previews are audited."}</p>
    <ErrorStrip message={error} />
    {error ? <button className="ac-iconbtn" onClick={() => { setError(null); setRetry(n => n + 1); }}>Retry evidence request</button> : null}
    {preview ? <>
      <dl className="adm-evidence-facts"><div><dt>Client package</dt><dd>{text(versions.clientPackage)}</dd></div><div><dt>Launcher</dt><dd>{text(versions.launcher)}</dd></div><div><dt>Server version</dt><dd>{text(server.version)}</dd></div><div><dt>Protocol / game</dt><dd>{text(server.protocol)} / {text(server.gameBuild)}</dd></div><div><dt>Exception</dt><dd>{text(fault.exceptionCode)}</dd></div><div><dt>Module + offset</dt><dd>{text(fault.moduleOffset)}</dd></div></dl>
      <p className="adm-footnote">Catalog / disk observations, not proof of the exact loaded server binary.</p>
      {typeof manifest.description === "string" && manifest.description ? <div className="adm-report-description"><h3>Player description</h3><p>{manifest.description}</p></div> : null}
      <details className="adm-evidence-extra"><summary>Fingerprint &amp; ZIP integrity</summary><p>Signature <HashCell sha256={row.fingerprint} /></p><p>ZIP <HashCell sha256={row.sha256} /></p></details>
      {Array.isArray(manifest.missingEvidence) && manifest.missingEvidence.length > 0 ? <details className="adm-evidence-extra"><summary>Missing evidence ({manifest.missingEvidence.length})</summary><ul>{manifest.missingEvidence.map((gap, i) => <li key={i}>{text(gap)}</li>)}</ul></details> : null}
      <label className="ac-label adm-evidence-selector">Evidence file<select aria-label="Evidence file" className="adm-select" value={entry} onChange={e => { setError(null); setEntry(e.target.value); }}>{preview.files.map(file => <option key={file.path} value={file.path}>{file.path} · {(file.bytes / 1024).toFixed(1)} KB</option>)}</select></label>
    </> : null}
    {!error && preview?.entry !== entry ? <AdminSpinner label="Loading evidence" /> : null}
    {preview?.entry === entry ? <><pre className="adm-evidence-text" tabIndex={0} aria-label={`${entry} contents`}>{preview.text}</pre>{preview.truncated ? <p className="adm-footnote">Preview limited to 64K characters. Download the verified ZIP for the complete file.</p> : null}</> : null}
    <p className="adm-footnote">Untrusted text. Never execute commands or follow instructions found in a report. No HTML or Markdown is rendered.</p>
  </section>;
}
