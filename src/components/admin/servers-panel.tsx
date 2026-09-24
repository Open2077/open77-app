"use client";

import { useCallback, useRef, useState } from "react";
import { AdminSpinner, useAdminActivity } from "@/components/admin/admin-activity";
import { formatAge, shortId } from "@/components/admin/format";
import { ErrorStrip, useAdminData } from "@/components/admin/use-admin-data";
import { ServerRackIcon } from "@/components/icons";
import { MasterApiError } from "@/lib/account/api";
import * as admin from "@/lib/account/admin-api";

/** Master-owned labels are independent of owner-controlled metadata and heartbeats. */
export function ServersPanel() {
  const load = useCallback((token: string) => admin.servers(token), []);
  const { token, data, setData, error, loading, reload } = useAdminData(load);
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState("all");
  const [busy, setBusy] = useState(false);
  const inFlight = useRef(false);
  const [notice, setNotice] = useState("");
  const { begin } = useAdminActivity();

  async function save(server: admin.AdminServer, labels: admin.ServerDirectoryLabels) {
    if (!token || inFlight.current) throw new Error("Please wait for the current save.");
    inFlight.current = true;
    setBusy(true);
    setNotice("");
    const finish = begin();
    try {
      const updated = await admin.setServerDirectory(token, server.serverId, labels);
      setData(current => current?.map(row => row.serverId === server.serverId ? { ...row, ...updated } : row) ?? null);
      setNotice(updated.hidden
        ? `${server.name} is hidden from public lists. Direct connections remain available. Lists update on their next refresh.`
        : `Directory settings saved for ${server.name}. Lists update on their next refresh.`);
      finish(true);
    } catch (err) {
      finish(false);
      throw err;
    } finally {
      inFlight.current = false;
      setBusy(false);
    }
  }

  const shown = data?.filter(row =>
    (filter === "all" || (filter === "hidden" ? row.hidden : filter === "visible" ? !row.hidden : filter === "official" ? row.official : row.featured)) &&
    `${row.name} ${row.connectEndpoint} ${row.serverId} ${row.ownerEmail || ""}`.toLowerCase().includes(query.toLowerCase()));

  return <section className="adm-panel">
    <div className="adm-panel-head">
      <h2 className="adm-panel-title"><ServerRackIcon size={16} /> Server directory</h2>
      <button className="ac-iconbtn" type="button" onClick={reload} disabled={loading || busy}>
        {loading ? <AdminSpinner /> : null} Refresh
      </button>
    </div>
    <p className="adm-footnote">Hide a server to remove it from public lists on the website and launcher, including Featured. It remains manageable here and accessible by direct connection: this is not a ban. Visibility and labels persist across restarts and are audited. Lower featured order appears first.</p>
    <div className="adm-directory-toolbar">
      <label>Find a server<input className="ac-input" type="search" value={query} onChange={e => setQuery(e.target.value)} placeholder="Name, address, owner or server ID" /></label>
      <label>Show<select className="ac-input" value={filter} onChange={e => setFilter(e.target.value)}><option value="all">All servers</option><option value="visible">Not hidden</option><option value="hidden">Hidden</option><option value="featured">Featured</option><option value="official">Official</option></select></label>
      <span className="adm-count">{shown?.length ?? 0} / {data?.length ?? 0}</span>
    </div>
    <ErrorStrip message={error} />
    <p className="adm-directory-notice" role="status">{notice}</p>
    {loading && !data ? <p className="ac-loading"><AdminSpinner /> Loading servers…</p> : null}
    {shown?.length === 0 ? <p className="adm-empty">No servers match this view.</p> : null}
    {shown && shown.length > 0 ? <div className="adm-tablewrap"><table className="adm-table adm-directory-table">
      <thead><tr><th>Server / owner</th><th>Players / heartbeat</th><th>Public visibility</th><th>Official</th><th>Featured</th><th>Featured order</th><th>Save settings</th></tr></thead>
      <tbody>{shown.map(server => <ServerRow key={`${server.serverId}:${server.directoryRevision ?? 0}`} server={server} disabled={busy || loading} save={save} />)}</tbody>
    </table></div> : null}
    <p className="adm-footnote">Active sessions, hidden servers and offline curated servers are listed. Unhiding an offline server does not bring it online. Settings are tied to the stable server ID, not an IP address, and never bypass security checks or local-address filtering.</p>
  </section>;
}

