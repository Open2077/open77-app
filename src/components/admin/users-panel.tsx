"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { useAdminActivity } from "@/components/admin/admin-activity";
import {
  AdminPanel,
  AdminTable,
  Count,
  EmptyBlock,
  Filters,
  GuardedDialog,
  LoadingBlock,
  Mono,
  Pager,
  Primary,
  SearchBox,
  StatusTag,
  Sub,
  SuccessStrip,
  Toolbar,
  ToolbarGroup,
  cell,
} from "@/components/admin/admin-kit";
import { ArmButton } from "@/components/admin/arm-button";
import { formatDateTime } from "@/components/admin/format";
import { ErrorStrip, useAdminData } from "@/components/admin/use-admin-data";
import { Button } from "@/components/admin/admin-button";
import { Chip } from "@/components/ui/chip";
import type { DialogHandle } from "@/components/ui/dialog";
import { Checkbox, Field, Input, Select } from "@/components/ui/field";
import { Loader } from "@/components/ui/feedback";
import { Icon } from "@/components/ui/icon";
import { mail01, refresh, shield01, tick02, userRemove01, users } from "@/components/ui/icons";
import { MasterApiError } from "@/lib/account/api";
import * as admin from "@/lib/account/admin-api";
import { useSession } from "@/lib/account/session";

import styles from "./users-panel.module.css";

const EMAIL_FILTERS = [["all", "Any e-mail"], ["unverified", "Unverified"], ["verified", "Verified"]] as const;
const STATUS_FILTERS = [["all", "Any status"], ["active", "Active"], ["suspended", "Suspended"]] as const;
const ROLE_FILTERS = [["all", "Any role"], ["user", "Users"], ["admin", "Admins"]] as const;
const PAGE_SIZES = [25, 50, 100] as const;

type EmailFilter = (typeof EMAIL_FILTERS)[number][0];
type StatusFilter = (typeof STATUS_FILTERS)[number][0];
type RoleFilter = (typeof ROLE_FILTERS)[number][0];

const OUTCOME_LABELS: Record<admin.BulkVerifyOutcome, string> = {
  verified: "verified",
  already_verified: "already verified",
  email_changed: "e-mail changed since the list was loaded",
  not_found: "account not found",
  invalid_email: "no e-mail to confirm",
};

