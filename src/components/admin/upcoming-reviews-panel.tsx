"use client";

import { useCallback, useRef, useState } from "react";
import { AnnouncementDetails } from "@/components/account/license-card";
import { Button } from "@/components/admin/admin-button";
import { useAdminActivity } from "@/components/admin/admin-activity";
import { AdminPanel, Count, EmptyBlock, Footnote, LoadingBlock, Pager, Primary, StatusTag, Sub, SuccessStrip, Toolbar } from "@/components/admin/admin-kit";
import { ArmButton } from "@/components/admin/arm-button";
import { formatDateTime } from "@/components/admin/format";
import { ErrorStrip, useAdminData } from "@/components/admin/use-admin-data";
import { ServerText } from "@/components/servers/server-text";
import { Notice } from "@/components/ui/feedback";
import { Field, Select, Textarea } from "@/components/ui/field";
import { hourglass, refresh } from "@/components/ui/icons";
import { Panel } from "@/components/ui/panel";
import { MasterApiError } from "@/lib/account/api";
import * as owners from "@/lib/account/server-owner-api";
import styles from "./upcoming-reviews-panel.module.css";

export function UpcomingReviewsPanel() {
  const [status, setStatus] = useState("pending");
  const [page, setPage] = useState(1);
  const [busy, setBusy] = useState(false);
  const inFlight = useRef(false);
  const [notice, setNotice] = useState("");
  const load = useCallback((token: string) => owners.upcomingReviews(token, status, page), [status, page]);
  const { token, data, error, loading, reload } = useAdminData(load);
  const { begin } = useAdminActivity();
  async function decide(item: owners.UpcomingReview, approve: boolean, reason: string, complete = false) {
    if (!token || inFlight.current) throw new Error("Please wait for the current decision.");
    inFlight.current = true; setBusy(true); setNotice("");
    const finish = begin();
    try {
      if (complete) await owners.completeUpcoming(token, item.request.requestId, item.request.revision);
      else await owners.decideUpcoming(token, item.request.requestId, approve, item.request.revision, reason);
      setNotice(complete ? "Launch completed. The announcement leaves Upcoming; the server returns to the live list when online. Owner edits remain locked." : approve ? "Announcement approved and published. Its content is now locked for the owner." : "Request rejected. The owner can read your reason and resubmit a corrected announcement.");
      finish(true); reload();
    } catch (err) { finish(false); throw err; }
    finally { inFlight.current = false; setBusy(false); }
  }
  const pages = Math.max(1, Math.ceil((data?.total ?? 0) / 25));
  return (
    <AdminPanel title="Upcoming server requests" icon={hourglass} brackets
      actions={<Button size="sm" color="neutral" border lines="none" icon={refresh} busy={loading} disabled={busy} onClick={reload}>Refresh</Button>}>
      <Footnote>Owners submit one announcement per license for review. Approval publishes the submitted content and permanently locks owner edits. Rejections require a reason and allow a corrected submission. The approved announcement follows the last server attached to its license.</Footnote>
      <Toolbar>
        <Field label="Request status"><Select compact value={status} disabled={busy} onChange={event => { setStatus(event.target.value); setPage(1); }}>
          <option value="pending">Pending review</option><option value="approved">Approved</option><option value="rejected">Rejected</option><option value="launched">Launch completed</option><option value="all">All requests</option>
        </Select></Field>
        <Count>{data?.total ?? 0} requests</Count>
      </Toolbar>
      <ErrorStrip message={error} /><SuccessStrip message={notice} />
      {loading && !data ? <LoadingBlock label="Loading upcoming requests" /> : null}
      {data?.items.length === 0 ? <EmptyBlock icon={hourglass}>No requests in this view.</EmptyBlock> : null}
      <div className={styles.cards}>{data?.items.map(item => <ReviewCard key={`${item.request.requestId}:${item.request.revision}`} item={item} disabled={busy || loading} decide={decide} />)}</div>
      {data ? <Pager summary={`${data.total === 0 ? 0 : (data.page - 1) * 25 + 1}–${(data.page - 1) * 25 + data.items.length} of ${data.total} requests · page ${data.page} of ${pages}`}
        previous={{ disabled: loading || busy || page <= 1, onClick: () => setPage(page - 1) }}
        next={{ disabled: loading || busy || page >= pages, onClick: () => setPage(page + 1) }} /> : null}
    </AdminPanel>
  );
}