function ServerRow({ server, disabled, save }: {
  server: admin.AdminServer; disabled: boolean;
  save: (server: admin.AdminServer, labels: admin.ServerDirectoryLabels) => Promise<void>;
}) {
  const [official, setOfficial] = useState(server.official ?? false);
  const [hidden, setHidden] = useState(server.hidden ?? false);
  const canEditVisibility = typeof server.hidden === "boolean";
  const [featured, setFeatured] = useState(server.featured ?? false);
  const [order, setOrder] = useState(String(server.featuredOrder ?? 0));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const validOrder = /^\d{1,3}$/.test(order);
  const changed = hidden !== !!server.hidden || official !== !!server.official || featured !== !!server.featured || Number(order) !== (server.featuredOrder ?? 0);
  async function submit() {
    if (!validOrder || disabled || saving) return;
    setSaving(true); setError(null);
    try { await save(server, { official, featured, featuredOrder: Number(order), directoryRevision: server.directoryRevision ?? 0, hidden }); }
    catch (err) { setError(err instanceof MasterApiError ? err.message : "Save failed. Please try again."); }
    finally { setSaving(false); }
  }
  return <tr>
    <td><strong>{server.name}</strong><div className="adm-mono adm-dim">{server.connectEndpoint}</div><div className="adm-faint" title={server.serverId}>{shortId(server.serverId)} · {server.ownerEmail ?? "Legacy enrollment"}</div><span className="adm-chip adm-chip-dim">{server.licenseLabel ?? "unlicensed"}</span></td>
    <td>{server.online === false ? <span className="adm-chip adm-chip-dim">Offline / not listed</span> : <><span className="adm-mono">{server.connectedPlayers}/{server.maximumPlayers}</span><div className="adm-faint">{formatAge(server.lastHeartbeatUtc)} ago</div></>}</td>
    <td><label className="adm-directory-toggle"><input type="checkbox" checked={hidden} onChange={e => setHidden(e.target.checked)} disabled={disabled || !canEditVisibility} aria-label={`Hide from public list: ${server.name}`} /><span>Hide from list</span></label><span className={`adm-chip ${server.hidden ? "adm-chip-warn" : "adm-chip-dim"}`}>{!canEditVisibility ? "Update master first" : server.hidden ? "Hidden" : "Not hidden"}</span></td>
    <td><label className="adm-directory-toggle"><input type="checkbox" checked={official} onChange={e => setOfficial(e.target.checked)} disabled={disabled} aria-label={`Official: ${server.name}`} /><span>{official ? "Official" : "Community"}</span></label></td>
    <td><label className="adm-directory-toggle"><input type="checkbox" checked={featured} onChange={e => setFeatured(e.target.checked)} disabled={disabled} aria-label={`Featured: ${server.name}`} /><span>{featured ? "Featured" : "Standard"}</span></label></td>
    <td><input className="ac-input adm-directory-order" type="number" min={0} max={999} step={1} value={order} onChange={e => setOrder(e.target.value)} disabled={disabled || !featured} aria-invalid={!validOrder} aria-label={`Featured order: ${server.name}`} /></td>
    <td><button type="button" className="ac-iconbtn" disabled={disabled || !changed || !validOrder} onClick={submit}>{saving ? <AdminSpinner /> : null}{saving ? "Saving…" : changed ? "Save changes" : "Saved"}</button><ErrorStrip message={error} /></td>
  </tr>;
}
