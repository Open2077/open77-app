"use client";

import { useState } from "react";

import { Button } from "@/components/admin/admin-button";
import { Checkbox, Field, Input, Textarea } from "@/components/ui/field";
import { refresh } from "@/components/ui/icons";
import * as api from "@/lib/community/client-api";
import type { CommunityEditorialState, CommunityRankingExclusion } from "@/lib/community/types";
import { Disclosure, FormActions, StatusTag, SuccessStrip } from "./admin-kit";
import { ErrorStrip } from "./use-admin-data";

import styles from "./community-panels.module.css";

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
  return (
    <Disclosure summary="Editorial selection">
      <p>Editorial picks are labelled separately from activity-based ranking. Only published, unarchived projects appear in the featured shelf.</p>
      <ErrorStrip message={error || null} />
      <div>
        <Button size="sm" color="neutral" border lines="none" icon={refresh} iconPosition="left" disabled={busy} onClick={() => void act(false)}>
          Refresh editorial state
        </Button>
      </div>
      {snapshot ? (
        <form className={styles.controlForm} onSubmit={event => { event.preventDefault(); void act(true); }}>
          <p className={styles.state}>
            <StatusTag status={snapshot.featured ? "live" : "neutral"}>{snapshot.featured ? "Editorial pick" : "Not selected"}</StatusTag>
            <span>{snapshot.featured ? "Selected as an editorial pick." : "Not currently selected."} Project state: {snapshot.state}.</span>
          </p>
          <Field label="Internal selection reason">
            <Textarea disabled={busy} required maxLength={5000} rows={3} value={reason} onChange={event => { setReason(event.target.value); setConfirmed(false); }} />
          </Field>
          <Checkbox disabled={busy} checked={confirmed} onChange={event => setConfirmed(event.target.checked)}>
            I reviewed the approved public creation and this selection change.
          </Checkbox>
          <FormActions>
            <Button type="submit" size="sm" color="red" lines="none" disabled={busy || !confirmed || !reason.trim() || !snapshot.featured && snapshot.state !== "published"}>
              {snapshot.featured ? "Remove editorial pick" : "Feature this creation"}
            </Button>
          </FormActions>
        </form>
      ) : null}
    </Disclosure>
  );
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
  return (
    <Disclosure summary="Exclude test or abusive account activity from ranking">
      <p>This affects the account’s vote and attributed-download ranking contributions across the Workshop. Its projects and public delivery totals remain visible.</p>
      <form className={styles.lookup} onSubmit={event => { event.preventDefault(); void act(false); }}>
        <Field label="Account ID" className={styles.lookupField}>
          <Input required pattern="[0-9a-fA-F-]{36}" maxLength={36} value={accountId} disabled={busy} className={styles.mono}
            onChange={event => { setAccountId(event.target.value); setSnapshot(null); setConfirmed(false); }} />
        </Field>
        <Button type="submit" size="sm" color="neutral" border lines="none" disabled={busy}>Load current exclusion</Button>
      </form>
      <ErrorStrip message={error || null} />
      <SuccessStrip message={status} />
      {snapshot ? (
        <form className={styles.controlForm} onSubmit={event => { event.preventDefault(); void act(true); }}>
          <p className={styles.state}>
            <StatusTag status={snapshot.excluded ? "danger" : "neutral"}>{snapshot.excluded ? "Excluded" : "Eligible"}</StatusTag>
            <span>{snapshot.excluded ? "Activity excluded from ranking." : "Activity eligible for normal ranking checks."}</span>
          </p>
          {snapshot.reason ? <p>Previous internal reason: {snapshot.reason}</p> : null}
          <Field label="Internal reason">
            <Textarea disabled={busy} required maxLength={5000} rows={3} value={reason} onChange={event => { setReason(event.target.value); setConfirmed(false); }} />
          </Field>
          <Checkbox disabled={busy} checked={confirmed} onChange={event => setConfirmed(event.target.checked)}>
            I checked this account and the reason for changing its ranking eligibility.
          </Checkbox>
          <FormActions>
            <Button type="submit" size="sm" color="red" lines="none" disabled={busy || !confirmed || !reason.trim()}>
              {snapshot.excluded ? "Restore ranking eligibility" : "Exclude activity from ranking"}
            </Button>
          </FormActions>
        </form>
      ) : null}
    </Disclosure>
  );
}
