"use client";

import { useCallback, useState } from "react";
import type { FormEvent } from "react";
import { MasterApiError } from "@/lib/account/api";
import { incidentResolution, resolveIncident, resolutionError } from "@/lib/account/incidents-api";
import type { IncidentResolution, IncidentResolutionInput } from "@/lib/account/incidents-api";
import { useSession } from "@/lib/account/session";
import { AdminSpinner, useAdminActivity } from "./admin-activity";
import { ErrorStrip, useAdminData } from "./use-admin-data";

export function ResolutionBadge({ resolution }: { resolution?: IncidentResolution }) {
  return <span className={`adm-chip ${resolution?.status === "resolved" ? "adm-resolution-resolved" : "adm-chip-dim"}`}>
    {resolution ? resolution.status === "resolved" ? "Resolved" : "Open" : "Status unavailable"}
  </span>;
}

export function IncidentResolutionPanel({ id, onSaved }: { id: string; onSaved: (value: IncidentResolution) => void }) {
  // Fetch the current revision rather than trusting a potentially stale inbox row.
  const load = useCallback(async (token: string) => {
    try { return await incidentResolution(token, id); }
    catch (error) {
      if (error instanceof MasterApiError) throw new MasterApiError(error.code, resolutionError(error), error.status);
      throw error;
    }
  }, [id]);
  const { token, data, setData, error, loading, reload } = useAdminData(load);
  const [draft, setDraft] = useState<IncidentResolutionInput | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [notice, setNotice] = useState("");
  const { clear } = useSession();
  const { begin } = useAdminActivity();

  function edit(status: "open" | "resolved") {
    if (!data) return;
    setDraft({ status, expectedRevision: data.revision, reason: data.reason ?? "", problem: data.problem ?? "", fix: data.fix ?? "" });
    setSaveError(null); setNotice("");
  }
  function reloadSaved() {
    setDraft(null); setSaveError(null); setNotice(""); reload();
  }
  async function save(event: FormEvent) {
    event.preventDefault();
    if (!token || !draft || saving) return;
    setSaving(true); setSaveError(null); setNotice("");
    const finish = begin();
    try {
      const value = await resolveIncident(token, id, draft);
      setData(value); setDraft(null); onSaved(value);
      setNotice(value.status === "resolved" ? "Report resolved. Resolution saved on the master." : "Report reopened. Notes retained on the master.");
      finish(true);
    } catch (error) {
      if (error instanceof MasterApiError && error.status === 401) clear();
      setSaveError(resolutionError(error)); finish(false);
    } finally { setSaving(false); }
  }

  return <section className="adm-resolution" aria-label="Report resolution" aria-busy={saving || loading}>
    <div className="adm-panel-head"><h3 className="adm-panel-title">Resolution</h3>{data ? <ResolutionBadge resolution={data} /> : null}</div>
    <p className="adm-footnote">Staff notes only. Resolving keeps the original evidence and its existing retention period. Do not include secrets.</p>
    {loading ? <AdminSpinner label="Loading resolution" /> : null}
    <ErrorStrip message={error} />
    {error ? <button className="ac-iconbtn" onClick={reload} disabled={loading || saving}>Retry resolution request</button> : null}
    {data ? <>
      {data.updatedAtUtc ? <p className="adm-resolution-meta">Last {data.status === "resolved" ? "resolved / edited" : "reopened"}: <time dateTime={data.updatedAtUtc}>{new Date(data.updatedAtUtc).toISOString().replace("T", " ").slice(0, 19)} UTC</time><br />Admin account: <span className="adm-mono">{data.updatedByAccountId}</span></p> : null}
      {!draft ? <>
        <dl className="adm-resolution-notes">
          {([["Reason", data.reason], ["Problem identified", data.problem], ["Fix / how it was resolved", data.fix]] as const).map(([label, value]) => value ? <div key={label}><dt>{label}</dt><dd>{value}</dd></div> : null)}
        </dl>
        {data.status === "resolved" && !data.reason && !data.problem && !data.fix ? <p className="adm-footnote">Resolved without additional notes.</p> : null}
        <div className="adm-action-row">
          <button className="ac-iconbtn adm-primary" disabled={loading || !!error} onClick={() => edit("resolved")}>{data.status === "resolved" ? "Edit resolution" : "Resolve report"}</button>
          {data.status === "resolved" ? <button className="ac-iconbtn" disabled={loading || !!error} onClick={() => edit("open")}>Reopen report</button> : null}
        </div>
      </> : <form className="adm-resolution-form" onSubmit={save}>
        <fieldset disabled={saving}>
          <legend>{draft.status === "open" ? "Reopen this report" : "Resolve this report"} · all notes are optional</legend>
          <label className="ac-label">Reason (optional)<textarea className="ac-input" rows={2} maxLength={500} autoFocus value={draft.reason} onChange={e => setDraft({ ...draft, reason: e.target.value })} placeholder="Fixed in a release, duplicate, no longer reproducible…" /><span className="adm-resolution-count">{draft.reason?.length ?? 0} / 500</span></label>
          <label className="ac-label">Problem identified (optional)<textarea className="ac-input" rows={3} maxLength={4000} value={draft.problem} onChange={e => setDraft({ ...draft, problem: e.target.value })} placeholder="What caused the crash?" /><span className="adm-resolution-count">{draft.problem?.length ?? 0} / 4,000</span></label>
          <label className="ac-label">Fix / how it was resolved (optional)<textarea className="ac-input" rows={3} maxLength={4000} value={draft.fix} onChange={e => setDraft({ ...draft, fix: e.target.value })} placeholder="Describe the fix, workaround, commit or release." /><span className="adm-resolution-count">{draft.fix?.length ?? 0} / 4,000</span></label>
          <ErrorStrip message={saveError} />
          {saveError ? <button className="ac-iconbtn" type="button" onClick={reloadSaved}>Reload saved version (discard draft)</button> : null}
          <div className="adm-action-row"><button className="ac-iconbtn" type="button" onClick={() => { setDraft(null); setSaveError(null); }}>Cancel</button><button className="ac-iconbtn adm-primary" type="submit">{saving ? <AdminSpinner label="Saving resolution" /> : draft.status === "open" ? "Confirm reopen" : data.status === "resolved" ? "Save resolution" : "Confirm resolve"}</button></div>
        </fieldset>
      </form>}
    </> : null}
    <p className="adm-footnote" role="status">{notice}</p>
  </section>;
}
