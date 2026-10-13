"use client";

import { useCallback, useState, type FormEvent } from "react";

import { ActivityHistory } from "@/components/community/activity-history";
import { CommentModeration } from "@/components/community/comment-moderation";
import { DownloadButton } from "@/components/community/download-button";
import { PrivateMediaPreview } from "@/components/community/private-media-preview";
import { Button } from "@/components/admin/admin-button";
import { Chip } from "@/components/ui/chip";
import { Notice } from "@/components/ui/feedback";
import { Field, Input, Select, Textarea } from "@/components/ui/field";
import { arrowRight01, arrowUpRight01, flag02, view } from "@/components/ui/icons";
import { useSession } from "@/lib/account/session";
import * as api from "@/lib/community/client-api";
import type { CommunityProject, CommunityRelease, CommunityReport } from "@/lib/community/types";
import {
  AdminPanel,
  Disclosure,
  EmptyBlock,
  Filters,
  FormActions,
  FormPanel,
  LoadingBlock,
  Preformatted,
  StatusTag,
  Toolbar,
} from "./admin-kit";
import { ProjectModerationControls, ReleaseRevocationControls } from "./community-moderation-controls";
import { HashCell } from "./hash-cell";
import { useAdminData } from "./use-admin-data";

import styles from "./community-panels.module.css";

const STATE_TAG: Record<CommunityReport["state"], "warn" | "ok" | "neutral"> = { open: "warn", action_taken: "ok", dismissed: "neutral" };

export function CommunityReportsPanel() {
  const { session } = useSession();
  const [state, setState] = useState<CommunityReport["state"]>("open");
  const [cursor, setCursor] = useState<string>();
  const load = useCallback((token: string) => api.reports(token, state, cursor, AbortSignal.timeout(10000)), [state, cursor]);
  const result = useAdminData(load);
  if (!session) return null;
  return (
    <AdminPanel
      title="Reports"
      icon={flag02}
      brackets
      actions={
        <Button href="/admin/resources" size="sm" color="neutral" border lines="none" icon={arrowRight01}>
          Project and release review
        </Button>
      }
    >
      <Toolbar>
        <Filters label="Filter reports by state">
          {(["open", "action_taken", "dismissed"] as const).map(value => (
            <Chip key={value} pressed={state === value} onClick={() => { setState(value); setCursor(undefined); }}>
              {value.replaceAll("_", " ")}
            </Chip>
          ))}
        </Filters>
      </Toolbar>
      {result.error ? (
        <Notice kind="danger" action={<Button size="sm" color="red" border lines="none" onClick={result.reload}>Retry reports</Button>}>
          {result.error}
        </Notice>
      ) : null}
      {!result.data && !result.error ? <LoadingBlock label="Loading reports…" rows={3} /> : null}
      {result.data?.items.length === 0 ? <EmptyBlock icon={flag02}>No reports match this filter.</EmptyBlock> : null}
      {result.data?.items.length ? (
        <div className={styles.cards}>
          {result.data.items.map(report => (
            <ReportRow key={`${report.reportId}-${report.state}`} token={session.token} accountId={session.accountId} report={report} updated={result.reload} />
          ))}
        </div>
      ) : null}
      <nav className={styles.queueNav} aria-label="Report pages">
        {cursor ? <Button size="sm" color="neutral" border lines="none" onClick={() => setCursor(undefined)}>Start of queue</Button> : null}
        {result.data?.nextCursor ? <Button size="sm" color="neutral" border lines="none" icon={arrowRight01} onClick={() => setCursor(result.data?.nextCursor ?? undefined)}>Next page</Button> : null}
      </nav>
    </AdminPanel>
  );
}

