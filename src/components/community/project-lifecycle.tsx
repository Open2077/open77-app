"use client";

import { useState } from "react";
import type { StoredSession } from "@/lib/account/session";
import type { CommunityModerationState, CommunityProject } from "@/lib/community/types";
import { archiveProject, ownerLifecycle } from "@/lib/community/client-api";

export function ProjectLifecycle({ session, project, disabled, unsaved, changed }: { session: StoredSession; project: CommunityProject; disabled: boolean; unsaved: boolean; changed: (state: string) => void }) {
  const [snapshot, setSnapshot] = useState<CommunityModerationState | null>(null);
  const [busy, setBusy] = useState(false);
  const [reason, setReason] = useState("");
  const [confirmed, setConfirmed] = useState(false);
  const [error, setError] = useState("");
  if (session.accountId !== project.ownerAccountId) return null;
  async function inspect() {
    setBusy(true); setError(""); setConfirmed(false);
    try { setSnapshot(await ownerLifecycle(session.token, project.projectId)); }
    catch (error) { setError(error instanceof Error ? error.message : "Project state could not be loaded."); }
    finally { setBusy(false); }
  }
  async function apply() {
    if (!snapshot || busy || disabled || !confirmed || (snapshot.state === "published" && unsaved)) return;
    setBusy(true); setError("");
    try {
      const result = await archiveProject(session.token, project.projectId, project.revision, snapshot.moderationRevision, snapshot.state === "published", reason);
      setSnapshot(null); setReason(""); setConfirmed(false); changed(result.state);
    } catch (error) { setError(error instanceof Error ? error.message : "Project state could not be updated."); setSnapshot(null); setConfirmed(false); }
    finally { setBusy(false); }
  }
  return <section className="hub-notice" aria-label="Owner project controls"><h2>Project availability</h2><p>Current state: {project.state.replaceAll("_", " ")}</p>
    <button type="button" className="btn btn-ghost" disabled={busy || disabled} onClick={inspect}>Review archive / reopen options</button>
    {unsaved && <p>Save or resolve outstanding changes before archiving. Reopening remains available so you can recover edits.</p>}
    {error && <p role="alert">{error} Refresh the options before retrying.</p>}
    {snapshot && (snapshot.state === "published" || snapshot.state === "archived") && <div className="hub-form"><p>{snapshot.state === "published" ? "Archiving keeps the approved page and downloads available, closes new comments and freezes edits. You can reopen it later." : "Reopening allows edits and new comments again. Unapproved draft changes remain private."}</p>
      <label>Reason for project history<textarea maxLength={5000} value={reason} disabled={busy} onChange={event => { setReason(event.target.value); setConfirmed(false); }} /></label>
      <label className="hub-rights"><input type="checkbox" checked={confirmed} disabled={busy} onChange={event => setConfirmed(event.target.checked)} />I want to {snapshot.state === "published" ? "archive" : "reopen"} this project.</label>
      <div className="hub-actions"><button type="button" className="btn btn-primary" disabled={busy || disabled || !confirmed || !reason.trim() || (snapshot.state === "published" && unsaved)} onClick={apply}>{snapshot.state === "published" ? "Archive project" : "Reopen project"}</button><button type="button" className="btn btn-ghost" disabled={busy} onClick={() => setSnapshot(null)}>Cancel</button></div>
    </div>}
    {snapshot && !["published", "archived"].includes(snapshot.state) && <p>This project cannot be archived or reopened in its current state ({snapshot.state.replaceAll("_", " ")}).</p>}
  </section>;
}
