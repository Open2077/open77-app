"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { Button } from "@/components/admin/admin-button";
import { Chip } from "@/components/ui/chip";
import type { DialogHandle } from "@/components/ui/dialog";
import { Loader } from "@/components/ui/feedback";
import { Field, Textarea } from "@/components/ui/field";
import { checkmarkBadge01, refresh } from "@/components/ui/icons";
import { MasterApiError } from "@/lib/account/api";
import * as admin from "@/lib/account/admin-api";
import type { GameOwnershipRow } from "@/lib/account/admin-api";
import {
  AdminPanel,
  AdminTable,
  Count,
  EmptyBlock,
  Filters,
  Footnote,
  GuardedDialog,
  LoadingBlock,
  Pager,
  Primary,
  SearchBox,
  StatusTag,
  Sub,
  SuccessStrip,
  Toolbar,
  ToolbarGroup,
  cell,
} from "./admin-kit";
import { formatDateTime } from "./format";
import { ErrorStrip, useAdminData } from "./use-admin-data";

import styles from "./game-ownership-panel.module.css";

const FILTERS = [["all", "All accounts"], ["granted", "Whitelisted"], ["withheld", "Not whitelisted"]] as const;

export function GameOwnershipPanel() {
  const [input, setInput] = useState("");
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState("all");
  const [page, setPage] = useState(1);
  const [selection, setSelection] = useState<GameOwnershipRow | null>(null);
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const [mutationError, setMutationError] = useState<string | null>(null);
  const [notice, setNotice] = useState("");
  const inFlight = useRef(false);
  const dialog = useRef<DialogHandle>(null);
  useEffect(() => {
    const timer = setTimeout(() => { setQuery(input.trim()); setPage(1); }, 350);
    return () => clearTimeout(timer);
  }, [input]);
  useEffect(() => {
    if (selection) dialog.current?.open();
    else dialog.current?.close();
  }, [selection]);
  const load = useCallback((token: string) => admin.gameOwnership(token, query,
    filter === "all" ? undefined : filter === "granted", page), [query, filter, page]);
  const { token, data, error, loading, reload } = useAdminData(load);

  function edit(row: GameOwnershipRow) {
    setReason(""); setMutationError(null); setSelection(row);
  }
  async function save() {
    if (!selection || !token || inFlight.current || !reason.trim()) return;
    const row = selection;
    inFlight.current = true; setBusy(true); setMutationError(null);
    try {
      await admin.setGameOwnership(token, row.accountId, !row.granted, row.revision, reason.trim());
      setNotice(`${row.granted ? "Manual approval removed" : "Account whitelisted"} for ${row.email}.`);
      setSelection(null); reload();
    } catch (err) {
      setMutationError(err instanceof MasterApiError ? err.message : "The request failed. Refresh the list to check the current state.");
    } finally { inFlight.current = false; setBusy(false); }
  }
  const pages = data ? Math.max(1, Math.ceil(data.total / data.pageSize)) : 1;

  return (
    <>
      <AdminPanel
        title="Genuine whitelist"
        icon={checkmarkBadge01}
        brackets
        actions={
          <SearchBox value={input} onChange={setInput} placeholder="Search e-mail, name or account ID…" label="Search game access accounts" maxLength={96} />
        }
        footnote="Every manual decision records its author, date and reason in the audit log. No store identifier is created by whitelisting."
      >
        <Footnote>
          Approve an Open77 account when store verification is unavailable, including support cases and test accounts.
          A manual approval allows game access without Steam or GOG when linking is required. Suspensions, bans and other
          access rules still apply.
        </Footnote>
        <Toolbar>
          <Filters label="Filter manual approvals">
            {FILTERS.map(([value, label]) => (
              <Chip key={value} pressed={filter === value} onClick={() => { setFilter(value); setPage(1); }}>
                {label}
              </Chip>
            ))}
          </Filters>
          <ToolbarGroup>
            {data ? <Count>{data.total} accounts</Count> : null}
            <Button size="sm" color="neutral" border lines="none" icon={refresh} iconPosition="left" disabled={loading} onClick={reload}>
              Refresh list
            </Button>
          </ToolbarGroup>
        </Toolbar>
        <ErrorStrip message={error} />
        <SuccessStrip message={notice} />
        {loading ? (data ? <Loader label="Loading accounts…" /> : <LoadingBlock label="Loading accounts…" />) : null}
        {data && !data.items.length ? <EmptyBlock icon={checkmarkBadge01}>No accounts match this search.</EmptyBlock> : null}
        {data?.items.length ? (
          <AdminTable caption="Game access by account" minWidth="66rem">
            <thead>
              <tr>
                <th>Account</th>
                <th>Store verification</th>
                <th>Manual approval</th>
                <th>Last decision</th>
                <th className={cell.actions}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {data.items.map(row => (
                <tr key={row.accountId} className={row.status === "suspended" ? cell.muted : undefined}>
                  <td className={styles.account}>
                    <Primary>{row.displayName}</Primary>
                    <Sub>{row.email}</Sub>
                    <Sub>{row.accountId}</Sub>
                    <span className={styles.tags}>
                      <StatusTag status={row.role === "admin" ? "accent" : "neutral"}>{row.role}</StatusTag>
                      <StatusTag status={row.status === "active" ? "neutral" : "danger"}>{row.status}</StatusTag>
                    </span>
                  </td>
                  <td>
                    <StatusTag status={row.storeVerified ? "ok" : "neutral"}>{row.storeVerified ? "Verified once" : "Not verified"}</StatusTag>
                    <Sub>Steam: {row.steamId || "—"}</Sub>
                    <Sub>GOG: {row.gogId || "—"}</Sub>
                  </td>
                  <td>
                    <StatusTag status={row.granted ? "live" : "neutral"}>{row.granted ? "Whitelisted" : "None"}</StatusTag>
                  </td>
                  <td className={styles.decision}>
                    <span className={styles.reason}>{row.reason || "—"}</span>
                    {row.updatedAtUtc ? (
                      <>
                        <Sub>{formatDateTime(row.updatedAtUtc)}</Sub>
                        <Sub>By {row.updatedBy}</Sub>
                      </>
                    ) : null}
                  </td>
                  <td className={cell.actions}>
                    <Button
                      size="sm"
                      color={row.granted ? "red" : "neutral"}
                      border
                      lines="none"
                      disabled={busy || loading}
                      onClick={() => edit(row)}
                    >
                      {row.granted ? "Remove approval" : "Whitelist account"}
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </AdminTable>
        ) : null}
        {data ? (
          <Pager
            summary={`${data.total} accounts · page ${data.page} of ${pages}`}
            previous={{ disabled: loading || page <= 1, onClick: () => setPage(page - 1) }}
            next={{ disabled: loading || page >= pages, onClick: () => setPage(page + 1) }}
          />
        ) : null}
      </AdminPanel>

      <GuardedDialog
        ref={dialog}
        size="sm"
        eyebrow="Genuine whitelist"
        title={selection?.granted ? "Remove manual approval?" : "Whitelist this account?"}
        locked={() => inFlight.current}
        focusFooter
        onClose={() => setSelection(null)}
        footer={
          <>
            <Button size="sm" color="neutral" border lines="none" disabled={busy} onClick={() => setSelection(null)}>
              Cancel
            </Button>
            <Button
              type="submit"
              form="game-ownership-decision"
              size="sm"
              color="red"
              lines="none"
              disabled={busy || !token || !reason.trim()}
            >
              {selection?.granted ? "Confirm removal" : "Confirm whitelist"}
            </Button>
          </>
        }
      >
        <div className={styles.dialogBody}>
          <div className={styles.target}>
            <Primary>{selection?.displayName}</Primary>
            <Sub>{selection?.email}</Sub>
            <Sub>{selection?.accountId}</Sub>
          </div>
          <p className={styles.explain}>
            {selection?.granted
              ? "This removes the manual exception. Access follows the platform's current linking policy. Already verified store links remain valid."
              : "This account can play without a verified Steam or GOG link. Its Open77 account identifier remains available to game servers."}
          </p>
          <form id="game-ownership-decision" onSubmit={e => { e.preventDefault(); void save(); }}>
            <Field label="Reason for this decision" hint="Recorded in the audit log with your name.">
              <Textarea
                value={reason}
                onChange={e => setReason(e.target.value)}
                required
                maxLength={500}
                rows={3}
                placeholder="Support ticket, Xbox account, developer test…"
                disabled={busy}
              />
            </Field>
          </form>
          <ErrorStrip message={mutationError} />
          {busy ? <Loader label="Saving decision…" /> : null}
        </div>
      </GuardedDialog>
    </>
  );
}
