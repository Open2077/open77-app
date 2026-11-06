"use client";

import { useCallback, useEffect, useState } from "react";

import {
  AdminPanel,
  AdminTable,
  Count,
  EmptyBlock,
  Filters,
  LoadingBlock,
  Mono,
  Pager,
  Primary,
  SearchBox,
  Stack,
  StatusTag,
  Sub,
  Toolbar,
  cell,
} from "@/components/admin/admin-kit";
import { ArmButton } from "@/components/admin/arm-button";
import { formatDateTime, shortId } from "@/components/admin/format";
import { ErrorStrip, useAdminData } from "@/components/admin/use-admin-data";
import { Button } from "@/components/admin/admin-button";
import { Chip } from "@/components/ui/chip";
import { Notice } from "@/components/ui/feedback";
import { ticket01 } from "@/components/ui/icons";
import { MasterApiError } from "@/lib/account/api";
import * as admin from "@/lib/account/admin-api";
import type { AlphaAccessPage, AlphaAccessRow } from "@/lib/account/admin-api";
import { useSession } from "@/lib/account/session";

const PAGE_SIZE = 25;

type AccessFilter = "all" | "granted" | "withheld";

const FILTERS: { value: AccessFilter; label: string }[] = [
  { value: "all", label: "Everyone" },
  { value: "granted", label: "With access" },
  { value: "withheld", label: "Waiting" },
];

/** The `granted` query parameter filters on *effective* access, so admins count as granted. */
function grantedParam(filter: AccessFilter): boolean | undefined {
  return filter === "all" ? undefined : filter === "granted";
}

function replaceRow(page: AlphaAccessPage, row: AlphaAccessRow): AlphaAccessPage {
  return {
    ...page,
    items: page.items.map((item) => (item.accountId === row.accountId ? row : item)),
  };
}

/**
 * What the row will look like if the call succeeds. Only used to redraw
 * immediately; the master's own row replaces it on the response, and the
 * pre-call row is put back on failure.
 */
function predictedRow(
  row: AlphaAccessRow,
  granted: boolean,
  operator: { accountId: string; email?: string } | null,
): AlphaAccessRow {
  if (!granted) {
    // Revoking clears the explicit grant only — an administrator keeps access
    // through their role, which is exactly what the master will answer.
    return {
      ...row,
      alphaAccess: row.alphaAccessImplicit,
      grantedAtUtc: null,
      grantedByAccountId: null,
      grantedByEmail: null,
    };
  }
  return {
    ...row,
    alphaAccess: true,
    // Granting is idempotent: an existing grant keeps its original provenance.
    grantedAtUtc: row.grantedAtUtc ?? new Date().toISOString(),
    grantedByAccountId: row.grantedByAccountId ?? operator?.accountId ?? null,
    grantedByEmail: row.grantedByEmail ?? operator?.email ?? null,
  };
}

/**
 * The closed-alpha whitelist.
 *
 * Alpha access is a per-account entitlement, not a role: granting it lets
 * somebody join a world and gives them no staff powers whatsoever. It is also
 * held implicitly by administrators, which is why a staff row shows access with
 * no granter and no timestamp — correct, not missing data.
 *
 * The panel is honest about two things the operator cannot otherwise see: that
 * the gate may be switched off entirely (in which case a grant is bookkeeping),
 * and that a mutation which failed did not happen — the optimistic row is put
 * back and the error names the account.
 */
