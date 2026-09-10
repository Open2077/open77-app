"use client";

import { useState } from "react";
import type { FormEvent } from "react";
import { configureIncidentDiscord, incidentDiscord, incidentError } from "@/lib/account/incidents-api";
import { MasterApiError } from "@/lib/account/api";
import { useSession } from "@/lib/account/session";
import { AdminSpinner, useAdminActivity } from "./admin-activity";
import { ErrorStrip, useAdminData } from "./use-admin-data";

export function IncidentDiscordPanel() {
  const { token, data, setData, error, loading } = useAdminData(incidentDiscord);
  const { clear } = useSession();
  const { begin } = useAdminActivity();
  const [url, setUrl] = useState("");
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState("");
  const [failure, setFailure] = useState<string | null>(null);
  const [removeArmed, setRemoveArmed] = useState(false);
  async function save(enabled: boolean, remove = false) {
    if (!token) return;
    setBusy(true); setNotice(""); setFailure(null);
    const finish = begin();
    try {
      const next = await configureIncidentDiscord(token, { enabled, remove, ...(enabled && !remove && url.trim() ? { webhookUrl: url.trim() } : {}) });
      setData(next); setUrl(""); setRemoveArmed(false); setNotice(remove ? "Webhook removed." : "Discord settings saved. Future reports follow this configuration."); finish(true);
    } catch (e) { if (e instanceof MasterApiError && e.status === 401) clear(); setFailure(incidentError(e)); finish(false); }
    finally { setBusy(false); }
  }
  function submit(event: FormEvent) {
    event.preventDefault();
    if (url.trim() && !/^https:\/\/discord\.com\/api\/webhooks\/[0-9]{17,20}\/[A-Za-z0-9_-]{40,150}$/.test(url.trim())) {
      setFailure("Use an HTTPS discord.com/api/webhooks/… URL, without query parameters."); return;
    }
    void save(true);
  }
  return <details className="adm-panel adm-webhook">
    <summary><span>Discord notifications <span className="adm-faint">· Configure integration</span></span><span className={`adm-chip ${data?.enabled ? "adm-chip-ok" : "adm-chip-dim"}`}>{loading ? "Loading…" : data?.enabled ? "Enabled" : "Disabled"}</span></summary>
    <p className="adm-footnote">Only the incident ID, type, server ID, fingerprint and a private admin link are sent. No logs, account details or attachments. Existing reports are not replayed when enabling. The secret URL is never returned by the API.</p>
    <ErrorStrip message={failure ?? error} />
    <form className="adm-webhook-form" onSubmit={submit}>
      <label className="ac-label">{data?.configured ? "Replace webhook URL (leave blank to keep it)" : "Discord webhook URL"}<input className="ac-input" type="password" value={url} onChange={e => setUrl(e.target.value)} autoComplete="new-password" spellCheck={false} maxLength={300} placeholder={data?.destination ?? "https://discord.com/api/webhooks/…"} /></label>
      <button className="ac-iconbtn adm-primary" disabled={loading || busy || (!data?.configured && !url.trim())}>{busy ? <AdminSpinner label="Saving" /> : "Save & enable"}</button>
    </form>
    <div className="adm-toolbar" style={{ marginTop: 16 }}>
      <p className="adm-footnote">Delivery: {data?.delivery.state ?? "unknown"}{data?.delivery.lastSuccessUtc ? ` · Last sent ${new Date(data.delivery.lastSuccessUtc).toLocaleString()}` : " · No delivery recorded this runtime"}</p>
      <div className="adm-action-row"><button className="ac-iconbtn" disabled={!data?.enabled || busy || loading} onClick={() => void save(false)}>Disable</button><button className="ac-iconbtn" disabled={!data?.configured || busy || loading} onBlur={() => setRemoveArmed(false)} onClick={() => { if (removeArmed) void save(false, true); else setRemoveArmed(true); }}>{removeArmed ? "Confirm removal" : "Remove webhook"}</button></div>
    </div>
    {notice ? <p className="adm-footnote" role="status">{notice}</p> : null}
  </details>;
}
