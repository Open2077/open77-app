"use client";

import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Notice } from "@/components/ui/feedback";
import { Checkbox, Field, Textarea } from "@/components/ui/field";
import type { StoredSession } from "@/lib/account/session";
import type { CommunityModerationState, CommunityProject } from "@/lib/community/types";
import { archiveProject, ownerLifecycle } from "@/lib/community/client-api";
import { ConfirmDialog, Fine, StateTag } from "@/components/account/kit";
import { Subhead } from "./creator-parts";

import styles from "./project-lifecycle.module.css";

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
  const eligible = !!snapshot && (snapshot.state === "published" || snapshot.state === "archived");
  const archiving = snapshot?.state === "published";
  return (
    <section className={styles.lifecycle} aria-label="Owner project controls">
      <Subhead as="h3">Project availability</Subhead>
      <p className={styles.current}>
        <span>Current state</span>
        <StateTag state={project.state} />
      </p>
      <div>
        <Button lines="none" color="neutral" border size="sm" busy={busy && !snapshot} disabled={busy || disabled} onClick={inspect}>
          Archive / reopen options
        </Button>
      </div>
      {unsaved ? <Fine>Save or resolve outstanding changes before archiving. Reopening remains available so you can recover edits.</Fine> : null}
      {error ? <Notice kind="danger">{error} Refresh the options before retrying.</Notice> : null}
      {snapshot && !eligible ? (
        <Notice kind="info">This project cannot be archived or reopened in its current state ({snapshot.state.replaceAll("_", " ")}).</Notice>
      ) : null}
      <ConfirmDialog
        open={eligible}
        onClose={() => setSnapshot(null)}
        eyebrow="Project availability"
        title={archiving ? "Archive this project?" : "Reopen this project?"}
        danger={archiving}
        busy={busy}
        confirmLabel={archiving ? "Archive project" : "Reopen project"}
        confirmDisabled={busy || disabled || !confirmed || !reason.trim() || (archiving && unsaved)}
        onConfirm={() => void apply()}
      >
        <p>
          {archiving
            ? "Archiving keeps the approved page and downloads available, closes new comments and freezes edits. You can reopen it later."
            : "Reopening allows edits and new comments again. Unapproved draft changes remain private."}
        </p>
        {archiving && unsaved ? <Notice kind="warning">Save or resolve outstanding changes before archiving.</Notice> : null}
        <Field label="Reason for project history">
          <Textarea maxLength={5000} rows={4} value={reason} disabled={busy} onChange={event => { setReason(event.target.value); setConfirmed(false); }} />
        </Field>
        <Checkbox checked={confirmed} disabled={busy} onChange={event => setConfirmed(event.target.checked)}>
          I want to {archiving ? "archive" : "reopen"} this project.
        </Checkbox>
      </ConfirmDialog>
    </section>
  );
}
