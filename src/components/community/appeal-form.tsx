"use client";

import { useEffect, useState, type FormEvent } from "react";
import { appealStatus, submitAppeal } from "@/lib/community/client-api";
import type { CommunityAppeal } from "@/lib/community/types";

export function AppealForm({ token, decisionId }: { token: string; decisionId: string }) {
  const [open, setOpen] = useState(false);
  const [visited, setVisited] = useState(false);
  return <details className="hub-report-form" open={open} onToggle={event => { setOpen(event.currentTarget.open); if (event.currentTarget.open) setVisited(true); }}><summary>Appeal this decision / check your appeal</summary>
    {visited && <AppealDetails token={token} decisionId={decisionId} />}</details>;
}

function AppealDetails({ token, decisionId }: { token: string; decisionId: string }) {
  const [appeal, setAppeal] = useState<CommunityAppeal | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [reason, setReason] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [refresh, setRefresh] = useState(0);
  useEffect(() => {
    if (!reason.trim() || appeal) return;
    const warn = (event: BeforeUnloadEvent) => event.preventDefault();
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [reason, appeal]);
  useEffect(() => {
    const controller = new AbortController();
    appealStatus(token, decisionId, AbortSignal.any([controller.signal, AbortSignal.timeout(10000)]))
      .then(value => { if (!controller.signal.aborted) { setAppeal(value.appeal); setLoaded(true); setError(""); } })
      .catch(error => { if (!controller.signal.aborted) setError(error instanceof Error ? error.message : "Appeal status could not be loaded."); });
    return () => controller.abort();
  }, [token, decisionId, refresh]);
  async function submit(event: FormEvent) {
    event.preventDefault(); setBusy(true); setError("");
    try { setAppeal(await submitAppeal(token, decisionId, reason, AbortSignal.timeout(10000))); }
    catch (error) { setError(error instanceof Error ? error.message : "Your appeal could not be submitted."); }
    finally { setBusy(false); }
  }
  return <div>{error && <p className="hub-notice" role="alert">{error}</p>}
    {!loaded && !error && <p role="status">Loading appeal status…</p>}
    {appeal ? <div role="status"><h4>{appeal.state === "open" ? "Appeal awaiting review" : "Appeal reviewed"}</h4>
      <p>Reference: {appeal.appealId}</p><p className="hub-activity-reason">{appeal.reason}</p>
      {appeal.response && <><h4>Moderator response</h4><p className="hub-activity-reason">{appeal.response}</p></>}</div>
      : loaded && <form className="hub-form" onSubmit={submit}><p>Explain why this decision should be reconsidered, including relevant evidence or source links. You can submit one appeal for this decision. Moderators will respond in your Hub inbox; submitting an appeal does not change the content’s current status.</p>
        <label>Your explanation<textarea required maxLength={5000} value={reason} onChange={event => setReason(event.target.value)} readOnly={busy} /></label>
        <button className="btn btn-primary" disabled={busy || !reason.trim()}>{busy ? "Submitting…" : "Submit appeal"}</button></form>}
    <button className="btn btn-ghost" disabled={busy} onClick={() => setRefresh(value => value + 1)}>Refresh appeal status</button>
  </div>;
}
