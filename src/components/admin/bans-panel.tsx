"use client";

import { type FormEvent, useCallback, useState } from "react";

import { ArmButton } from "@/components/admin/arm-button";
import { formatDateTime } from "@/components/admin/format";
import { ErrorStrip, useAdminData } from "@/components/admin/use-admin-data";
import { ShieldIcon } from "@/components/icons";
import { MasterApiError } from "@/lib/account/api";
import * as admin from "@/lib/account/admin-api";
import type { BanScope, BanSubjectKind } from "@/lib/account/admin-api";

const SUBJECT_KINDS: { value: BanSubjectKind; label: string; placeholder: string }[] = [
  { value: "account", label: "Account", placeholder: "Account ID (GUID)" },
  { value: "identity", label: "Game identity", placeholder: "Identity GUID" },
  { value: "identity_key", label: "Identity key", placeholder: "Public-key hash (hex)" },
  { value: "license", label: "License", placeholder: "License ID (GUID)" },
];

/** Central bans: enforced at ticket issuance, so a ban lands on the next join. */
export function BansPanel() {
  const [includeLifted, setIncludeLifted] = useState(false);
  const [busy, setBusy] = useState(false);
  const [formOpen, setFormOpen] = useState(false);
  const [scope, setScope] = useState<BanScope>("global");
  const [serverId, setServerId] = useState("");
  const [subjectKind, setSubjectKind] = useState<BanSubjectKind>("account");
  const [subjectValue, setSubjectValue] = useState("");
  const [reason, setReason] = useState("");
  const [expires, setExpires] = useState("");

  const load = useCallback(
    (token: string) => admin.bans(token, { includeLifted }),
    [includeLifted],
  );
  const { token, data, error, setError, loading, reload } = useAdminData(load);

  async function onCreate(event: FormEvent) {
    event.preventDefault();
    if (!token) return;
    setBusy(true);
    setError(null);
    try {
      await admin.createBan(token, {
        scope,
        ...(scope === "server" ? { serverId: serverId.trim() } : {}),
        subjectKind,
        subjectValue: subjectValue.trim(),
        reason: reason.trim(),
        ...(expires ? { expiresAtUtc: new Date(expires).toISOString() } : {}),
      });
      setFormOpen(false);
      setSubjectValue("");
      setReason("");
      setExpires("");
      reload();
    } catch (err) {
      setError(err instanceof MasterApiError ? err.message : "Request failed. Try again.");
    } finally {
      setBusy(false);
    }
  }

  async function lift(banId: string) {
    if (!token) return;
    setBusy(true);
    setError(null);
    try {
      await admin.liftBan(token, banId);
      reload();
    } catch (err) {
      setError(err instanceof MasterApiError ? err.message : "Request failed. Try again.");
    } finally {
      setBusy(false);
    }
  }

  const kindMeta = SUBJECT_KINDS.find((kind) => kind.value === subjectKind)!;

  return (
    <section className="adm-panel">
      <div className="adm-panel-head">
        <h2 className="adm-panel-title">
          <ShieldIcon size={17} />
          Bans
        </h2>
        <div className="adm-panel-head" style={{ margin: 0 }}>
          <button
            className={`ac-iconbtn${includeLifted ? " is-copied" : ""}`}
            type="button"
            aria-pressed={includeLifted}
            onClick={() => setIncludeLifted((value) => !value)}
          >
            {includeLifted ? "Hiding nothing" : "Show lifted"}
          </button>
          {!formOpen ? (
            <button className="btn btn-small btn-primary" type="button" onClick={() => setFormOpen(true)}>
              New ban
            </button>
          ) : null}
        </div>
      </div>
      <ErrorStrip message={error} />

      {formOpen ? (
        <form className="adm-form" onSubmit={onCreate}>
          <label className="ac-label">
            Scope
            <select
              className="adm-select"
              value={scope}
              onChange={(event) => setScope(event.target.value as BanScope)}
            >
              <option value="global">Global — whole platform</option>
              <option value="server">Single server</option>
            </select>
          </label>
          {scope === "server" ? (
            <label className="ac-label">
              Server ID
              <input
                className="ac-input"
                value={serverId}
                onChange={(event) => setServerId(event.target.value)}
                placeholder="Server GUID"
                spellCheck={false}
                required
              />
            </label>
          ) : null}
          <label className="ac-label">
            Subject kind
            <select
              className="adm-select"
              value={subjectKind}
              onChange={(event) => setSubjectKind(event.target.value as BanSubjectKind)}
            >
              {SUBJECT_KINDS.map((kind) => (
                <option key={kind.value} value={kind.value}>
                  {kind.label}
                </option>
              ))}
            </select>
          </label>
          <label className="ac-label">
            Subject
            <input
              className="ac-input"
              value={subjectValue}
              onChange={(event) => setSubjectValue(event.target.value)}
              placeholder={kindMeta.placeholder}
              spellCheck={false}
              required
            />
          </label>
          <label className="ac-label">
            Expires (optional)
            <input
              className="ac-input"
              type="datetime-local"
              value={expires}
              onChange={(event) => setExpires(event.target.value)}
            />
          </label>
          <label className="ac-label adm-form-span">
            Reason
            <input
              className="ac-input"
              value={reason}
              onChange={(event) => setReason(event.target.value)}
              placeholder="Shown to the banned player at ticket time"
              maxLength={512}
              required
            />
          </label>
          <div className="ac-form-actions adm-form-span" style={{ margin: 0 }}>
            <button
              className="btn btn-small btn-primary"
              type="submit"
              disabled={busy || subjectValue.trim().length === 0 || reason.trim().length === 0}
            >
              {busy ? "Working…" : "Issue ban"}
            </button>
            <button className="btn btn-small btn-ghost" type="button" onClick={() => setFormOpen(false)}>
              Cancel
            </button>
          </div>
        </form>
      ) : null}

      {loading && !data ? <p className="ac-loading">Loading bans…</p> : null}
      {data && data.length === 0 ? (
        <p className="adm-empty">
          {includeLifted ? "No ban has ever been issued." : "No active ban."}
        </p>
      ) : null}
      {data && data.length > 0 ? (
        <div className="adm-tablewrap">
          <table className="adm-table">
            <thead>
              <tr>
                <th>Scope</th>
                <th>Subject</th>
                <th>Reason</th>
                <th>Issued</th>
                <th>Expires</th>
                <th className="adm-actions-cell">Actions</th>
              </tr>
            </thead>
            <tbody>
              {data.map((ban) => (
                <tr key={ban.banId} className={ban.liftedAtUtc ? "is-muted" : ""}>
                  <td>
                    <span className={`adm-chip ${ban.scope === "global" ? "adm-chip-warn" : "adm-chip-dim"}`}>
                      {ban.scope}
                    </span>
                  </td>
                  <td>
                    <div className="adm-mono adm-dim">{ban.subjectKind}</div>
                    <div className="adm-mono adm-faint">{ban.subjectValue}</div>
                  </td>
                  <td className="adm-dim">{ban.reason}</td>
                  <td className="adm-mono adm-faint">{formatDateTime(ban.issuedAtUtc)}</td>
                  <td className="adm-mono adm-faint">
                    {ban.liftedAtUtc
                      ? `lifted ${formatDateTime(ban.liftedAtUtc)}`
                      : ban.expiresAtUtc
                        ? formatDateTime(ban.expiresAtUtc)
                        : "never"}
                  </td>
                  <td className="adm-actions-cell">
                    {ban.liftedAtUtc ? null : (
                      <ArmButton
                        label="Lift"
                        confirmLabel="Confirm lift?"
                        disabled={busy}
                        onConfirm={() => lift(ban.banId)}
                      />
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}
      <p className="adm-footnote">
        Bans are enforced when the master issues connect tickets: they take effect on the subject&apos;s
        next join, with the reason shown in their game client.
      </p>
    </section>
  );
}
