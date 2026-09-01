"use client";

import Link from "next/link";
import { type FormEvent, useCallback, useState } from "react";

import { formatDateTime, hostOf, safeHttpUrl, shortId } from "@/components/admin/format";
import { HashCell } from "@/components/admin/hash-cell";
import {
  ContentClassChip,
  RedistributionTag,
  REDISTRIBUTION_NOTE,
  REDISTRIBUTION_OPTIONS,
} from "@/components/admin/mod-badges";
import { ErrorStrip, useAdminData } from "@/components/admin/use-admin-data";
import { CheckIcon, InfoIcon, ShieldIcon } from "@/components/icons";
import { MasterApiError } from "@/lib/account/api";
import * as mods from "@/lib/account/mods-api";
import type {
  ModRedistribution,
  ModReviewRequest,
  ModReviewStatus,
} from "@/lib/account/mods-api";

type QueueFilter = ModReviewStatus | "all";

const FILTERS: { value: QueueFilter; label: string }[] = [
  { value: "pending", label: "Waiting" },
  { value: "approved", label: "Approved" },
  { value: "declined", label: "Declined" },
  { value: "all", label: "Everything" },
];

const STATUS_CHIP: Record<ModReviewStatus, string> = {
  pending: "adm-chip-ok",
  approved: "adm-chip-dim",
  declined: "adm-chip-warn",
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
    <section className="adm-panel">
      <div className="adm-panel-head">
        <h2 className="adm-panel-title">
          <ShieldIcon size={17} />
          Mod review queue
        </h2>
        <div className="adm-panel-head" style={{ margin: 0 }}>
          <Link className="ac-iconbtn" href="/admin/mods">
            Whitelist
          </Link>
          <button className="ac-iconbtn" type="button" onClick={reload} disabled={loading}>
            Refresh
          </button>
        </div>
      </div>

      <ErrorStrip message={error} />
      {notice ? (
        <p className="ac-success" role="status" style={{ marginBottom: 12 }}>
          <CheckIcon size={14} />
          <span>{notice}</span>
        </p>
      ) : null}

      <div className="adm-toolbar">
        <div className="adm-filters" role="group" aria-label="Filter by decision">
          {FILTERS.map((option) => (
            <button
              key={option.value}
              className={`ac-iconbtn${filter === option.value ? " is-copied" : ""}`}
              type="button"
              aria-pressed={filter === option.value}
              onClick={() => {
                setFilter(option.value);
                close();
              }}
            >
              {option.label}
            </button>
          ))}
        </div>
        {data ? (
          <span className="adm-count">
            {filter === "pending"
              ? `${waiting} waiting`
              : `${data.length} ${data.length === 1 ? "request" : "requests"}`}
          </span>
        ) : null}
      </div>

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

      {loading && !data ? <p className="ac-loading">Loading the queue…</p> : null}
      {data && data.length === 0 ? (
        <p className="adm-empty">
          {filter === "pending"
            ? "Nothing is waiting on us — every submitted hash has a decision."
            : filter === "all"
              ? "No server owner has asked for a review yet."
              : `No ${filter} request.`}
        </p>
      ) : null}

      {data && data.length > 0 ? (
        <div className="adm-tablewrap">
          <table className="adm-table">
            <thead>
              <tr>
                <th scope="col">SHA-256</th>
                <th scope="col">Mod</th>
                <th scope="col">Source</th>
                <th scope="col">Contents</th>
                <th scope="col">Asked by</th>
                <th scope="col">Submitted</th>
                <th scope="col">Decision</th>
                <th scope="col" className="adm-actions-cell">
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
          </table>
        </div>
      ) : null}

      <p className="adm-footnote">
        Owners host their own bytes; a request asks only for our verdict on them. Approving writes a
        whitelist entry and lifts the capability cap for that one hash — check the source page and
        the licence before you do, because approval is what lets executable content run.
      </p>
    </section>
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
  const source = safeHttpUrl(row.sourceUrl);
  const asker = row.requestedByEmail ?? (row.requestedByAccountId ? shortId(row.requestedByAccountId) : null);

  return (
    <tr className={row.status === "pending" ? (active ? "is-active" : "") : "is-muted"}>
      <td>
        <HashCell sha256={row.sha256} />
      </td>
      <td>
        <div>{row.displayName}</div>
        <div className="adm-mono adm-faint">
          {row.author ?? "author unknown"}
          {row.sizeBytes !== null || row.fileCount !== null
            ? ` · ${formatBytes(row.sizeBytes)}${row.fileCount !== null ? ` · ${row.fileCount} files` : ""}`
            : ""}
        </div>
      </td>
      <td className="adm-source">
        {source ? (
          <a href={source} target="_blank" rel="noreferrer noopener" title={source}>
            {hostOf(source)}
          </a>
        ) : row.sourceUrl ? (
          <span className="adm-mono adm-faint" title="Not an http(s) link — not rendered as one">
            {row.sourceUrl}
          </span>
        ) : (
          <span className="adm-faint">—</span>
        )}
      </td>
      <td>
        <ContentClassChip value={row.contentClass} />
      </td>
      <td>
        <div className="adm-stack">
          <span>{row.serverName ?? "delisted server"}</span>
          <span className="adm-stack-note">{shortId(row.serverId)}</span>
          {asker ? <span className="adm-stack-note">{asker}</span> : null}
        </div>
      </td>
      <td className="adm-mono adm-faint">{formatDateTime(row.requestedAtUtc)}</td>
      <td>
        <div className="adm-stack">
          <span className={`adm-chip ${STATUS_CHIP[row.status]}`}>{row.status}</span>
          {row.decidedAtUtc ? (
            <span className="adm-stack-note">
              {formatDateTime(row.decidedAtUtc)}
              {row.decidedByEmail ? ` · ${row.decidedByEmail}` : ""}
            </span>
          ) : null}
          {row.declineReason ? (
            <span className="adm-stack-note">{row.declineReason}</span>
          ) : null}
        </div>
      </td>
      <td className="adm-actions-cell">
        {row.status === "pending" ? (
          <div className="adm-action-row">
            <button
              className="ac-iconbtn"
              type="button"
              disabled={busy}
              onClick={() => onDecide("approve")}
            >
              Approve
            </button>
            <button
              className="ac-iconbtn is-danger"
              type="button"
              disabled={busy}
              onClick={() => onDecide("decline")}
            >
              Decline
            </button>
          </div>
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
      <form className="adm-form" onSubmit={onSubmit}>
        <p className="ac-notice adm-form-span" style={{ margin: 0 }}>
          <InfoIcon />
          <span>
            Declining <strong>{request.displayName}</strong> leaves the hash unknown. The server may
            keep hosting it; players still get inert content only, and executable content stays
            refused.
          </span>
        </p>
        <label className="ac-label adm-form-span">
          Reason the owner will see
          <input
            className="ac-input"
            value={reason}
            onChange={(event) => onReason(event.target.value)}
            placeholder="Written for them — say what would make this reviewable"
            maxLength={512}
            required
          />
        </label>
        <div className="ac-form-actions adm-form-span" style={{ margin: 0 }}>
          <button
            className="btn btn-small btn-primary"
            type="submit"
            disabled={busy || reason.trim().length === 0}
          >
            {busy ? "Working…" : "Decline the request"}
          </button>
          <button className="btn btn-small btn-ghost" type="button" onClick={onCancel}>
            Cancel
          </button>
        </div>
      </form>
    );
  }

  return (
    <form className="adm-form" onSubmit={onSubmit}>
      <p className="ac-notice adm-form-span" style={{ margin: 0 }}>
        <InfoIcon />
        <span>
          Approving <strong>{request.displayName}</strong> records{" "}
          <strong>safety: verified</strong> for that one hash — you are saying you read these exact
          bytes.{" "}
          {request.contentClass === "executable"
            ? "The importer found executable content in this package, so approval is what lets it run at all."
            : "The importer found inert content only."}{" "}
          The licence is a separate answer, below.
        </span>
      </p>
      <label className="ac-label">
        Redistribution — the licence
        <select
          className="adm-select"
          value={redistribution}
          onChange={(event) => onRedistribution(event.target.value as ModRedistribution)}
          aria-describedby="decision-redistribution-hint"
        >
          {REDISTRIBUTION_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        <span className="ac-hint" id="decision-redistribution-hint">
          <RedistributionTag value={redistribution} /> {REDISTRIBUTION_NOTE[redistribution]}
        </span>
      </label>
      <label className="ac-label">
        Reviewer note
        <input
          className="ac-input"
          value={note}
          onChange={(event) => onNote(event.target.value)}
          placeholder="What you checked, and where the licence answer came from"
          maxLength={512}
        />
      </label>
      <div className="ac-form-actions adm-form-span" style={{ margin: 0 }}>
        <button className="btn btn-small btn-primary" type="submit" disabled={busy}>
          {busy ? "Working…" : "Approve — write the attestation"}
        </button>
        <button className="btn btn-small btn-ghost" type="button" onClick={onCancel}>
          Cancel
        </button>
      </div>
    </form>
  );
}