export function AlphaAccessPanel() {
  const { session } = useSession();
  const [input, setInput] = useState("");
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<AccessFilter>("all");
  const [page, setPage] = useState(1);
  const [pending, setPending] = useState<readonly string[]>([]);

  // Debounced search, exactly as the users and licenses panels do it. A new
  // search starts back at the first page — page 4 of the old result is
  // meaningless against a different filter.
  useEffect(() => {
    const timer = setTimeout(() => {
      setQuery(input.trim());
      setPage(1);
    }, 350);
    return () => clearTimeout(timer);
  }, [input]);

  const load = useCallback(
    (token: string) => {
      const granted = grantedParam(filter);
      return admin.alphaAccess(token, {
        ...(query ? { query } : {}),
        ...(granted === undefined ? {} : { granted }),
        page,
        pageSize: PAGE_SIZE,
      });
    },
    [query, filter, page],
  );
  const { token, data, setData, error, setError, loading } = useAdminData(load);

  async function setAccess(row: AlphaAccessRow, granted: boolean) {
    if (!token || !data?.alphaAccessRequired) return;
    setError(null);
    setPending((current) => [...current, row.accountId]);
    setData((current) =>
      current ? replaceRow(current, predictedRow(row, granted, session)) : current,
    );
    try {
      const updated = granted
        ? await admin.grantAlphaAccess(token, row.accountId)
        : await admin.revokeAlphaAccess(token, row.accountId);
      setData((current) => (current ? replaceRow(current, updated) : current));
    } catch (err) {
      // Put the row back the way it was: the list must never claim an
      // entitlement the master did not record.
      setData((current) => (current ? replaceRow(current, row) : current));
      const reason =
        err instanceof MasterApiError && err.code === "user_not_found"
          ? "that account no longer exists; reload the list"
          : err instanceof MasterApiError
            ? err.message
            : "the request failed";
      setError(
        `${granted ? "Grant" : "Revoke"} failed for ${row.email}: ${reason}. Nothing was changed.`,
      );
    } finally {
      setPending((current) => current.filter((id) => id !== row.accountId));
    }
  }

  const total = data?.total ?? 0;
  const pageCount = data ? Math.max(1, Math.ceil(data.total / data.pageSize)) : 1;
  const firstShown = data && data.items.length > 0 ? (data.page - 1) * data.pageSize + 1 : 0;
  const lastShown = data ? (data.page - 1) * data.pageSize + data.items.length : 0;

  return (
    <AdminPanel
      title="Access history"
      icon={ticket01}
      brackets
      actions={
        <SearchBox
          value={input}
          onChange={setInput}
          placeholder="Search e-mail, name or account ID…"
          label="Search accounts"
          maxLength={96}
        />
      }
      footnote={
        <>
          These are historical per-account grants. Open Alpha does not require a grant to play, host or build.
          Account suspensions, bans, server ownership and community admission rules still apply.
        </>
      }
    >
      {data ? <GateBanner required={data.alphaAccessRequired} /> : null}
      <ErrorStrip message={error} />

      <Toolbar>
        <Filters label="Filter historical grants">
          {FILTERS.map((option) => (
            <Chip
              key={option.value}
              pressed={filter === option.value}
              onClick={() => {
                setFilter(option.value);
                setPage(1);
              }}
            >
              {option.label}
            </Chip>
          ))}
        </Filters>
        {data ? (
          <Count>
            {total} account{total === 1 ? "" : "s"} matched
          </Count>
        ) : null}
      </Toolbar>

      {loading && !data ? <LoadingBlock label="Loading accounts" /> : null}
      {data && data.items.length === 0 ? (
        <EmptyBlock icon={ticket01}>
          {query
            ? `No account matches “${query}”.`
            : filter === "granted"
              ? "No historical grant matches this filter."
              : filter === "withheld"
                ? "Every account has a historical grant or an administrator role."
                : "There are no accounts."}
        </EmptyBlock>
      ) : null}

      {data && data.items.length > 0 ? (
        <AdminTable caption="Historical access grants by account" minWidth="62rem">
          <thead>
            <tr>
              <th>Account</th>
              <th>Role</th>
              <th>Status</th>
              <th>Historical grant</th>
              <th>Granted by</th>
              <th>Granted</th>
              <th className={cell.actions}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {data.items.map((row) => (
              <AccessRow
                key={row.accountId}
                row={row}
                gateActive={data.alphaAccessRequired}
                busy={pending.includes(row.accountId)}
                onSet={(granted) => setAccess(row, granted)}
              />
            ))}
          </tbody>
        </AdminTable>
      ) : null}
      {data && data.items.length > 0 && pageCount > 1 ? (
        <Pager
          summary={`${firstShown}–${lastShown} of ${total} · page ${data.page} of ${pageCount}`}
          previous={{ disabled: data.page <= 1, onClick: () => setPage((value) => Math.max(1, value - 1)) }}
          next={{ disabled: data.page >= pageCount, onClick: () => setPage((value) => value + 1) }}
        />
      ) : null}
    </AdminPanel>
  );
}

/** Says whether the entitlement is actually being enforced right now. */
function GateBanner({ required }: { required: boolean }) {
  if (required) {
    return (
      <Notice kind="warning" title="The master still enforces access grants.">
        Open Alpha should not require approval. Disable AlphaAccessRequired in the master configuration
        to let all eligible accounts join; changing an individual grant does not open access for everyone.
      </Notice>
    );
  }
  return (
    <Notice kind="success" title="Open Alpha is active — no approval needed.">
      Players can join without a historical grant. Server downloads are public and every verified account
      can create license keys. This list is kept for reference; grant actions are disabled in Open Alpha.
    </Notice>
  );
}

function AccessRow({
  row,
  gateActive,
  busy,
  onSet,
}: {
  row: AlphaAccessRow;
  gateActive: boolean;
  busy: boolean;
  onSet: (granted: boolean) => void;
}) {
  const explicit = row.grantedAtUtc !== null;
  const grantedBy = row.grantedByEmail
    ? row.grantedByEmail
    : row.grantedByAccountId
      ? shortId(row.grantedByAccountId)
      : null;

  return (
    <tr className={row.status === "suspended" ? cell.muted : undefined}>
      <td>
        <Primary>{row.displayName}</Primary>
        <Sub>{row.email}</Sub>
      </td>
      <td>
        <StatusTag status={row.role === "admin" ? "accent" : "neutral"}>{row.role}</StatusTag>
      </td>
      <td>
        {row.status === "active" ? (
          <StatusTag status="neutral">active</StatusTag>
        ) : (
          <StatusTag status="danger">suspended</StatusTag>
        )}
      </td>
      <td>
        <Stack>
          {row.alphaAccess ? <StatusTag status="ok">recorded</StatusTag> : <StatusTag status="neutral">none</StatusTag>}
          {row.alphaAccessImplicit ? <Sub plain>via admin role{explicit ? " + granted" : ""}</Sub> : null}
        </Stack>
      </td>
      <td>
        <Mono tone="dim">{grantedBy ?? "—"}</Mono>
      </td>
      <td className={cell.nowrap}>
        <Mono tone="dim">{row.grantedAtUtc ? formatDateTime(row.grantedAtUtc) : "—"}</Mono>
      </td>
      <td className={cell.actions}>
        {!gateActive ? <Sub plain>Open Alpha</Sub> : explicit ? (
          <ArmButton label="Revoke" confirmLabel="Confirm revoke?" disabled={busy} onConfirm={() => onSet(false)} />
        ) : (
          <Button size="sm" color="neutral" border lines="none" disabled={busy} onClick={() => onSet(true)}>
            Grant
          </Button>
        )}
      </td>
    </tr>
  );
}
