"use client";

import { useEffect, useState, type FormEvent } from "react";
import { appealStatus, submitAppeal } from "@/lib/community/client-api";
import type { CommunityAppeal } from "@/lib/community/types";
import { useSession } from "@/lib/account/session";
import { useCommunityDraft } from "./use-community-draft";

export function AppealForm({ token, decisionId }: { token: string; decisionId: string }) {
  const [open, setOpen] = useState(false);
  const [visited, setVisited] = useState(false);
  return <details className="hub-report-form" open={open} onToggle={event => { setOpen(event.currentTarget.open); if (event.currentTarget.open) setVisited(true); }}><summary>Appeal this decision / check your appeal</summary>
    {visited && <AppealDetails token={token} decisionId={decisionId} />}</details>;
}

function AppealDetails({ token, decisionId }: { token: string; decisionId: string }) {
  const { session } = useSession();
  const memory = useCommunityDraft(session?.token === token ? session.accountId : undefined, `appeal:${decisionId}`);
  const reason = memory.draft?.text ?? "";
  const [appeal, setAppeal] = useState<CommunityAppeal | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [refresh, setRefresh] = useState(0);
  useEffect(() => {
    const controller = new AbortController();
    appealStatus(token, decisionId, AbortSignal.any([controller.signal, AbortSignal.timeout(10000)]))
      .then(value => { if (!controller.signal.aborted) { setAppeal(value.appeal); setLoaded(true); setError(""); } })
      .catch(error => { if (!controller.signal.aborted) setError(error instanceof Error ? error.message : "Appeal status could not be loaded."); });
    return () => controller.abort();
  }, [token, decisionId, refresh]);
  async function submit(event: FormEvent) {
    event.preventDefault(); setBusy(true); setError("");
    try { setAppeal(await submitAppeal(token, decisionId, reason, AbortSignal.timeout(10000))); memory.discard(); }
    catch (error) { setError(error instanceof Error ? error.message : "Your appeal could not be submitted."); }
    finally { setBusy(false); }
  }
  return <div>{error && <p className="hub-notice" role="alert">{error}</p>}
    {!loaded && !error && <p role="status">Loading appeal status…</p>}
    {appeal ? <div role="status"><h4>{appeal.state === "open" ? "Appeal awaiting review" : "Appeal reviewed"}</h4>
      <p>Reference: {appeal.appealId}</p><p className="hub-activity-reason">{appeal.reason}</p>
      {appeal.response && <><h4>Moderator response</h4><p className="hub-activity-reason">{appeal.response}</p></>}
      {memory.draft && <details><summary>An unsent local draft is also retained</summary><p>An appeal already exists for this decision. Review or copy your local text before discarding it.</p><textarea aria-label="Retained appeal draft" readOnly value={reason} /><button type="button" className="btn btn-ghost" onClick={() => { if (window.confirm("Discard your unsent appeal draft?")) memory.discard(); }}>Discard draft</button></details>}</div>
      : loaded && <form className="hub-form" onSubmit={submit}><p>Explain why this decision should be reconsidered, including relevant evidence or source links. You can submit one appeal for this decision. Moderators will respond in your Hub inbox; submitting an appeal does not change the content’s current status.</p>
        <label>Your explanation<textarea required maxLength={5000} value={reason} onChange={event => { if (!memory.save({ text: event.target.value })) setError("This tab holds 64 unsent drafts. Submit or explicitly discard another draft first; existing drafts have been kept."); }} readOnly={busy || session?.token !== token} /></label>
        {memory.draft && <p role="status">Draft kept in this tab for your account across Workshop pages. Reloading or closing the tab loses it. <button type="button" className="btn btn-ghost" disabled={busy} onClick={() => { if (window.confirm("Discard your unsent appeal?")) memory.discard(); }}>Discard draft</button></p>}
        <button className="btn btn-primary" disabled={busy || !reason.trim()}>{busy ? "Submitting…" : "Submit appeal"}</button></form>}
    <button className="btn btn-ghost" disabled={busy} onClick={() => setRefresh(value => value + 1)}>Refresh appeal status</button>
  </div>;
}
