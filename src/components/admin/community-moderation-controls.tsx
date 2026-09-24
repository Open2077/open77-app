"use client";

import { useEffect, useState, type FormEvent } from "react";
import * as api from "@/lib/community/client-api";
import type { CommunityModerationState, CommunityRelease } from "@/lib/community/types";

export function ProjectModerationControls({ token, projectId, updated }: { token: string; projectId: string; updated: () => void }) {
  const [state, setState] = useState<CommunityModerationState | null>(null);
  const [attempt, setAttempt] = useState(0);
  const [reason, setReason] = useState("");
  const [confirmed, setConfirmed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  useEffect(() => {
    const controller = new AbortController();
    api.moderationState(token, projectId, AbortSignal.any([controller.signal, AbortSignal.timeout(10000)]))
      .then(value => { if (!controller.signal.aborted) { setState(value); setConfirmed(false); setError(""); } })
      .catch(error => { if (!controller.signal.aborted) setError(error instanceof Error ? error.message : "Moderation state could not be loaded."); });
    return () => controller.abort();
  }, [token, projectId, attempt]);
  async function submit(event: FormEvent) {
    event.preventDefault(); if (!state || !confirmed || busy) return;
    setBusy(true); setError("");
    try {
      const result = await api.moderateProject(token, projectId, state.moderationRevision, state.state !== "suspended", reason);
      setState(result); setConfirmed(false); setReason(""); updated();
    } catch (error) { setError(error instanceof Error ? error.message : "Moderation action failed."); setConfirmed(false); }
    finally { setBusy(false); }
  }
  const restoring = state?.state === "suspended";
  return <details className="hub-release"><summary>Project suspension and restoration</summary>
    {error && <p className="hub-notice" role="alert">{error}</p>}
    <button type="button" className="btn btn-ghost" disabled={busy} onClick={() => setAttempt(value => value + 1)}>Refresh moderation state</button>
    {state && <form className="hub-form" onSubmit={submit}><p>Current state: {state.state} · moderation revision {state.moderationRevision}</p>
      <p>{restoring ? `Restore this project to its previous state: ${state.suspendedFromState ?? "unknown; operator reconciliation required"}.` : "Suspend public access and creator edits while preserving the project, releases and review history."}</p>
      <label>Reason shared with the creator<textarea required maxLength={5000} value={reason} onChange={event => setReason(event.target.value)} /></label>
      <label className="hub-review-confirm"><input type="checkbox" checked={confirmed} onChange={event => setConfirmed(event.target.checked)} />I have checked the project and this moderation action.</label>
      <button className="btn btn-primary" disabled={busy || !confirmed || !reason.trim() || (restoring && !state.suspendedFromState)}>{busy ? "Applying…" : restoring ? "Restore previous state" : "Suspend project"}</button>
    </form>}
  </details>;
}

export function ReleaseRevocationControls({ token, release, updated }: { token: string; release: CommunityRelease; updated: () => void }) {
  const [reason, setReason] = useState("");
  const [confirmed, setConfirmed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  async function submit(event: FormEvent) {
    event.preventDefault(); if (!confirmed || busy) return;
    setBusy(true); setError("");
    try { await api.revokeRelease(token, release.releaseId, release.revision, reason); updated(); }
    catch (error) { setError(error instanceof Error ? error.message : "Revocation failed."); setConfirmed(false); }
    finally { setBusy(false); }
  }
  if (release.state !== "published") return null;
  return <details><summary>Revoke this release</summary><form className="hub-form" onSubmit={submit}>
    <p>Revoke version {release.version}, revision {release.revision}. New download requests will be denied; release history and its original bytes are retained.</p>
    {error && <p className="hub-notice" role="alert">{error}</p>}
    <label>Revocation reason<textarea required maxLength={5000} value={reason} onChange={event => setReason(event.target.value)} /></label>
    <label className="hub-review-confirm"><input type="checkbox" checked={confirmed} onChange={event => setConfirmed(event.target.checked)} />I checked this exact release and its digest.</label>
    <button className="btn btn-primary" disabled={busy || !confirmed || !reason.trim()}>{busy ? "Revoking…" : "Revoke release"}</button>
  </form></details>;
}
