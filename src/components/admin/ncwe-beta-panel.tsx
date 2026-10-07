"use client";

import Link from "next/link";
import { useCallback, useEffect, useId, useRef, useState } from "react";
import { CheckIcon, SearchIcon } from "@/components/icons";
import { MasterApiError } from "@/lib/account/api";
import * as beta from "@/lib/account/ncwe-beta-api";
import type { AdminNcweBetaDecision, AdminNcweBetaRow, NcweBetaStatusValue } from "@/lib/account/ncwe-beta-api";
import { ArmButton } from "./arm-button";
import { formatDateTime, safeHttpUrl } from "./format";
import { ErrorStrip, useAdminData } from "./use-admin-data";
import styles from "./ncwe-beta-panel.module.css";

type Filter = NcweBetaStatusValue | "all";
const STATUS_LABEL: Record<NcweBetaStatusValue, string> = { pending: "Pending", approved: "Accepted", rejected: "Declined" };
const DEFAULT_AVATAR = "https://cdn.discordapp.com/embed/avatars/0.png";

/** Discord CDN avatars only: the URL comes from the master, which built it from Discord's answer. */
function avatar(url: string | null): string {
  return url && url.startsWith("https://cdn.discordapp.com/") ? url : DEFAULT_AVATAR;
}

function snowflakeDate(id: string): string | null {
  try { return new Date(Number((BigInt(id) >> 22n) + 1420070400000n)).toISOString(); } catch { return null; }
}

function outcome(decision: AdminNcweBetaDecision, verb: string): string {
  const row = decision.row;
  const who = `${row.displayName} (@${row.application.discord.username})`;
  if (decision.discordState === "failed") return `${verb} ${who}, but Discord failed: ${decision.discordError ?? "unknown error"}. Open the application to retry.`;
  if (verb === "Accepted" && decision.discordState === "done") return `Accepted ${who}: NCWE Preview role given on Discord.`;
  if (verb === "Declined" && decision.discordState === "done") return `Declined ${who}: the Discord role was taken back.`;
  return `${verb} ${who}.`;
}

