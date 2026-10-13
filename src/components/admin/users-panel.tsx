"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { useAdminActivity } from "@/components/admin/admin-activity";
import {
  AdminPanel,
  AdminTable,
  Count,
  EmptyBlock,
  GuardedDialog,
  LoadingBlock,
  Mono,
  Primary,
  SearchBox,
  StatusTag,
  Sub,
  SuccessStrip,
  cell,
} from "@/components/admin/admin-kit";
import { ArmButton } from "@/components/admin/arm-button";
import { formatDateTime } from "@/components/admin/format";
import { ErrorStrip, useAdminData } from "@/components/admin/use-admin-data";
import { Button } from "@/components/admin/admin-button";
import type { DialogHandle } from "@/components/ui/dialog";
import { Loader } from "@/components/ui/feedback";
import { Icon } from "@/components/ui/icon";
import { mail01, tick02, users } from "@/components/ui/icons";
import { MasterApiError } from "@/lib/account/api";
import * as admin from "@/lib/account/admin-api";

import styles from "./users-panel.module.css";

/** Account search, moderation and explicit administrator-assisted e-mail verification. */
export function UsersPanel() {
  const [input, setInput] = useState("");
  const [query, setQuery] = useState("");
  const [busy, setBusy] = useState(false);
  const [verification, setVerification] = useState<admin.AdminUser | null>(null);
  const [verificationError, setVerificationError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const dialog = useRef<DialogHandle>(null);
  const mutationInFlight = useRef(false);
  const { begin } = useAdminActivity();

  useEffect(() => {
    if (verification) dialog.current?.open();
    else dialog.current?.close();
  }, [verification]);

  // Debounced search: the query state the loader depends on trails the input.
  useEffect(() => {
    const timer = setTimeout(() => setQuery(input.trim()), 350);
    return () => clearTimeout(timer);
  }, [input]);

  const load = useCallback((token: string) => admin.users(token, query), [query]);
  const { token, data, setData, error, setError, loading, reload } = useAdminData(load);

  async function verifyEmail() {
    if (!token || !verification || mutationInFlight.current) return;
    mutationInFlight.current = true;
    setBusy(true);
    setVerificationError(null);
    const finish = begin();
    try {
      const updated = await admin.verifyUserEmail(token, verification.accountId, verification.email);
      setData((current) => current?.map((user) => user.accountId === updated.accountId ? updated : user) ?? null);
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

  async function setStatus(accountId: string, action: "suspend" | "reinstate") {
    if (!token || mutationInFlight.current) return;
    mutationInFlight.current = true;
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      if (action === "suspend") await admin.suspendUser(token, accountId);
      else await admin.reinstateUser(token, accountId);
      setData(
        (current) =>
          current?.map((user) =>
            user.accountId === accountId
              ? { ...user, status: action === "suspend" ? "suspended" : "active" }
              : user,
          ) ?? null,
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

  return (
    <>
      <AdminPanel
        title="Users"
        icon={users}
        brackets
        meta={data ? <Count>{data.length} shown</Count> : undefined}
        actions={<SearchBox value={input} onChange={setInput} placeholder="Search e-mail or display name…" label="Search users" />}
        footnote={
          <>
            Manual e-mail verification is for delivery problems after checking the account owner&apos;s identity.
            {" "}
            Suspension blocks sign-in and invalidates active sessions on their next request; it does not
            touch the account&apos;s licenses. Revoke those separately if needed.
          </>
        }
      >
        <ErrorStrip message={error} />
        <SuccessStrip message={notice} />
        {loading && !data ? <LoadingBlock label="Loading users" /> : null}
        {data && data.length === 0 ? <EmptyBlock icon={users}>No account matches “{query}”.</EmptyBlock> : null}
        {data && data.length > 0 ? (
          <AdminTable caption="Accounts" minWidth="56rem">
            <thead>
              <tr>
                <th>Account</th>
                <th>Role</th>
                <th>Status</th>
                <th>E-mail</th>
                <th>Created</th>
                <th className={cell.actions}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {data.map((user) => (
                <tr key={user.accountId} className={user.status === "suspended" ? cell.muted : undefined}>
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
            It does not grant alpha access, change roles or lift a suspension.
          </p>
          <ErrorStrip message={verificationError} />
          {busy ? <Loader label="Verifying…" /> : null}
        </div>
      </GuardedDialog>
    </>
  );
}
