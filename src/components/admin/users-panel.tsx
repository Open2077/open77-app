"use client";

import { useCallback, useEffect, useState } from "react";

import { ArmButton } from "@/components/admin/arm-button";
import { formatDateTime } from "@/components/admin/format";
import { ErrorStrip, useAdminData } from "@/components/admin/use-admin-data";
import { PeopleIcon, SearchIcon } from "@/components/icons";
import { MasterApiError } from "@/lib/account/api";
import * as admin from "@/lib/account/admin-api";

/** Account search with suspend/reinstate — the moderation entry point. */
export function UsersPanel() {
  const [input, setInput] = useState("");
  const [query, setQuery] = useState("");
  const [busy, setBusy] = useState(false);

  // Debounced search: the query state the loader depends on trails the input.
  useEffect(() => {
    const timer = setTimeout(() => setQuery(input.trim()), 350);
    return () => clearTimeout(timer);
  }, [input]);

  const load = useCallback((token: string) => admin.users(token, query), [query]);
  const { token, data, setData, error, setError, loading } = useAdminData(load);

  async function setStatus(accountId: string, action: "suspend" | "reinstate") {
    if (!token) return;
    setBusy(true);
    setError(null);
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
                      <span className="adm-chip adm-chip-dim">verified</span>
                    ) : (
                      <span className="adm-chip adm-chip-warn">unverified</span>
                    )}
                  </td>
                  <td className="adm-mono adm-faint">{formatDateTime(user.createdAtUtc)}</td>
                  <td className="adm-actions-cell">
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
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}
      <p className="adm-footnote">
        Suspension blocks sign-in and invalidates active sessions on their next request; it does not
        touch the account&apos;s licenses — revoke those separately if needed.
      </p>
    </section>
  );
}
