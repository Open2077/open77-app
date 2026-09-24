"use client";

import { useCallback, useEffect, useId, useRef, useState } from "react";

import { AdminSpinner, useAdminActivity } from "@/components/admin/admin-activity";
import { ArmButton } from "@/components/admin/arm-button";
import { formatDateTime } from "@/components/admin/format";
import { ErrorStrip, useAdminData } from "@/components/admin/use-admin-data";
import { CheckIcon, PeopleIcon, SearchIcon } from "@/components/icons";
import { MasterApiError } from "@/lib/account/api";
import * as admin from "@/lib/account/admin-api";

/** Account search, moderation and explicit administrator-assisted e-mail verification. */
export function UsersPanel() {
  const [input, setInput] = useState("");
  const [query, setQuery] = useState("");
  const [busy, setBusy] = useState(false);
  const [verification, setVerification] = useState<admin.AdminUser | null>(null);
  const [verificationError, setVerificationError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const dialog = useRef<HTMLDialogElement>(null);
  const cancelButton = useRef<HTMLButtonElement>(null);
  const mutationInFlight = useRef(false);
  const dialogTitle = useId();
  const dialogDescription = useId();
  const { begin } = useAdminActivity();

  useEffect(() => {
    if (verification) {
      dialog.current?.showModal();
      cancelButton.current?.focus();
    } else {
      dialog.current?.close();
    }
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
    <section className="adm-panel">
      <div className="adm-panel-head">
        <h2 className="adm-panel-title">
          <PeopleIcon size={17} />
          Users
        </h2>
        <div className="adm-search">
          <SearchIcon size={13} />
          <input
            value={input}
            onChange={(event) => setInput(event.target.value)}
            placeholder="Search e-mail or display name…"
            aria-label="Search users"
            spellCheck={false}
          />
        </div>
      </div>
      <ErrorStrip message={error} />
      {notice ? <p className="ac-success" role="status"><CheckIcon size={14} />{notice}</p> : null}
      {loading && !data ? <p className="ac-loading">Loading users…</p> : null}
      {data && data.length === 0 ? (
        <p className="adm-empty">No account matches “{query}”.</p>
      ) : null}
      {data && data.length > 0 ? (
        <div className="adm-tablewrap">
          <table className="adm-table">
            <thead>
              <tr>
                <th>Account</th>
                <th>Role</th>
                <th>Status</th>
                <th>E-mail</th>
                <th>Created</th>
                <th className="adm-actions-cell">Actions</th>
              </tr>
            </thead>
            <tbody>
              {data.map((user) => (
                <tr key={user.accountId} className={user.status === "suspended" ? "is-muted" : ""}>
                  <td>
                    <div>{user.displayName}</div>
                    <div className="adm-mono adm-faint">{user.email}</div>
                  </td>
                  <td>
                    <span className={`adm-chip ${user.role === "admin" ? "adm-chip-role" : "adm-chip-dim"}`}>
                      {user.role}
                    </span>
                  </td>
                  <td>
                    {user.status === "active" ? (
                      <span className="adm-chip adm-chip-ok">active</span>
                    ) : (
                      <span className="adm-chip adm-chip-warn">suspended</span>
                    )}
                  </td>
                  <td>
                    {user.emailVerified ? (
                      <span className="adm-chip adm-chip-ok">verified</span>
                    ) : (
                      <span className="adm-chip adm-chip-warn">unverified</span>
                    )}
                  </td>
                  <td className="adm-mono adm-faint">{formatDateTime(user.createdAtUtc)}</td>
                  <td className="adm-actions-cell">
                    <div className="adm-user-actions">
                      {!user.emailVerified ? (
                        <button
                          type="button"
                          className="ac-iconbtn adm-primary"
                          disabled={busy || loading}
                        onClick={() => {
                          setNotice(null);
                          setError(null);
                          setVerificationError(null);
                            setVerification(user);
                          }}
                        >
                          <CheckIcon size={13} /> Verify e-mail
                        </button>
                      ) : null}
                      {user.status === "active" ? (
                        <ArmButton
                          label="Suspend"
                          confirmLabel="Confirm suspend?"
                          disabled={busy}
                          onConfirm={() => setStatus(user.accountId, "suspend")}
                        />
                      ) : (
                        <button
                          className="ac-iconbtn"
                          type="button"
                          disabled={busy}
                          onClick={() => setStatus(user.accountId, "reinstate")}
                        >
                          Reinstate
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}
      <dialog
        ref={dialog}
        className="adm-email-dialog"
        aria-labelledby={dialogTitle}
        aria-describedby={dialogDescription}
        onCancel={(event) => {
          if (mutationInFlight.current) event.preventDefault();
          else setVerification(null);
        }}
        onClose={() => setVerification(null)}
      >
        <h2 id={dialogTitle}>Verify this e-mail manually?</h2>
        <p className="adm-email-target"><strong>{verification?.displayName}</strong><br />{verification?.email}</p>
        <p id={dialogDescription}>
          Only continue after confirming this address belongs to the account owner.
          This replaces the e-mail link verification and is recorded in the audit log.
          It does not grant alpha access, change roles or lift a suspension.
        </p>
        <ErrorStrip message={verificationError} />
        <div className="adm-user-actions">
          <button ref={cancelButton} type="button" className="ac-iconbtn" disabled={busy} onClick={() => setVerification(null)}>Cancel</button>
          <button type="button" className="ac-iconbtn adm-primary" disabled={busy || !token} onClick={verifyEmail}>
            {busy ? <AdminSpinner label="Verifying…" /> : "Confirm verification"}
          </button>
        </div>
      </dialog>
      <p className="adm-footnote">
        Manual e-mail verification is for delivery problems after checking the account owner&apos;s identity.
        {" "}
        Suspension blocks sign-in and invalidates active sessions on their next request; it does not
        touch the account&apos;s licenses — revoke those separately if needed.
      </p>
    </section>
  );
}
