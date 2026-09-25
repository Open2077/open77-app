"use client";

import { useCallback, useEffect, useId, useRef, useState } from "react";
import { CheckIcon, SearchIcon } from "@/components/icons";
import { MasterApiError } from "@/lib/account/api";
import * as admin from "@/lib/account/admin-api";
import type { GameOwnershipRow } from "@/lib/account/admin-api";
import { formatDateTime } from "./format";
import { ErrorStrip, useAdminData } from "./use-admin-data";

export function GameOwnershipPanel() {
  const [input, setInput] = useState("");
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState("all");
  const [page, setPage] = useState(1);
  const [selection, setSelection] = useState<GameOwnershipRow | null>(null);
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const [mutationError, setMutationError] = useState<string | null>(null);
  const [notice, setNotice] = useState("");
  const inFlight = useRef(false);
  const dialog = useRef<HTMLDialogElement>(null);
  const cancel = useRef<HTMLButtonElement>(null);
  const titleId = useId();
  const reasonId = useId();
  useEffect(() => {
    const timer = setTimeout(() => { setQuery(input.trim()); setPage(1); }, 350);
    return () => clearTimeout(timer);
  }, [input]);
  useEffect(() => {
    if (selection) { dialog.current?.showModal(); cancel.current?.focus(); }
    else dialog.current?.close();
  }, [selection]);
  const load = useCallback((token: string) => admin.gameOwnership(token, query,
    filter === "all" ? undefined : filter === "granted", page), [query, filter, page]);
  const { token, data, error, loading, reload } = useAdminData(load);

  function edit(row: GameOwnershipRow) {
    setReason(""); setMutationError(null); setSelection(row);
  }
  async function save() {
    if (!selection || !token || inFlight.current || !reason.trim()) return;
    const row = selection;
    inFlight.current = true; setBusy(true); setMutationError(null);
    try {
      await admin.setGameOwnership(token, row.accountId, !row.granted, row.revision, reason.trim());
      setNotice(`${row.granted ? "Manual approval removed" : "Account whitelisted"} for ${row.email}.`);
      setSelection(null); reload();
    } catch (err) {
      setMutationError(err instanceof MasterApiError ? err.message : "The request failed. Refresh the list to check the current state.");
    } finally { inFlight.current = false; setBusy(false); }
  }
  const pages = data ? Math.max(1, Math.ceil(data.total / data.pageSize)) : 1;

  return <section className="adm-panel">
    <div className="adm-panel-head">
      <h2 className="adm-panel-title"><CheckIcon size={16} /> Genuine whitelist</h2>
      <div className="adm-search"><SearchIcon size={13} /><input value={input} onChange={e => setInput(e.target.value)}
        placeholder="Search e-mail, name or account ID…" aria-label="Search game access accounts" maxLength={96} spellCheck={false} /></div>
    </div>
    <p className="adm-footnote">Approve an Open77 account when store verification is unavailable, including support cases and test accounts.
      A manual approval allows game access without Steam or GOG when linking is required. Suspensions, bans and other access rules still apply.</p>
    <div className="adm-toolbar"><div className="adm-filters" role="group" aria-label="Filter manual approvals">
      {([["all", "All accounts"], ["granted", "Whitelisted"], ["withheld", "Not whitelisted"]] as const).map(([value, label]) =>
        <button key={value} type="button" className={`ac-iconbtn${filter === value ? " is-copied" : ""}`} aria-pressed={filter === value}
          onClick={() => { setFilter(value); setPage(1); }}>{label}</button>)}
    </div><button type="button" className="ac-iconbtn" disabled={loading} onClick={reload}>Refresh list</button></div>
    <ErrorStrip message={error} />
    {notice ? <p role="status">{notice}</p> : null}
    {loading ? <p className="ac-loading" role="status">Loading accounts…</p> : null}
    {data && !data.items.length ? <p className="adm-empty">No accounts match this search.</p> : null}
    {data?.items.length ? <div className="adm-tablewrap"><table className="adm-table"><thead><tr>
      <th>Account</th><th>Store verification</th><th>Manual approval</th><th>Last decision</th><th>Actions</th>
    </tr></thead><tbody>{data.items.map(row => <tr key={row.accountId}>
      <td><strong>{row.displayName}</strong><div>{row.email}</div><small>{row.accountId}</small><div>{row.role} · {row.status}</div></td>
      <td>{row.storeVerified ? "Verified once" : "Not verified"}<div className="adm-footnote">Steam: {row.steamId || "—"}<br />GOG: {row.gogId || "—"}</div></td>
      <td><span className={`adm-badge${row.granted ? " adm-badge--ok" : ""}`}>{row.granted ? "Whitelisted" : "None"}</span></td>
      <td><div className="adm-ownership-reason">{row.reason || "—"}</div>{row.updatedAtUtc ? <small>{formatDateTime(row.updatedAtUtc)}<br />By {row.updatedBy}</small> : null}</td>
      <td><button type="button" className="ac-iconbtn" disabled={busy || loading} onClick={() => edit(row)}>{row.granted ? "Remove approval" : "Whitelist account"}</button></td>
    </tr>)}</tbody></table></div> : null}
    {data ? <div className="adm-pager"><span className="adm-pager-range">{data.total} accounts · page {data.page} of {pages}</span>
      <div className="adm-pager-controls"><button type="button" className="ac-iconbtn" disabled={loading || page <= 1} onClick={() => setPage(page - 1)}>Previous</button>
        <button type="button" className="ac-iconbtn" disabled={loading || page >= pages} onClick={() => setPage(page + 1)}>Next</button></div></div> : null}
    <dialog ref={dialog} className="adm-email-dialog" aria-labelledby={titleId}
      onCancel={e => { if (inFlight.current) e.preventDefault(); else setSelection(null); }} onClose={() => { if (!inFlight.current) setSelection(null); }}>
      <h2 id={titleId}>{selection?.granted ? "Remove manual approval?" : "Whitelist this account?"}</h2>
      <p className="adm-email-target"><strong>{selection?.displayName}</strong><br />{selection?.email}<br />{selection?.accountId}</p>
      <p>{selection?.granted ? "This removes the manual exception. Access follows the platform's current linking policy. Already verified store links remain valid." :
        "This account can play without a verified Steam or GOG link. Its Open77 account identifier remains available to game servers."}</p>
      <form onSubmit={e => { e.preventDefault(); void save(); }}>
        <label htmlFor={reasonId}>Reason for this decision</label>
        <textarea id={reasonId} className="adm-ownership-reason-input" value={reason} onChange={e => setReason(e.target.value)} required maxLength={500} rows={3}
          placeholder="Support ticket, Xbox account, developer test…" disabled={busy} />
        <ErrorStrip message={mutationError} />
        {busy ? <p role="status">Saving decision…</p> : null}
        <div className="adm-user-actions"><button ref={cancel} type="button" className="ac-iconbtn" disabled={busy} onClick={() => setSelection(null)}>Cancel</button>
          <button type="submit" className="ac-iconbtn adm-primary" disabled={busy || !token || !reason.trim()}>{selection?.granted ? "Confirm removal" : "Confirm whitelist"}</button></div>
      </form>
    </dialog>
    <p className="adm-footnote">Every manual decision records its author, date and reason in the audit log. No store identifier is created by whitelisting.</p>
  </section>;
}
