"use client";

import { type FormEvent, useCallback, useState } from "react";

import {
  AdminPanel,
  AdminTable,
  Count,
  EmptyBlock,
  Filters,
  FormActions,
  FormGrid,
  FormPanel,
  LoadingBlock,
  Primary,
  Stack,
  StatusTag,
  Sub,
  SuccessStrip,
  Toolbar,
  cell,
} from "@/components/admin/admin-kit";
import { formatDateTime, shortId } from "@/components/admin/format";
import { HashCell } from "@/components/admin/hash-cell";
import {
  ContentClassChip,
  RedistributionTag,
  REDISTRIBUTION_NOTE,
  REDISTRIBUTION_OPTIONS,
  SourceCell,
} from "@/components/admin/mod-badges";
import { ErrorStrip, useAdminData } from "@/components/admin/use-admin-data";
import { Button } from "@/components/admin/admin-button";
import { Chip } from "@/components/ui/chip";
import { Field, Input, Select } from "@/components/ui/field";
import { hourglass, puzzle, refresh, tick02 } from "@/components/ui/icons";
import { MasterApiError } from "@/lib/account/api";
import * as mods from "@/lib/account/mods-api";
import type {
  ModRedistribution,
  ModReviewRequest,
  ModReviewStatus,
} from "@/lib/account/mods-api";

import styles from "./mod-requests-panel.module.css";

type QueueFilter = ModReviewStatus | "all";

const FILTERS: { value: QueueFilter; label: string }[] = [
  { value: "pending", label: "Waiting" },
  { value: "approved", label: "Approved" },
  { value: "declined", label: "Declined" },
  { value: "all", label: "Everything" },
];

const STATUS_TAG: Record<ModReviewStatus, "warn" | "ok" | "danger"> = {
  pending: "warn",
  approved: "ok",
  declined: "danger",
};

function formatBytes(bytes: number | null): string {
  if (bytes === null || !Number.isFinite(bytes)) return "—";
  if (bytes < 1024) return `${bytes} B`;
  const units = ["KiB", "MiB", "GiB"];
  let value = bytes / 1024;
  let unit = 0;
  while (value >= 1024 && unit < units.length - 1) {
    value /= 1024;
    unit += 1;
  }
  return `${value < 10 ? value.toFixed(1) : Math.round(value)} ${units[unit]}`;
}

function replaceRow(rows: ModReviewRequest[], row: ModReviewRequest): ModReviewRequest[] {
  return rows.map((existing) => (existing.requestId === row.requestId ? row : existing));
}

/**
 * The owner-submitted review queue.
 *
 * A server owner who imports a mod through Warden already hosts the bytes; what
 * they are asking for here is our opinion of them. Each row says who asked, for
 * which exact hash, where it came from, and — the part that decides how sharp
 * the review is — what the importer found inside. An `inert` package (.archive,
 * .tweak, .xl, engine config) already works unverified; an `executable` one
 * (.dll, .reds, CET Lua, .asi) is refused outright until a human verifies that
 * hash, which is why those rows are the ones that actually block an owner.
 *
 * Approving writes an attestation, and an attestation has two axes. Approval on
 * its own can only speak to the bytes, so the reviewer must answer the licence
 * question separately before the decision can be recorded. Declining records a
 * reason, and that reason is shown back to the owner in their Warden panel —
 * write it for them, not for us.
 */