export function NcweBetaPanel() {
  const [input, setInput] = useState("");
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<Filter>("pending");
  const [page, setPage] = useState(1);
  const [selection, setSelection] = useState<AdminNcweBetaRow | null>(null);
  const [note, setNote] = useState("");
  const [announce, setAnnounce] = useState(true);
  const [busy, setBusy] = useState(false);
  const [mutationError, setMutationError] = useState<string | null>(null);
  const [notice, setNotice] = useState("");
  const inFlight = useRef(false);
  const dialog = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  const noteId = useId();
  useEffect(() => {
    const timer = setTimeout(() => { setQuery(input.trim()); setPage(1); }, 350);
    return () => clearTimeout(timer);
  }, [input]);
  useEffect(() => {
    if (selection) { if (!dialog.current?.open) dialog.current?.showModal(); }
    else dialog.current?.close();
  }, [selection]);
  const load = useCallback((token: string) => beta.adminNcweBeta(token, filter === "all" ? undefined : filter, query, page), [filter, query, page]);
  const { token, data, error, loading, reload } = useAdminData(load);

  function open(row: AdminNcweBetaRow) {
    setNote(row.application.decisionNote ?? ""); setAnnounce(true); setMutationError(null); setSelection(row);
  }

  async function run(action: (token: string, row: AdminNcweBetaRow) => Promise<AdminNcweBetaDecision>, verb: string) {
    if (!selection || !token || inFlight.current) return;
    const row = selection;
    inFlight.current = true; setBusy(true); setMutationError(null);
    try {
      const decision = await action(token, row);
      setNotice(outcome(decision, verb));
      // A Discord failure keeps the application open on screen, with its retry button.
      if (decision.discordState === "failed") { setSelection(decision.row); setMutationError(decision.discordError ?? "Discord failed."); }
      else setSelection(null);
      reload();
    } catch (err) {
      setMutationError(err instanceof MasterApiError ? err.message : "The request failed. Refresh the list to check the current state.");
      if (err instanceof MasterApiError && err.code === "application_changed") reload();
    } finally { inFlight.current = false; setBusy(false); }
  }

  const decide = (decision: "approve" | "reject" | "reopen", verb: string) => run((t, row) =>
    beta.decideNcweBeta(t, row.application.accountId, decision, { revision: row.application.revision, note, announce }), verb);
  const pages = data ? Math.max(1, Math.ceil(data.total / data.pageSize)) : 1;
  const counts: Record<Filter, number | undefined> = { pending: data?.pending, approved: data?.approved, rejected: data?.rejected,
    all: data ? data.pending + data.approved + data.rejected : undefined };
  const current = selection?.application;

  return <section className="adm-panel">
    <div className="adm-panel-head">
      <h2 className="adm-panel-title"><CheckIcon size={16} /> NCWE closed beta</h2>
      <div className="adm-search"><SearchIcon size={13} /><input value={input} onChange={e => setInput(e.target.value)}
        placeholder="Search e-mail, name, Discord user or ID…" aria-label="Search NCWE beta applications" maxLength={96} spellCheck={false} /></div>
    </div>
    <p className="adm-footnote">Applications from <Link href="/ncwe">/ncwe</Link>. Accepting gives the Discord account the NCWE Preview role and posts a
      welcome tagging the member; declining an accepted application takes the role back. Notes are shown to the applicant.</p>
    <div className="adm-toolbar"><div className="adm-filters" role="group" aria-label="Filter applications">
      {([["pending", "Pending"], ["approved", "Accepted"], ["rejected", "Declined"], ["all", "All"]] as const).map(([value, label]) =>
        <button key={value} type="button" className={`ac-iconbtn${filter === value ? " is-copied" : ""}`} aria-pressed={filter === value}
          onClick={() => { setFilter(value); setPage(1); }}>{label}{counts[value] !== undefined ? <span className={styles.count}>{counts[value]}</span> : null}</button>)}
    </div><button type="button" className="ac-iconbtn" disabled={loading} onClick={reload}>Refresh list</button></div>
    <ErrorStrip message={error} />
    {notice ? <p className="ac-success" role="status" style={{ marginBottom: 12 }}><CheckIcon />{notice}</p> : null}
    {loading && !data ? <p className="ac-loading" role="status">Loading applications…</p> : null}
    {data && !data.items.length ? <p className="adm-empty">{filter === "pending" && !query ? "No application is waiting for review." : "No application matches."}</p> : null}
    {data?.items.length ? <div className="adm-tablewrap"><table className="adm-table"><thead><tr>
      <th>Account</th><th>Discord</th><th>Why NCWE</th><th>Sent</th><th>Status</th><th>Actions</th>
    </tr></thead><tbody>{data.items.map(row => {
      const app = row.application;
      return <tr key={app.accountId}>
        <td><strong>{row.displayName}</strong><span className={styles.sub}>{row.email}{row.emailVerified ? "" : " · unverified"}</span></td>
        <td><div className={styles.who}>
          {/* eslint-disable-next-line @next/next/no-img-element -- Discord CDN avatar */}
          <img src={avatar(app.discord.avatarUrl)} alt="" width={32} height={32} referrerPolicy="no-referrer" />
          <div><strong>{app.discord.displayName || app.discord.username}</strong><small>@{app.discord.username}</small></div>
        </div></td>
        <td><div className={styles.excerpt}>{app.motivation}</div></td>
        <td><span className={styles.sub}>{formatDateTime(app.createdAtUtc)}</span></td>
        <td><span className={styles.status} data-status={app.status}>{STATUS_LABEL[app.status]}</span>
          {row.discordState === "failed" ? <span className={styles.discordState} data-state="failed">Discord failed</span> : null}</td>
        <td><button type="button" className="ac-iconbtn" disabled={busy} onClick={() => open(row)}>Review</button></td>
      </tr>;
    })}</tbody></table></div> : null}
    {data ? <div className="adm-pager"><span className="adm-pager-range">{data.total} applications · page {data.page} of {pages}</span>
      <div className="adm-pager-controls"><button type="button" className="ac-iconbtn" disabled={loading || page <= 1} onClick={() => setPage(page - 1)}>Previous</button>
        <button type="button" className="ac-iconbtn" disabled={loading || page >= pages} onClick={() => setPage(page + 1)}>Next</button></div></div> : null}

    <dialog ref={dialog} className={`adm-email-dialog ${styles.dialog}`} aria-labelledby={titleId}
      onCancel={e => { if (inFlight.current) e.preventDefault(); else setSelection(null); }} onClose={() => { if (!inFlight.current) setSelection(null); }}>
      {selection && current ? <>
        <div className={styles.dialogHead}>
          <h2 id={titleId}>{selection.displayName}</h2>
          <span className={styles.status} data-status={current.status}>{STATUS_LABEL[current.status]}</span>
        </div>
        <div className={styles.cards}>
          <div className={styles.card}><h3>OPEN//77 account</h3>
            <strong>{selection.displayName}</strong>
            <span className={styles.sub}>{selection.email} · {selection.emailVerified ? "verified" : "not verified"}</span>
            <span className={styles.sub}>{selection.role} · {selection.accountStatus} · since {formatDateTime(selection.accountCreatedAtUtc)}</span>
            <span className={styles.sub}>{current.accountId}</span>
          </div>
          <div className={styles.card}><h3>Discord</h3>
            <div className={styles.who}>
              {/* eslint-disable-next-line @next/next/no-img-element -- Discord CDN avatar */}
              <img src={avatar(current.discord.avatarUrl)} alt="" width={48} height={48} referrerPolicy="no-referrer" />
              <div><strong>{current.discord.displayName || current.discord.username}</strong>
                <small>@{current.discord.username} · {current.discord.userId}</small></div>
            </div>
            <span className={styles.sub} style={{ marginTop: 8 }}>
              {current.discord.joinedServerAtUtc ? `On the server since ${formatDateTime(current.discord.joinedServerAtUtc)}` : "Join date unknown"}
              {snowflakeDate(current.discord.userId) ? ` · account created ${formatDateTime(snowflakeDate(current.discord.userId)!)}` : ""}
            </span>
          </div>
        </div>
        <dl className={styles.answers}>
          <div><dt>Why NCWE</dt><dd>{current.motivation}</dd></div>
          <div><dt>First build</dt><dd>{current.plans}</dd></div>
          <div><dt>Experience</dt><dd>{current.experience}</dd></div>
          <div><dt>Time for the beta</dt><dd>{beta.NCWE_AVAILABILITY.find(([value]) => value === current.availability)?.[1] ?? current.availability}</dd></div>
          {current.portfolioUrl ? <div><dt>Portfolio</dt><dd>{safeHttpUrl(current.portfolioUrl)
            ? <a href={safeHttpUrl(current.portfolioUrl)!} target="_blank" rel="noopener noreferrer nofollow">{current.portfolioUrl}</a> : current.portfolioUrl}</dd></div> : null}
          <div><dt>Submitted</dt><dd>{formatDateTime(current.createdAtUtc)}{current.status === "pending" && current.updatedAtUtc !== current.createdAtUtc ? ` · edited ${formatDateTime(current.updatedAtUtc)}` : ""} · revision {current.revision}</dd></div>
        </dl>
        {current.decidedAtUtc ? <div className={styles.decision} data-failed={selection.discordState === "failed"}>
          {STATUS_LABEL[current.status]} {current.decidedAtUtc ? formatDateTime(current.decidedAtUtc) : ""}{selection.decidedByName ? ` by ${selection.decidedByName}` : ""}.
          {selection.discordState ? <> Discord: <strong>{selection.discordState}</strong>{selection.discordError ? ` (${selection.discordError})` : ""}
            {selection.discordDoneAtUtc && selection.discordState === "done" ? `, ${formatDateTime(selection.discordDoneAtUtc)}` : ""}.</> : null}
        </div> : null}
        <form className={styles.form} onSubmit={e => e.preventDefault()}>
          <label htmlFor={noteId}>Note to the applicant (optional, shown on their /ncwe page)</label>
          <textarea id={noteId} className="adm-ownership-reason-input" value={note} onChange={e => setNote(e.target.value)} maxLength={beta.NCWE_LIMITS.noteMax}
            rows={3} placeholder="Welcome aboard! Builds, news and feedback are in the NCWE channels on Discord." disabled={busy} />
          {current.status !== "approved" ? <label className={styles.check}><input type="checkbox" checked={announce} disabled={busy}
            onChange={e => setAnnounce(e.target.checked)} />Post the welcome message on Discord, tagging the member</label> : null}
          <ErrorStrip message={mutationError} />
          {busy ? <p role="status">Saving decision and updating Discord…</p> : null}
          <div className="adm-user-actions">
            <button type="button" className="ac-iconbtn" disabled={busy} onClick={() => setSelection(null)}>Close</button>
            {current.status === "rejected" ? <button type="button" className="ac-iconbtn" disabled={busy || !token}
              onClick={() => void decide("reopen", "Reopened")}>Back to pending</button> : null}
            {current.status === "approved" && selection.discordState === "failed" ? <button type="button" className="ac-iconbtn adm-primary" disabled={busy || !token}
              onClick={() => void run((t, row) => beta.retryNcweDiscord(t, row.application.accountId, true), "Retried Discord for")}>Retry Discord</button> : null}
            {current.status !== "rejected" ? <ArmButton label={current.status === "approved" ? "Withdraw access" : "Decline"}
              confirmLabel={current.status === "approved" ? "Confirm: take the role back" : "Confirm decline"} disabled={busy || !token}
              onConfirm={() => void decide("reject", "Declined")} /> : null}
            {current.status !== "approved" ? <button type="button" className="ac-iconbtn adm-primary" disabled={busy || !token}
              onClick={() => void decide("approve", "Accepted")}>Accept &amp; give the role</button> : null}
          </div>
        </form>
      </> : null}
    </dialog>
    <p className="adm-footnote">Every decision is recorded in the audit log with its author. The Discord account was checked on the server when the applicant
      confirmed it and again when they submitted.</p>
  </section>;
}