/** Account search, moderation and explicit administrator-assisted e-mail verification, one by one or in bulk. */
export function UsersPanel() {
  const [input, setInput] = useState("");
  const [query, setQuery] = useState("");
  const [emailFilter, setEmailFilter] = useState<EmailFilter>("all");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [roleFilter, setRoleFilter] = useState<RoleFilter>("all");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState<number>(25);
  const [busy, setBusy] = useState(false);
  const [verification, setVerification] = useState<admin.AdminUser | null>(null);
  const [verificationError, setVerificationError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  // Accounts ticked for bulk verification, kept across pages and filters with the e-mail the list showed.
  const [selected, setSelected] = useState<ReadonlyMap<string, admin.AdminUser>>(new Map());
  const [bulkOpen, setBulkOpen] = useState(false);
  const [bulkError, setBulkError] = useState<string | null>(null);
  const [bulkFailures, setBulkFailures] = useState<string | null>(null);
  const dialog = useRef<DialogHandle>(null);
  const roleDialog = useRef<DialogHandle>(null);
  const bulkDialog = useRef<DialogHandle>(null);
  const mutationInFlight = useRef(false);
  const { begin } = useAdminActivity();
  const { session } = useSession();
  // A role change in progress: whom, to what, and the actor's password for it.
  const [roleChange, setRoleChange] = useState<{ user: admin.AdminUser; role: "admin" | "user" } | null>(null);
  const [rolePassword, setRolePassword] = useState("");
  const [roleError, setRoleError] = useState<string | null>(null);

  useEffect(() => {
    if (verification) dialog.current?.open();
    else dialog.current?.close();
  }, [verification]);

  useEffect(() => {
    if (roleChange) roleDialog.current?.open();
    else roleDialog.current?.close();
  }, [roleChange]);

  useEffect(() => {
    if (bulkOpen) bulkDialog.current?.open();
    else bulkDialog.current?.close();
  }, [bulkOpen]);

  function startRoleChange(user: admin.AdminUser, role: "admin" | "user") {
    setNotice(null);
    setError(null);
    setRoleError(null);
    setRolePassword("");
    setRoleChange({ user, role });
  }

  function replaceUser(updated: admin.AdminUser) {
    setData((current) =>
      current ? { ...current, items: current.items.map((user) => (user.accountId === updated.accountId ? updated : user)) } : null,
    );
  }

  async function changeRole() {
    if (!token || !roleChange || mutationInFlight.current) return;
    if (!rolePassword) {
      setRoleError("Enter your password to confirm.");
      return;
    }
    mutationInFlight.current = true;
    setBusy(true);
    setRoleError(null);
    const finish = begin();
    try {
      const updated = await admin.setUserRole(token, roleChange.user.accountId, roleChange.role, roleChange.user.email, rolePassword);
      replaceUser(updated);
      setNotice(
        roleChange.role === "admin"
          ? `${updated.email} is now an administrator. The change was recorded in the audit log.`
          : `${updated.email} is no longer an administrator. The change was recorded in the audit log.`,
      );
      setRolePassword("");
      setRoleChange(null);
      reload();
      finish(true);
    } catch (err) {
      setRoleError(
        err instanceof MasterApiError
          ? err.code === "reauth_failed"
            ? "Your password was not accepted."
            : err.code === "not_eligible"
              ? "Only an active account with a verified e-mail can become an administrator."
              : err.message
          : "Request failed. Try again.",
      );
      finish(false);
    } finally {
      mutationInFlight.current = false;
      setBusy(false);
    }
  }

  // Debounced search: the query state the loader depends on trails the input.
  useEffect(() => {
    const timer = setTimeout(() => {
      setQuery(input.trim());
      setPage(1);
    }, 350);
    return () => clearTimeout(timer);
  }, [input]);

  const load = useCallback(
    (token: string) =>
      admin.usersPage(
        token,
        {
          query,
          emailVerified: emailFilter === "all" ? undefined : emailFilter === "verified",
          status: statusFilter === "all" ? undefined : statusFilter,
          role: roleFilter === "all" ? undefined : roleFilter,
        },
        page,
        pageSize,
      ),
    [query, emailFilter, statusFilter, roleFilter, page, pageSize],
  );
  const { token, data, setData, error, setError, loading, reload } = useAdminData(load);

  const pages = data ? Math.max(1, Math.ceil(data.total / data.pageSize)) : 1;
  const firstShown = data && data.items.length > 0 ? (data.page - 1) * data.pageSize + 1 : 0;
  const lastShown = data ? (data.page - 1) * data.pageSize + data.items.length : 0;
  const selectable = data?.items.filter((user) => !user.emailVerified) ?? [];
  const allPageSelected = selectable.length > 0 && selectable.every((user) => selected.has(user.accountId));
  const selectionFull = selected.size >= admin.BULK_VERIFY_LIMIT;
  const filtered = query !== "" || emailFilter !== "all" || statusFilter !== "all" || roleFilter !== "all";

  function toggle(user: admin.AdminUser, on: boolean) {
    setSelected((current) => {
      const next = new Map(current);
      if (on) {
        if (next.size < admin.BULK_VERIFY_LIMIT) next.set(user.accountId, user);
      } else next.delete(user.accountId);
      return next;
    });
  }

  function togglePage(on: boolean) {
    setSelected((current) => {
      const next = new Map(current);
      for (const user of selectable) {
        if (!on) next.delete(user.accountId);
        else if (next.size < admin.BULK_VERIFY_LIMIT) next.set(user.accountId, user);
      }
      return next;
    });
  }

  function changeFilter(apply: () => void) {
    apply();
    setPage(1);
  }

  async function verifyEmail() {
    if (!token || !verification || mutationInFlight.current) return;
    mutationInFlight.current = true;
    setBusy(true);
    setVerificationError(null);
    const finish = begin();
    try {
      const updated = await admin.verifyUserEmail(token, verification.accountId, verification.email);
      replaceUser(updated);
      setSelected((current) => {
        if (!current.has(updated.accountId)) return current;
        const next = new Map(current);
        next.delete(updated.accountId);
        return next;
      });
      setNotice(`E-mail verified for ${updated.email}. The action was recorded in the audit log.`);
      setVerification(null);
      // Cancel any older search response and reconcile with authoritative state.
      reload();
      finish(true);
    } catch (err) {
      setVerificationError(err instanceof MasterApiError ? err.message : "Verification failed. Try again.");
      finish(false);
    } finally {
      mutationInFlight.current = false;
      setBusy(false);
    }
  }

  async function verifySelected() {
    if (!token || selected.size === 0 || mutationInFlight.current) return;
    mutationInFlight.current = true;
    setBusy(true);
    setBulkError(null);
    const finish = begin();
    const chosen = [...selected.values()];
    try {
      const result = await admin.verifyUserEmails(
        token,
        chosen.map((user) => ({ accountId: user.accountId, email: user.email })),
      );
      const byId = new Map(chosen.map((user) => [user.accountId, user]));
      const failures = result.results
        .filter((entry) => entry.outcome !== "verified" && entry.outcome !== "already_verified")
        .map((entry) => `${byId.get(entry.accountId)?.email ?? entry.accountId} (${OUTCOME_LABELS[entry.outcome]})`);
      const parts = [`${result.verified} e-mail${result.verified === 1 ? "" : "s"} verified`];
      if (result.alreadyVerified) parts.push(`${result.alreadyVerified} already verified`);
      if (result.failed) parts.push(`${result.failed} not verified`);
      setNotice(`${parts.join(", ")}. Each verification was recorded in the audit log.`);
      setBulkFailures(
        failures.length
          ? `Not verified: ${failures.join(", ")}. Refresh the list and check these accounts one by one.`
          : null,
      );
      setSelected(new Map());
      setBulkOpen(false);
      setPage(1);
      reload();
      finish(true);
    } catch (err) {
      setBulkError(
        err instanceof MasterApiError
          ? err.message
          : "The request failed. Refresh the list to see which accounts are verified before trying again.",
      );
      finish(false);
    } finally {
      mutationInFlight.current = false;
      setBusy(false);
    }
  }

  async function setStatus(accountId: string, action: "suspend" | "reinstate") {
    if (!token || mutationInFlight.current) return;
    mutationInFlight.current = true;
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      if (action === "suspend") await admin.suspendUser(token, accountId);
      else await admin.reinstateUser(token, accountId);
      setData((current) =>
        current
          ? {
              ...current,
              items: current.items.map((user) =>
                user.accountId === accountId ? { ...user, status: action === "suspend" ? "suspended" : "active" } : user,
              ),
            }
          : null,
      );
    } catch (err) {
      setError(
        err instanceof MasterApiError && err.code === "self_target"
          ? "You cannot suspend your own account."
          : err instanceof MasterApiError
            ? err.message
            : "Request failed. Try again.",
      );
    } finally {
      mutationInFlight.current = false;
      setBusy(false);
    }
  }

  const chosen = [...selected.values()];

  return (
    <>
      <AdminPanel
        title="Users"
        icon={users}
        brackets
        meta={data ? <Count>{`${data.total} account${data.total === 1 ? "" : "s"}`}</Count> : undefined}
        actions={
          <SearchBox
            value={input}
            onChange={setInput}
            placeholder="Search e-mail, display name or account ID…"
            label="Search users"
            maxLength={96}
          />
        }
        footnote={
          <>
            Manual e-mail verification is for delivery problems after checking the account owner&apos;s identity.
            {" "}
            Bulk verification takes up to {admin.BULK_VERIFY_LIMIT} accounts at a time; each one is checked and audited
            on its own, and an address that changed since the list was loaded is never verified.
            {" "}
            Suspension blocks sign-in and invalidates active sessions on their next request; it does not
            touch the account&apos;s licenses. Revoke those separately if needed.
            {" "}
            Role changes ask for your password, apply on the account&apos;s next request and are audited;
            you cannot change your own role.
          </>
        }
      >
        <Toolbar className={styles.toolbar}>
          <div className={styles.filterGroups}>
            <Filters label="Filter by e-mail verification">
              {EMAIL_FILTERS.map(([value, label]) => (
                <Chip key={value} size="sm" pressed={emailFilter === value} onClick={() => changeFilter(() => setEmailFilter(value))}>
                  {label}
                </Chip>
              ))}
            </Filters>
            <Filters label="Filter by account status">
              {STATUS_FILTERS.map(([value, label]) => (
                <Chip key={value} size="sm" pressed={statusFilter === value} onClick={() => changeFilter(() => setStatusFilter(value))}>
                  {label}
                </Chip>
              ))}
            </Filters>
            <Filters label="Filter by role">
              {ROLE_FILTERS.map(([value, label]) => (
                <Chip key={value} size="sm" pressed={roleFilter === value} onClick={() => changeFilter(() => setRoleFilter(value))}>
                  {label}
                </Chip>
              ))}
            </Filters>
          </div>
          <ToolbarGroup>
            <Select
              compact
              aria-label="Accounts per page"
              value={pageSize}
              disabled={loading}
              onChange={(event) => changeFilter(() => setPageSize(Number(event.target.value)))}
            >
              {PAGE_SIZES.map((size) => (
                <option key={size} value={size}>
                  {size} per page
                </option>
              ))}
            </Select>
            <Button size="sm" color="neutral" border lines="none" icon={refresh} iconPosition="left" disabled={loading} onClick={reload}>
              Refresh
            </Button>
          </ToolbarGroup>
        </Toolbar>

        {selected.size > 0 ? (
          <div className={styles.bulkBar} role="region" aria-label="Selected accounts">
            <span className={styles.bulkCount}>
              <Count>
                {selected.size} account{selected.size === 1 ? "" : "s"} selected
                {selectionFull ? ` (limit of ${admin.BULK_VERIFY_LIMIT} reached)` : ""}
              </Count>
            </span>
            <div className={styles.actions}>
              <Button size="sm" color="neutral" border lines="none" disabled={busy} onClick={() => setSelected(new Map())}>
                Clear selection
              </Button>
              <Button
                size="sm"
                color="red"
                lines="none"
                icon={tick02}
                iconPosition="left"
                disabled={busy || !token}
                data-bulk-verify=""
                onClick={() => {
                  setNotice(null);
                  setBulkFailures(null);
                  setBulkError(null);
                  setBulkOpen(true);
                }}
              >
                {`Verify ${selected.size} e-mail${selected.size === 1 ? "" : "s"}`}
              </Button>
            </div>
          </div>
        ) : null}

        <ErrorStrip message={error} />
        <SuccessStrip message={notice} />
        <ErrorStrip message={bulkFailures} />
        {loading && !data ? <LoadingBlock label="Loading users" /> : null}
        {loading && data ? <Loader label="Loading users…" /> : null}
        {data && data.items.length === 0 ? (
          <EmptyBlock
            icon={users}
            action={
              data.page > 1 ? (
                <Button size="sm" color="neutral" border lines="none" onClick={() => setPage(1)}>
                  Back to the first page
                </Button>
              ) : undefined
            }
          >
            {data.page > 1
              ? "No account on this page any more."
              : filtered
                ? "No account matches these filters."
                : "No account yet."}
          </EmptyBlock>
        ) : null}
        {data && data.items.length > 0 ? (
          <AdminTable caption="Accounts" minWidth="60rem">
            <thead>
              <tr>
                <th className={styles.selectCell}>
                  <Checkbox
                    className={styles.check}
                    checked={allPageSelected}
                    disabled={busy || selectable.length === 0 || (!allPageSelected && selectionFull)}
                    onChange={(event) => togglePage(event.target.checked)}
                    data-select-page=""
                  >
                    Select every unverified account on this page
                  </Checkbox>
                </th>
                <th>Account</th>
                <th>Role</th>
                <th>Status</th>
                <th>E-mail</th>
                <th>Created</th>
                <th className={cell.actions}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {data.items.map((user) => (
                <tr key={user.accountId} className={user.status === "suspended" ? cell.muted : selected.has(user.accountId) ? cell.active : undefined}>
                  <td className={styles.selectCell}>
                    {!user.emailVerified ? (
                      <Checkbox
                        className={styles.check}
                        checked={selected.has(user.accountId)}
                        disabled={busy || (!selected.has(user.accountId) && selectionFull)}
                        onChange={(event) => toggle(user, event.target.checked)}
                        data-select-account={user.accountId}
                      >
                        Select {user.email}
                      </Checkbox>
                    ) : null}
                  </td>
                  <td>
                    <Primary>{user.displayName}</Primary>
                    <Sub>{user.email}</Sub>
                  </td>
                  <td>
                    <StatusTag status={user.role === "admin" ? "accent" : "neutral"}>{user.role}</StatusTag>
                  </td>
                  <td>
                    {user.status === "active" ? (
                      <StatusTag status="ok">active</StatusTag>
                    ) : (
                      <StatusTag status="danger">suspended</StatusTag>
                    )}
                  </td>
                  <td>
                    {user.emailVerified ? (
                      <StatusTag status="ok">verified</StatusTag>
                    ) : (
                      <StatusTag status="warn">unverified</StatusTag>
                    )}
                  </td>
                  <td className={cell.nowrap}>
                    <Mono tone="dim">{formatDateTime(user.createdAtUtc)}</Mono>
                  </td>
                  <td className={cell.actions}>
                    <div className={styles.actions}>
                      {!user.emailVerified ? (
                        <Button
                          size="sm"
                          color="neutral"
                          border
                          lines="none"
                          icon={tick02}
                          iconPosition="left"
                          disabled={busy || loading}
                          onClick={() => {
                            setNotice(null);
                            setError(null);
                            setVerificationError(null);
                            setVerification(user);
                          }}
                        >
                          Verify e-mail
                        </Button>
                      ) : null}
                      {user.accountId !== session?.accountId ? (
                        user.role === "admin" ? (
                          <Button
                            size="sm"
                            color="neutral"
                            border
                            lines="none"
                            icon={userRemove01}
                            iconPosition="left"
                            disabled={busy || loading}
                            data-role-action="demote"
                            onClick={() => startRoleChange(user, "user")}
                          >
                            Remove admin
                          </Button>
                        ) : user.status === "active" && user.emailVerified ? (
                          <Button
                            size="sm"
                            color="neutral"
                            border
                            lines="none"
                            icon={shield01}
                            iconPosition="left"
                            disabled={busy || loading}
                            data-role-action="promote"
                            onClick={() => startRoleChange(user, "admin")}
                          >
                            Make admin
                          </Button>
                        ) : null
                      ) : null}
                      {user.status === "active" ? (
                        <ArmButton
                          label="Suspend"
                          confirmLabel="Confirm suspend?"
                          disabled={busy}
                          onConfirm={() => setStatus(user.accountId, "suspend")}
                        />
                      ) : (
                        <Button
                          size="sm"
                          color="neutral"
                          border
                          lines="none"
                          disabled={busy}
                          onClick={() => setStatus(user.accountId, "reinstate")}
                        >
                          Reinstate
                        </Button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </AdminTable>
        ) : null}
        {data && data.total > 0 ? (
          <Pager
            summary={`${firstShown}–${lastShown} of ${data.total} account${data.total === 1 ? "" : "s"} · page ${data.page} of ${pages}`}
            previous={{ disabled: loading || page <= 1, onClick: () => setPage(page - 1) }}
            next={{ disabled: loading || page >= pages, onClick: () => setPage(page + 1) }}
          />
        ) : null}
      </AdminPanel>

      <GuardedDialog
        ref={dialog}
        size="sm"
        eyebrow="Manual verification"
        title="Verify this e-mail manually?"
        locked={() => mutationInFlight.current}
        focusFooter
        onClose={() => setVerification(null)}
        footer={
          <>
            <Button size="sm" color="neutral" border lines="none" disabled={busy} onClick={() => setVerification(null)}>
              Cancel
            </Button>
            <Button size="sm" color="red" lines="none" icon={tick02} iconPosition="left" disabled={busy || !token} busy={busy} onClick={verifyEmail}>
              Confirm verification
            </Button>
          </>
        }
      >
        <div className={styles.dialogBody}>
          <div className={styles.target}>
            <span className={styles.targetIcon} aria-hidden="true">
              <Icon glyph={mail01} />
            </span>
            <span>
              <Primary>{verification?.displayName}</Primary>
              <Sub>{verification?.email}</Sub>
            </span>
          </div>
          <p className={styles.explain}>
            Only continue after confirming this address belongs to the account owner.
            This replaces the e-mail link verification and is recorded in the audit log.
            It does not grant alpha access, change the role or lift a suspension.
          </p>
          <ErrorStrip message={verificationError} />
          {busy ? <Loader label="Verifying…" /> : null}
        </div>
      </GuardedDialog>

      <GuardedDialog
        ref={bulkDialog}
        size="sm"
        eyebrow="Bulk verification"
        title={`Verify ${chosen.length} e-mail${chosen.length === 1 ? "" : "s"} manually?`}
        locked={() => mutationInFlight.current}
        focusFooter
        onClose={() => setBulkOpen(false)}
        footer={
          <>
            <Button size="sm" color="neutral" border lines="none" disabled={busy} onClick={() => setBulkOpen(false)}>
              Cancel
            </Button>
            <Button
              size="sm"
              color="red"
              lines="none"
              icon={tick02}
              iconPosition="left"
              disabled={busy || !token || chosen.length === 0}
              busy={busy}
              data-bulk-confirm=""
              onClick={verifySelected}
            >
              {`Verify ${chosen.length} e-mail${chosen.length === 1 ? "" : "s"}`}
            </Button>
          </>
        }
      >
        <div className={styles.dialogBody}>
          <ul className={styles.bulkList}>
            {chosen.slice(0, 8).map((user) => (
              <li key={user.accountId}>
                <Primary>{user.displayName}</Primary>
                <Sub>{user.email}</Sub>
              </li>
            ))}
          </ul>
          {chosen.length > 8 ? <Sub>and {chosen.length - 8} more</Sub> : null}
          <p className={styles.explain}>
            Only continue after confirming these addresses belong to their account owners.
            Each account is verified and recorded in the audit log on its own; an address that changed
            since the list was loaded is skipped and reported. It does not grant alpha access, change roles
            or lift suspensions.
          </p>
          <ErrorStrip message={bulkError} />
          {busy ? <Loader label="Verifying…" /> : null}
        </div>
      </GuardedDialog>

      <GuardedDialog
        ref={roleDialog}
        size="sm"
        eyebrow={roleChange?.role === "admin" ? "Grant administrator" : "Remove administrator"}
        title={roleChange?.role === "admin" ? "Make this account an administrator?" : "Remove administrator access?"}
        locked={() => mutationInFlight.current}
        onClose={() => {
          setRolePassword("");
          setRoleChange(null);
        }}
        footer={
          <>
            <Button size="sm" color="neutral" border lines="none" disabled={busy} onClick={() => setRoleChange(null)}>
              Cancel
            </Button>
            <Button
              size="sm"
              color="red"
              lines="none"
              icon={roleChange?.role === "admin" ? shield01 : userRemove01}
              iconPosition="left"
              disabled={busy || !token || !rolePassword}
              busy={busy}
              data-role-confirm=""
              onClick={changeRole}
            >
              {roleChange?.role === "admin" ? "Make admin" : "Remove admin"}
            </Button>
          </>
        }
      >
        <form
          className={styles.dialogBody}
          onSubmit={(event) => {
            event.preventDefault();
            void changeRole();
          }}
        >
          <div className={styles.target}>
            <span className={styles.targetIcon} aria-hidden="true">
              <Icon glyph={roleChange?.role === "admin" ? shield01 : userRemove01} />
            </span>
            <span>
              <Primary>{roleChange?.user.displayName}</Primary>
              <Sub>{roleChange?.user.email}</Sub>
            </span>
          </div>
          <p className={styles.explain}>
            {roleChange?.role === "admin"
              ? "An administrator can moderate accounts, revoke licenses, publish builds and change roles. Only grant it to someone you trust with the whole platform."
              : "The account keeps its data, licenses and alpha access; it loses the admin console on its next request."}
            {" "}Confirm with your own password. The change is recorded in the audit log.
          </p>
          <Field label="Your password">
            <Input
              type="password"
              autoComplete="current-password"
              value={rolePassword}
              onChange={(event) => setRolePassword(event.target.value)}
              disabled={busy}
              data-role-password=""
            />
          </Field>
          <ErrorStrip message={roleError} />
          {busy ? <Loader label="Saving…" /> : null}
        </form>
      </GuardedDialog>
    </>
  );
}
