"use client";

import { useState } from "react";
import { masterCall } from "@/lib/account/api";
import type { CommunityProject } from "@/lib/community/types";

export function DraftDeletion({ token, accountId, project, deleted }: { token: string; accountId: string; project: CommunityProject; deleted: () => void }) {
  const [open, setOpen] = useState(false), [confirmed, setConfirmed] = useState(false), [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  if (project.ownerAccountId !== accountId || project.publishedAtUtc) return null;
  async function remove() {
    if (!confirmed || busy) return;
    setBusy(true); setError("");
    try {
      await masterCall<void>(`/api/v1/community/projects/${encodeURIComponent(project.projectId)}?expectedRevision=${project.revision}`, { token, method: "DELETE", signal: AbortSignal.timeout(15000) });
      deleted();
    } catch (error) { setError(error instanceof Error ? error.message : "The draft could not be deleted. Refresh before retrying an uncertain result."); }
    finally { setBusy(false); }
  }
  return <div>{!open ? <button type="button" className="btn btn-ghost" onClick={() => setOpen(true)}>Delete unpublished draft</button> :
    <section className="hub-notice" aria-label="Confirm draft deletion"><h3>Delete {project.content.title}?</h3>
      <p>This removes the draft from your workspace and frees its project allowance. Members lose access, pending invitations and creator connections are revoked, and pending uploads and processing cannot complete for this draft. There is no creator restore action.</p>
      <p>Private audit records, identifiers and file references remain for safe retention and investigation. Shared files are not deleted by this action. A creation with any published release history must use archival or moderation instead.</p>
      <label className="hub-rights"><input type="checkbox" checked={confirmed} disabled={busy} onChange={event => setConfirmed(event.target.checked)} />I want to delete this unpublished draft, revision {project.revision}.</label>
      {error && <p role="alert">{error}</p>}<div className="hub-actions"><button type="button" className="btn btn-primary" disabled={!confirmed || busy} onClick={() => void remove()}>{busy ? "Deleting draft…" : "Confirm draft deletion"}</button>
        <button type="button" className="btn btn-ghost" disabled={busy} onClick={() => { setOpen(false); setConfirmed(false); }}>Keep draft</button></div>
    </section>}</div>;
}