function ReportRow({ token, accountId, report, updated }: { token: string; accountId: string; report: CommunityReport; updated: () => void }) {
  const [reason, setReason] = useState("");
  const [outcome, setOutcome] = useState<"action_taken" | "dismissed">("dismissed");
  const [project, setProject] = useState<CommunityProject | null>(null);
  const [release, setRelease] = useState<CommunityRelease | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [assignmentReason, setAssignmentReason] = useState("");
  const [publicResponse, setPublicResponse] = useState("");
  async function assign(event: FormEvent) {
    event.preventDefault(); if (busy) return;
    setBusy(true); setError("");
    try { await api.assignReport(token, report.reportId, report.revision, report.assignedAccountId !== accountId, assignmentReason); setAssignmentReason(""); updated(); }
    catch (error) { setError(error instanceof Error ? error.message : "Assignment failed."); }
    finally { setBusy(false); }
  }
  async function inspect() {
    setBusy(true); setError("");
    try {
      const signal = AbortSignal.timeout(15000);
      const [project, release] = await Promise.all([api.myProject(token, report.projectId, signal),
        report.targetType === "release" ? api.reviewRelease(token, report.targetId, signal) : Promise.resolve(null)]);
      setProject(project); setRelease(release);
    } catch (error) { setError(error instanceof Error ? error.message : "Reported content could not be loaded."); }
    finally { setBusy(false); }
  }
  async function resolve(event: FormEvent) {
    event.preventDefault(); if (busy) return;
    setBusy(true); setError("");
    try { await api.resolveReport(token, report.reportId, outcome, reason, report.revision, report.targetType === "appeal" ? publicResponse : undefined); updated(); }
    catch (error) { setError(error instanceof Error ? error.message : "The report could not be resolved."); }
    finally { setBusy(false); }
  }
  const assignedToOther = !!report.assignedAccountId && report.assignedAccountId !== accountId;
  return (
    <article className={styles.card}>
      <div className={styles.cardHead}>
        <h3 className={styles.cardTitle}>{report.targetType === "appeal" ? "Decision appeal" : `Reported ${report.targetType}`}</h3>
        <StatusTag status={STATE_TAG[report.state]}>{report.state.replaceAll("_", " ")}</StatusTag>
      </div>
      <p className={styles.cardMeta}>
        {new Date(report.createdAtUtc).toLocaleString()} · Assigned to: {report.assignedAccountId === accountId ? "you" : report.assignedAccountId ? "another moderator" : "unassigned"} · revision {report.revision}
      </p>
      <Preformatted>{report.reason}</Preformatted>
      {error ? <Notice kind="danger">{error}</Notice> : null}
      {report.state === "open" ? (
        <form className={styles.inline} onSubmit={assign}>
          <Field label="Assignment note">
            <Input required maxLength={5000} value={assignmentReason} onChange={event => setAssignmentReason(event.target.value)} />
          </Field>
          <Button type="submit" size="sm" color="neutral" border lines="none" disabled={busy || !assignmentReason.trim()}>
            {report.assignedAccountId === accountId ? "Release to queue" : report.assignedAccountId ? "Take over report" : "Assign to me"}
          </Button>
        </form>
      ) : null}
      <div>
        <Button size="sm" color="neutral" border lines="none" icon={view} iconPosition="left" disabled={busy} onClick={inspect}>
          {project ? "Refresh reported content" : "Inspect reported content"}
        </Button>
      </div>
      {report.targetBody ? (
        <Disclosure summary={report.targetType === "appeal" ? "Original decision being appealed" : "Reported comment"}>
          <Preformatted>{report.targetBody}</Preformatted>
        </Disclosure>
      ) : null}
      {report.publicResponse ? (
        <Disclosure summary="Response sent to creator">
          <Preformatted>{report.publicResponse}</Preformatted>
        </Disclosure>
      ) : null}
      {report.targetType === "comment" ? <CommentModeration token={token} id={report.targetId} updated={updated} /> : null}
      {project ? (
        <Disclosure summary={`Current project draft: ${project.content.title} · ${project.state} · revision ${project.revision}`} open>
          <p className={styles.summary}>{project.content.summary}</p>
          <Preformatted>{project.content.description}</Preformatted>
          <div className={styles.media}>
            {project.content.media?.map(image => <PrivateMediaPreview key={image.mediaId} token={token} mediaId={image.mediaId} alt={image.altText} />)}
          </div>
          <FormActions>
            <Button href={`/workshop/${project.slug}`} size="sm" color="neutral" border lines="none" icon={arrowUpRight01}>
              Open public project page
            </Button>
            <Button href={`/admin/resources/${project.projectId}`} size="sm" color="neutral" border lines="none" icon={arrowRight01}>
              Open project moderation and release history
            </Button>
          </FormActions>
          <ProjectModerationControls token={token} projectId={project.projectId} updated={inspect} />
        </Disclosure>
      ) : null}
      {release ? (
        <Disclosure summary={`Release ${release.version} · ${release.state}`} open>
          <Preformatted>{release.metadata.changelog}</Preformatted>
          {release.sha256 ? <p className={styles.digest}><span>SHA-256</span> <HashCell sha256={release.sha256} /></p> : null}
          <div>
            <DownloadButton key={`${release.releaseId}-${release.revision}`} releaseId={release.releaseId} version={release.version} review={{ token, revision: release.revision }} color="red" />
          </div>
          <ReleaseRevocationControls token={token} release={release} updated={inspect} />
        </Disclosure>
      ) : null}
      {report.state === "open" ? (
        <FormPanel title="Resolve report" onSubmit={resolve}>
          <p className={styles.cardMeta}>Apply any required content action before recording the outcome. Investigation notes stay private.</p>
          <Field label="Outcome">
            <Select value={outcome} onChange={event => setOutcome(event.target.value as typeof outcome)}>
              <option value="dismissed">Dismiss report</option>
              <option value="action_taken">Action taken</option>
            </Select>
          </Field>
          <Field label="Private investigation notes">
            <Textarea required maxLength={5000} rows={3} value={reason} onChange={event => setReason(event.target.value)} />
          </Field>
          {report.targetType === "appeal" ? (
            <Field label="Response to the creator" hint="This response is sent to the creator. Explain the outcome and any next steps.">
              <Textarea required maxLength={5000} rows={3} value={publicResponse} onChange={event => setPublicResponse(event.target.value)} />
            </Field>
          ) : null}
          {assignedToOther ? <Notice kind="warning">Another moderator holds this report. Take it over before resolving it.</Notice> : null}
          <FormActions>
            <Button type="submit" size="sm" color="red" lines="none" busy={busy} disabled={!reason.trim() || assignedToOther}>
              {busy ? "Working…" : "Resolve report"}
            </Button>
          </FormActions>
        </FormPanel>
      ) : null}
      <ActivityHistory key={`${report.reportId}-${report.revision}`} token={token} kind="report" id={report.reportId} title="Private report history" />
    </article>
  );
}
