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
    if (!token) return;
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
      title="Alpha access"
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
          Alpha access is an entitlement, not a role: it lets somebody join a world and grants no
          staff powers. Administrators hold it implicitly through their role, so those rows show
          access with no granter. Granting one explicitly anyway is what survives a later demotion,
          and revoking one only clears that explicit record while the role keeps them in. Both
          actions are idempotent and land in the audit log.
        </>
      }
    >
      {data ? <GateBanner required={data.alphaAccessRequired} /> : null}
      <ErrorStrip message={error} />

      <Toolbar>
        <Filters label="Filter by access">
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
              ? "No account holds alpha access yet."
              : filter === "withheld"
                ? "Every account already has alpha access."
                : "There are no accounts."}
        </EmptyBlock>
      ) : null}

      {data && data.items.length > 0 ? (
        <AdminTable caption="Alpha access by account" minWidth="62rem">
          <thead>
            <tr>
              <th>Account</th>
              <th>Role</th>
              <th>Status</th>
              <th>Alpha access</th>
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
      <Notice kind="info" title="The alpha gate is on.">
        Only the accounts listed here as having access can join a world; everyone else can install,
        sign in and stay updated, and is refused when their client asks for a connect ticket.
      </Notice>
    );
  }
  return (
    <Notice kind="warning" title="The alpha gate is off, so grants decide nothing today.">
      Every signed-in account can join a world regardless of this list. Grants made here are still
      recorded and take effect the moment the gate is switched on in the master configuration, but
      granting one now lets nobody in who was not already in.
    </Notice>
  );
}

function AccessRow({
  row,
  busy,
  onSet,
}: {
  row: AlphaAccessRow;
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
          {row.alphaAccess ? <StatusTag status="ok">access</StatusTag> : <StatusTag status="neutral">no access</StatusTag>}
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
        {explicit ? (
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
