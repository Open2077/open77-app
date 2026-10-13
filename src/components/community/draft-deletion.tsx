"use client";

import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/field";
import { delete02 } from "@/components/ui/icons";
import { masterCall } from "@/lib/account/api";
import type { CommunityProject } from "@/lib/community/types";
import { ConfirmDialog } from "@/components/account/kit";

export function DraftDeletion({ token, accountId, project, deleted }: { token: string; accountId: string; project: CommunityProject; deleted: () => void }) {
  const [open, setOpen] = useState(false), [confirmed, setConfirmed] = useState(false), [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  if (project.ownerAccountId !== accountId || project.publishedAtUtc) return null;
  async function remove() {
    if (!confirmed || busy) return;
    setBusy(true); setError("");
    try {
      await masterCall<void>(`/api/v1/community/projects/${encodeURIComponent(project.projectId)}?expectedRevision=${project.revision}`, { token, method: "DELETE", signal: AbortSignal.timeout(15000) });
      setOpen(false);
      deleted();
    } catch (error) { setError(error instanceof Error ? error.message : "The draft could not be deleted. Refresh before retrying an uncertain result."); }
    finally { setBusy(false); }
  }
  return (
    <>
      <Button lines="none" color="red" border size="sm" iconOnly icon={delete02} aria-label="Delete unpublished draft" title="Delete unpublished draft" onClick={() => setOpen(true)} />
      <ConfirmDialog
        open={open}
        onClose={() => { setOpen(false); setConfirmed(false); setError(""); }}
        eyebrow="Confirm draft deletion"
        title={`Delete ${project.content.title || "this draft"}?`}
        danger
        busy={busy}
        busyLabel="Deleting draft…"
        confirmLabel="Confirm draft deletion"
        cancelLabel="Keep draft"
        confirmDisabled={!confirmed}
        onConfirm={() => void remove()}
        error={error || undefined}
      >
        <p>This removes the draft from your workspace and frees its project allowance. Members lose access, pending invitations and creator connections are revoked, and pending uploads and processing cannot complete for this draft. <strong>There is no creator restore action.</strong></p>
        <p>Private audit records, identifiers and file references remain for safe retention and investigation. Shared files are not deleted by this action. A creation with any published release history must use archival or moderation instead.</p>
        <Checkbox checked={confirmed} disabled={busy} onChange={event => setConfirmed(event.target.checked)}>
          I want to delete this unpublished draft, revision {project.revision}.
        </Checkbox>
      </ConfirmDialog>
    </>
  );
}