export function ModRequestsPanel() {
  const [filter, setFilter] = useState<QueueFilter>("pending");
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  // One request at a time is under decision; the row expands into a form.
  const [decision, setDecision] = useState<{
    request: ModReviewRequest;
    kind: "approve" | "decline";
  } | null>(null);
  const [redistribution, setRedistribution] = useState<ModRedistribution>("unknown");
  const [note, setNote] = useState("");
  const [reason, setReason] = useState("");

  const load = useCallback(
    (token: string) =>
      mods.modReviewRequests(token, filter === "all" ? {} : { status: filter }),
    [filter],
  );
  const { token, data, setData, error, setError, loading, reload } = useAdminData(load);

  function open(request: ModReviewRequest, kind: "approve" | "decline") {
    setDecision({ request, kind });
    setRedistribution("unknown");
    setNote("");
    setReason("");
    setNotice(null);
  }

  function close() {
    setDecision(null);
    setNote("");
    setReason("");
  }

  async function onApprove(event: FormEvent) {
    event.preventDefault();
    if (!token || !decision) return;
    const request = decision.request;
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      const result = await mods.approveModReviewRequest(token, request.requestId, {
        redistribution,
        ...(note.trim() ? { note: note.trim() } : {}),
      });
      setData((current) => (current ? replaceRow(current, result.request) : current));
      setNotice(
        `“${result.attestation.displayName}” is verified, redistribution ${result.attestation.redistribution}. ${request.serverName ?? "The server"} sees it on the next attest call.`,
      );
      close();
    } catch (err) {
      setError(err instanceof MasterApiError ? err.message : "Request failed. Try again.");
    } finally {
      setBusy(false);
    }
  }

  async function onDecline(event: FormEvent) {
    event.preventDefault();
    if (!token || !decision || reason.trim().length === 0) return;
    const request = decision.request;
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      const updated = await mods.declineModReviewRequest(token, request.requestId, reason.trim());
      setData((current) => (current ? replaceRow(current, updated) : current));
      setNotice(
        `Declined “${request.displayName}”. The reason is now visible to the owner in their Warden panel.`,
      );
      close();
    } catch (err) {
      setError(err instanceof MasterApiError ? err.message : "Request failed. Try again.");
    } finally {
      setBusy(false);
    }
  }

  const waiting = data?.filter((row) => row.status === "pending").length ?? 0;

  return (
    <AdminPanel
      title="Mod review queue"
      icon={hourglass}
      brackets
      actions={
        <>
          <Button href="/admin/mods" size="sm" color="neutral" border lines="none" icon={puzzle} iconPosition="left">
            Whitelist
          </Button>
          <Button size="sm" color="neutral" border lines="none" icon={refresh} iconPosition="left" onClick={reload} disabled={loading}>
            Refresh
          </Button>
        </>
      }
      footnote={
        <>
          Owners host their own bytes; a request asks only for our verdict on them. Approving writes a
          whitelist entry and lifts the capability cap for that one hash. Check the source page and
          the licence before you do, because approval is what lets executable content run.
        </>
      }
    >
      <ErrorStrip message={error} />
      <SuccessStrip message={notice} />

      <Toolbar>
        <Filters label="Filter by decision">
          {FILTERS.map((option) => (
            <Chip
              key={option.value}
              pressed={filter === option.value}
              onClick={() => {
                setFilter(option.value);
                close();
              }}
            >
              {option.label}
            </Chip>
          ))}
        </Filters>
        {data ? (
          <Count>
            {filter === "pending"
              ? `${waiting} waiting`
              : `${data.length} ${data.length === 1 ? "request" : "requests"}`}
          </Count>
        ) : null}
      </Toolbar>

      {decision ? (
        <DecisionForm
          decision={decision}
          busy={busy}
          redistribution={redistribution}
          note={note}
          reason={reason}
          onRedistribution={setRedistribution}
          onNote={setNote}
          onReason={setReason}
          onSubmit={decision.kind === "approve" ? onApprove : onDecline}
          onCancel={close}
        />
      ) : null}

      {loading && !data ? <LoadingBlock label="Loading the queue" /> : null}
      {data && data.length === 0 ? (
        <EmptyBlock icon={hourglass}>
          {filter === "pending"
            ? "Nothing is waiting on us. Every submitted hash has a decision."
            : filter === "all"
              ? "No server owner has asked for a review yet."
              : `No ${filter} request.`}
        </EmptyBlock>
      ) : null}

      {data && data.length > 0 ? (
        <AdminTable caption="Mod review requests" minWidth="64rem">
          <thead>
            <tr>
              <th scope="col">SHA-256</th>
              <th scope="col">Mod / source</th>
              <th scope="col">Contents</th>
              <th scope="col">Asked by / submitted</th>
              <th scope="col">Decision</th>
              <th scope="col" className={cell.actions}>
                Actions
              </th>
            </tr>
          </thead>
          <tbody>
            {data.map((row) => (
              <RequestRow
                key={row.requestId}
                row={row}
                busy={busy}
                active={decision?.request.requestId === row.requestId}
                onDecide={(kind) => open(row, kind)}
              />
            ))}
          </tbody>
        </AdminTable>
      ) : null}
    </AdminPanel>
  );
}

