"use client";

import { useState } from "react";
import * as api from "@/lib/community/client-api";
import type { CommunityEditorialState, CommunityRankingExclusion } from "@/lib/community/types";

export function CommunityEditorialControls({ token, projectId, updated }: { token: string; projectId: string; updated: () => void }) {
  const [snapshot, setSnapshot] = useState<CommunityEditorialState | null>(null);
  const [reason, setReason] = useState(""); const [confirmed, setConfirmed] = useState(false);
  const [busy, setBusy] = useState(false); const [error, setError] = useState("");
  async function act(save: boolean) {
    if (busy || save && (!snapshot || !confirmed || !reason.trim())) return;
    setBusy(true); setError(""); setConfirmed(false);
    try {
      const result = save && snapshot ? await api.setEditorial(token, projectId, snapshot.moderationRevision, !snapshot.featured, reason) : await api.editorialState(token, projectId);
      setSnapshot(result); if (save) { setReason(""); updated(); }
    } catch (error) { setError(error instanceof Error ? error.message : "Editorial selection could not be saved. Refresh before retrying."); }
    finally { setBusy(false); }
  }
  return <details className="hub-release"><summary>Editorial selection</summary><p>Editorial picks are labelled separately from activity-based ranking. Only published, unarchived projects appear in the featured shelf.</p>
    {error && <p role="alert">{error}</p>}<button className="btn btn-ghost" disabled={busy} onClick={() => void act(false)}>Refresh editorial state</button>
    {snapshot && <form className="hub-form" onSubmit={event => { event.preventDefault(); void act(true); }}><p>{snapshot.featured ? "Selected as an editorial pick." : "Not currently selected."} Project state: {snapshot.state}.</p>
      <label>Internal selection reason<textarea disabled={busy} required maxLength={5000} value={reason} onChange={event => { setReason(event.target.value); setConfirmed(false); }} /></label>
      <label className="hub-review-confirm"><input type="checkbox" disabled={busy} checked={confirmed} onChange={event => setConfirmed(event.target.checked)} />I reviewed the approved public creation and this selection change.</label>
      <button className="btn btn-primary" disabled={busy || !confirmed || !reason.trim() || !snapshot.featured && snapshot.state !== "published"}>{snapshot.featured ? "Remove editorial pick" : "Feature this creation"}</button></form>}
  </details>;
}

export function CommunityRankingControls({ token }: { token: string }) {
  const [accountId, setAccountId] = useState(""); const [snapshot, setSnapshot] = useState<CommunityRankingExclusion | null>(null);
  const [reason, setReason] = useState(""); const [confirmed, setConfirmed] = useState(false);
  const [busy, setBusy] = useState(false); const [error, setError] = useState(""); const [status, setStatus] = useState("");
  async function act(save: boolean) {
    if (busy || save && (!snapshot || !confirmed || !reason.trim())) return;
    setBusy(true); setError(""); setStatus(""); setConfirmed(false);
    try {
      if (save && snapshot) await api.setRankingExclusion(token, snapshot.accountId, snapshot.revision, !snapshot.excluded, reason);
      const result = await api.rankingExclusion(token, accountId.trim()); setSnapshot(result); setReason("");
      if (save) setStatus("Saved. Ranking changes take effect in the next hourly calculation.");
    } catch (error) { setError(error instanceof Error ? error.message : "Ranking exclusion could not be loaded or saved. Refresh before retrying."); }
    finally { setBusy(false); }
  }
  return <details className="hub-release"><summary>Exclude test or abusive account activity from ranking</summary><p>This affects the account’s vote and attributed-download ranking contributions across the Hub. Its projects and public delivery totals remain visible.</p>
    <form className="hub-form" onSubmit={event => { event.preventDefault(); void act(false); }}><label>Account ID<input required pattern="[0-9a-fA-F-]{36}" maxLength={36} value={accountId} disabled={busy} onChange={event => { setAccountId(event.target.value); setSnapshot(null); setConfirmed(false); }} /></label><button className="btn btn-ghost" disabled={busy}>Load current exclusion</button></form>
    {error && <p role="alert">{error}</p>}{status && <p role="status">{status}</p>}
    {snapshot && <form className="hub-form" onSubmit={event => { event.preventDefault(); void act(true); }}><p>{snapshot.excluded ? "Activity excluded from ranking." : "Activity eligible for normal ranking checks."}</p>{snapshot.reason && <p>Previous internal reason: {snapshot.reason}</p>}
      <label>Internal reason<textarea disabled={busy} required maxLength={5000} value={reason} onChange={event => { setReason(event.target.value); setConfirmed(false); }} /></label>
      <label className="hub-review-confirm"><input type="checkbox" disabled={busy} checked={confirmed} onChange={event => setConfirmed(event.target.checked)} />I checked this account and the reason for changing its ranking eligibility.</label>
      <button className="btn btn-primary" disabled={busy || !confirmed || !reason.trim()}>{snapshot.excluded ? "Restore ranking eligibility" : "Exclude activity from ranking"}</button></form>}
  </details>;
}
