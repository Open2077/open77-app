"use client";

import Link from "next/link";
import { useState, type FormEvent } from "react";
import { useSession } from "@/lib/account/session";
import { accountQuotas, saveAccountQuotas, quotaFields, type AccountQuota, type QuotaOverrides, type Quotas } from "@/lib/community/quotas";

export function CommunityQuotaPanel() {
  const { session } = useSession();
  return session?.role === "admin" ? <Editor key={session.accountId} token={session.token} ownId={session.accountId} /> : null;
}
function Editor({ token, ownId }: { token: string; ownId: string }) {
  const [id, setId] = useState(""), [current, setCurrent] = useState<AccountQuota | null>(null);
  const [fields, setFields] = useState<Record<keyof Quotas, string>>({ draftProjectsPerAccount: "", activeUploadsPerAccount: "", pendingBytesPerAccount: "", gitHubImportsPerDay: "" });
  const [reason, setReason] = useState(""), [error, setError] = useState(""), [status, setStatus] = useState(""), [busy, setBusy] = useState(false);
  function apply(value: AccountQuota) {
    setCurrent(value);
    setFields(Object.fromEntries(quotaFields.map(({ key }) => [key, value.overrides[key]?.toString() ?? ""])) as Record<keyof Quotas, string>);
  }
  async function load(event: FormEvent) {
    event.preventDefault(); if (busy) return;
    setBusy(true); setError(""); setStatus("");
    try { apply(await accountQuotas(token, id.trim(), AbortSignal.timeout(10000))); setReason(""); }
    catch (error) { setError(error instanceof Error ? error.message : "The account limits could not be loaded."); }
    finally { setBusy(false); }
  }
  async function save(event: FormEvent) {
    event.preventDefault(); if (!current || busy) return;
    setBusy(true); setError(""); setStatus("");
    try {
      const overrides = Object.fromEntries(quotaFields.map(({ key, maximum }) => {
        const value = fields[key].trim() === "" ? null : Number(fields[key]);
        if (value !== null && (!Number.isSafeInteger(value) || value < 1 || value > maximum)) throw new Error(`Choose a whole number from 1 to ${maximum} or leave the field blank.`);
        return [key, value];
      })) as QuotaOverrides;
      apply(await saveAccountQuotas(token, current.accountId, current.revision, overrides, reason.trim(), AbortSignal.timeout(10000)));
      setReason(""); setStatus("Creator allowances saved and recorded in the audit history.");
    } catch (error) { setError(error instanceof Error ? error.message : "The change could not be saved. Reload before retrying an uncertain result."); }
    finally { setBusy(false); }
  }
  return <section className="hub-review-panel"><Link href="/admin/resources">Back to Workshop review →</Link><h1>Creator publishing allowances</h1>
    <p>Review the account quotas before changing them. Blank overrides use global defaults. Package and inspection safety limits remain unchanged.</p>
    {error && <p className="hub-notice" role="alert">{error}</p>}{status && <p role="status">{status}</p>}
    <form className="hub-form" onSubmit={load}><label>Creator account ID<input required pattern="[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}" value={id} onChange={event => setId(event.target.value)} disabled={busy} /></label>
      <button className="btn btn-ghost" disabled={busy}>{busy ? "Working…" : current ? "Load account / discard form changes" : "Load account limits"}</button></form>
    {current && <form className="hub-form" onSubmit={save}><h2>Account {current.accountId}</h2><p>Review revision {current.revision}. Editing the lookup above does not change this selected account until you load it.</p>
      {quotaFields.map(({ key, label, maximum }) => <label key={key}>{label}<input type="number" min={1} max={maximum} step={1} placeholder="Global default" value={fields[key]} disabled={busy || current.accountId === ownId} onChange={event => setFields(value => ({ ...value, [key]: event.target.value }))} /><small>Current effective allowance: {current.effective[key].toLocaleString()}. Maximum: {maximum.toLocaleString()}.</small></label>)}
      {current.accountId === ownId ? <p className="hub-notice">Another administrator must review changes to your own quota.</p> : <><label>Reason for this change<textarea required maxLength={5000} value={reason} onChange={event => setReason(event.target.value)} disabled={busy} /></label><button className="btn btn-primary" disabled={busy || !reason.trim()}>Save reviewed allowances</button></>}
    </form>}
  </section>;
}