function RequestRow({
  row,
  busy,
  active,
  onDecide,
}: {
  row: ModReviewRequest;
  busy: boolean;
  active: boolean;
  onDecide: (kind: "approve" | "decline") => void;
}) {
  const asker = row.requestedByEmail ?? (row.requestedByAccountId ? shortId(row.requestedByAccountId) : null);

  return (
    <tr className={row.status === "pending" ? (active ? cell.active : undefined) : cell.muted}>
      <td className={cell.nowrap}>
        <HashCell sha256={row.sha256} />
      </td>
      <td className={styles.mod}>
        <Primary>{row.displayName}</Primary>
        <Sub>
          {row.author ?? "author unknown"}
          {row.sizeBytes !== null || row.fileCount !== null
            ? ` · ${formatBytes(row.sizeBytes)}${row.fileCount !== null ? ` · ${row.fileCount} files` : ""}`
            : ""}
        </Sub>
        <span className={styles.source}>
          <SourceCell url={row.sourceUrl} />
        </span>
      </td>
      <td>
        <ContentClassChip value={row.contentClass} />
      </td>
      <td className={styles.asker}>
        <Primary>{row.serverName ?? "delisted server"}</Primary>
        <Sub title={row.serverId}>{shortId(row.serverId)}</Sub>
        {asker ? <Sub>{asker}</Sub> : null}
        <Sub>{formatDateTime(row.requestedAtUtc)}</Sub>
      </td>
      <td className={styles.decision}>
        <Stack>
          <StatusTag status={STATUS_TAG[row.status]}>{row.status}</StatusTag>
          {row.decidedAtUtc ? (
            <Sub>
              {formatDateTime(row.decidedAtUtc)}
              {row.decidedByEmail ? ` · ${row.decidedByEmail}` : ""}
            </Sub>
          ) : null}
          {row.declineReason ? <Sub plain>{row.declineReason}</Sub> : null}
        </Stack>
      </td>
      <td className={cell.actions}>
        {row.status === "pending" ? (
          <span className={styles.actions}>
            <Button size="sm" color="neutral" border lines="none" icon={tick02} iconPosition="left" disabled={busy} onClick={() => onDecide("approve")}>
              Approve
            </Button>
            <Button size="sm" color="red" border lines="none" disabled={busy} onClick={() => onDecide("decline")}>
              Decline
            </Button>
          </span>
        ) : null}
      </td>
    </tr>
  );
}

function DecisionForm({
  decision,
  busy,
  redistribution,
  note,
  reason,
  onRedistribution,
  onNote,
  onReason,
  onSubmit,
  onCancel,
}: {
  decision: { request: ModReviewRequest; kind: "approve" | "decline" };
  busy: boolean;
  redistribution: ModRedistribution;
  note: string;
  reason: string;
  onRedistribution: (value: ModRedistribution) => void;
  onNote: (value: string) => void;
  onReason: (value: string) => void;
  onSubmit: (event: FormEvent) => void;
  onCancel: () => void;
}) {
  const { request, kind } = decision;

  if (kind === "decline") {
    return (
      <FormPanel title={`Decline ${request.displayName}`} onSubmit={onSubmit} danger>
        <p className={styles.explain}>
          Declining <strong>{request.displayName}</strong> leaves the hash unknown. The server may
          keep hosting it; players still get inert content only, and executable content stays
          refused.
        </p>
        <Field label="Reason the owner will see" hint="Written for them: say what would make this reviewable.">
          <Input
            value={reason}
            onChange={(event) => onReason(event.target.value)}
            maxLength={512}
            required
          />
        </Field>
        <FormActions>
          <Button type="submit" size="sm" color="red" lines="none" busy={busy} disabled={reason.trim().length === 0}>
            {busy ? "Working…" : "Decline the request"}
          </Button>
          <Button size="sm" color="neutral" border lines="none" onClick={onCancel}>
            Cancel
          </Button>
        </FormActions>
      </FormPanel>
    );
  }

  return (
    <FormPanel title={`Approve ${request.displayName}`} onSubmit={onSubmit}>
      <p className={styles.explain}>
        Approving <strong>{request.displayName}</strong> records <strong>safety: verified</strong> for that one hash.
        You are saying you read these exact bytes.{" "}
        {request.contentClass === "executable"
          ? "The importer found executable content in this package, so approval is what lets it run at all."
          : "The importer found inert content only."}{" "}
        The licence is a separate answer, below.
      </p>
      <FormGrid>
        <Field
          label="Redistribution: the licence"
          hint={
            <span className={styles.redistHint}>
              <RedistributionTag value={redistribution} /> {REDISTRIBUTION_NOTE[redistribution]}
            </span>
          }
        >
          <Select value={redistribution} onChange={(event) => onRedistribution(event.target.value as ModRedistribution)}>
            {REDISTRIBUTION_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Reviewer note" optional>
          <Input
            value={note}
            onChange={(event) => onNote(event.target.value)}
            placeholder="What you checked, and where the licence answer came from"
            maxLength={512}
          />
        </Field>
      </FormGrid>
      <FormActions>
        <Button type="submit" size="sm" color="red" lines="none" icon={tick02} iconPosition="left" busy={busy}>
          {busy ? "Working…" : "Approve and write the attestation"}
        </Button>
        <Button size="sm" color="neutral" border lines="none" onClick={onCancel}>
          Cancel
        </Button>
      </FormActions>
    </FormPanel>
  );
}
