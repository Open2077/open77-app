"use client";

import { useEffect, useState, type FormEvent } from "react";

import { Button } from "@/components/admin/admin-button";
import { Checkbox, Field, Textarea } from "@/components/ui/field";
import { refresh } from "@/components/ui/icons";
import * as api from "@/lib/community/client-api";
import type { CommunityModerationState, CommunityRelease } from "@/lib/community/types";
import { Disclosure, FormActions, StatusTag } from "./admin-kit";
import { ErrorStrip } from "./use-admin-data";

import styles from "./community-panels.module.css";

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
  return (
    <Disclosure summary="Project suspension and restoration">
      <ErrorStrip message={error || null} />
      <div>
        <Button size="sm" color="neutral" border lines="none" icon={refresh} iconPosition="left" disabled={busy} onClick={() => setAttempt(value => value + 1)}>
          Refresh moderation state
        </Button>
      </div>
      {state ? (
        <form className={styles.controlForm} onSubmit={submit}>
          <p className={styles.state}>
            Current state <StatusTag status={state.state === "suspended" ? "danger" : "neutral"}>{state.state}</StatusTag>
            <span>moderation revision {state.moderationRevision}</span>
          </p>
          <p>{restoring ? `Restore this project to its previous state: ${state.suspendedFromState ?? "unknown; operator reconciliation required"}.` : "Suspend public access and creator edits while preserving the project, releases and review history."}</p>
          <Field label="Reason shared with the creator">
            <Textarea required maxLength={5000} rows={3} value={reason} onChange={event => setReason(event.target.value)} />
          </Field>
          <Checkbox checked={confirmed} onChange={event => setConfirmed(event.target.checked)}>
            I have checked the project and this moderation action.
          </Checkbox>
          <FormActions>
            <Button type="submit" size="sm" color="red" lines="none" busy={busy} disabled={!confirmed || !reason.trim() || (restoring && !state.suspendedFromState)}>
              {busy ? "Applying…" : restoring ? "Restore previous state" : "Suspend project"}
            </Button>
          </FormActions>
        </form>
      ) : null}
    </Disclosure>
  );
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
  return (
    <Disclosure summary="Revoke this release">
      <form className={styles.controlForm} onSubmit={submit}>
        <p>Revoke version {release.version}, revision {release.revision}. New download requests will be denied; release history and its original bytes are retained.</p>
        <ErrorStrip message={error || null} />
        <Field label="Revocation reason">
          <Textarea required maxLength={5000} rows={3} value={reason} onChange={event => setReason(event.target.value)} />
        </Field>
        <Checkbox checked={confirmed} onChange={event => setConfirmed(event.target.checked)}>
          I checked this exact release and its digest.
        </Checkbox>
        <FormActions>
          <Button type="submit" size="sm" color="red" lines="none" busy={busy} disabled={!confirmed || !reason.trim()}>
            {busy ? "Revoking…" : "Revoke release"}
          </Button>
        </FormActions>
      </form>
    </Disclosure>
  );
}