function ReviewCard({ item, disabled, decide }: { item: owners.UpcomingReview; disabled: boolean; decide: (item: owners.UpcomingReview, approve: boolean, reason: string, complete?: boolean) => Promise<void> }) {
  const [reason, setReason] = useState("");
  const [error, setError] = useState<string | null>(null);
  async function submit(approve: boolean, complete = false) {
    setError(null);
    try { await decide(item, approve, reason, complete); }
    catch (err) { setError(err instanceof MasterApiError ? err.message : "Could not save this decision. Refresh and try again."); }
  }
  const blocked = Boolean(item.licenseRevokedAtUtc || !item.lastServer || item.lastServer.revoked);
  return (
    <Panel as="article" padding="md" className={styles.card} data-upcoming-request={item.request.requestId}>
      <div className={styles.heading}><Primary><ServerText text={item.request.profile.name} /></Primary><StatusTag status={item.request.status === "approved" ? "ok" : item.request.status === "rejected" ? "warn" : "neutral"}>{item.request.status}</StatusTag></div>
      <Sub>Owner: {item.ownerEmail} · License: {item.licenseLabel}</Sub>
      <Sub>Submitted {formatDateTime(item.request.submittedAtUtc)} · revision {item.request.revision}</Sub>
      <details className={styles.details}><summary>Review announcement and server attachment</summary>
        <AnnouncementDetails profile={item.request.profile} />
        <div className={styles.identity}>
          <p>Owner account: <code>{item.ownerAccountId}</code></p>
          <p>License: <code>{item.request.licenseId}</code>{item.licenseRevokedAtUtc ? " · REVOKED" : ""}</p>
          <p>Submitted server: <code>{item.request.submittedServerId}</code></p>
          <p>Last attached server: {item.lastServer ? <><ServerText text={item.lastServer.name} /> · <code>{item.lastServer.serverId}</code>{item.lastServer.online ? " · online" : " · offline"}</> : "None"}</p>
          {item.lastServer?.connectEndpoint ? <p>Last address: {item.lastServer.connectEndpoint}</p> : null}
          {item.lastServer?.serverId !== item.request.submittedServerId ? <Notice kind="warning">The server attachment changed since submission. Publication will follow the last attached server.</Notice> : null}
        </div>
      </details>
      {item.request.reason ? <Notice kind={item.request.status === "rejected" ? "warning" : "info"} title="Review reason">{item.request.reason}</Notice> : null}
      {item.request.reviewedAtUtc ? <Sub>Reviewed {formatDateTime(item.request.reviewedAtUtc)}</Sub> : null}
      {item.request.status === "approved" ? <>
        <Footnote>Mark the launch complete when this community is ready to leave Upcoming. Content stays locked for the owner; an online server can reappear in the live list.</Footnote>
        <ErrorStrip message={error} />
        <ArmButton label="Mark launch complete" confirmLabel="Confirm this community has launched?" disabled={disabled} onConfirm={() => submit(true, true)} />
      </> : null}
      {item.request.status === "pending" ? <>
        {blocked ? <Notice kind="warning">The license or server is unavailable. Approval is blocked; explain the issue when rejecting.</Notice> : null}
        <Field label="Reason / staff note" hint="Required when rejecting. The owner can read this message."><Textarea value={reason} maxLength={1000} rows={3} disabled={disabled} onChange={event => setReason(event.target.value)} /></Field>
        <ErrorStrip message={error} />
        <div className={styles.actions}>
          <ArmButton label="Approve announcement" confirmLabel="Confirm approval and lock owner edits?" disabled={disabled || blocked} onConfirm={() => submit(true)} />
          <ArmButton label="Reject with reason" confirmLabel="Confirm rejection?" disabled={disabled || !reason.trim()} onConfirm={() => submit(false)} />
        </div>
      </> : null}
    </Panel>
  );
}
