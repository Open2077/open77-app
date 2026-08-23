"use client";

import { useCallback, useEffect, useState } from "react";

import { ArmButton } from "@/components/admin/arm-button";
import { formatDateTime } from "@/components/admin/format";
import { ErrorStrip, useAdminData } from "@/components/admin/use-admin-data";
import { CheckIcon, KeyIcon, SearchIcon } from "@/components/icons";
import { MasterApiError } from "@/lib/account/api";
import * as admin from "@/lib/account/admin-api";

/** License search with platform-side revocation — the kill switch for a server. */
export function LicensesPanel() {
  const [input, setInput] = useState("");
  const [query, setQuery] = useState("");
  const [busy, setBusy] = useState(false);
  const [lastRevoke, setLastRevoke] = useState<{ label: string; serversRevoked: number } | null>(
    null,
  );

  useEffect(() => {
    const timer = setTimeout(() => setQuery(input.trim()), 350);
    return () => clearTimeout(timer);
  }, [input]);

  const load = useCallback((token: string) => admin.licenses(token, query), [query]);
  const { token, data, setData, error, setError, loading } = useAdminData(load);

  async function revoke(licenseId: string, label: string) {
    if (!token) return;
    setBusy(true);
    setError(null);
    try {
      const result = await admin.revokeLicense(token, licenseId);
      setLastRevoke({ label, serversRevoked: result.serversRevoked });
      const now = new Date().toISOString();
      setData(
        (current) =>
          current?.map((license) =>
            license.licenseId === licenseId ? { ...license, revokedAtUtc: now } : license,
          ) ?? null,
      );
    } catch (err) {
      setError(err instanceof MasterApiError ? err.message : "Request failed. Try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="adm-panel">
      <div className="adm-panel-head">
        <h2 className="adm-panel-title">
          <KeyIcon size={16} />
          Licenses
        </h2>
        <div className="adm-search">
          <SearchIcon size={13} />
          <input
            value={input}
            onChange={(event) => setInput(event.target.value)}
            placeholder="Search label or owner e-mail…"
            aria-label="Search licenses"
            spellCheck={false}
          />
        </div>
      </div>
      <ErrorStrip message={error} />
      {lastRevoke ? (
        <p className="ac-success" style={{ marginBottom: 12 }}>
          <CheckIcon size={14} />
          <span>
            Revoked “{lastRevoke.label}” — {lastRevoke.serversRevoked}{" "}
            {lastRevoke.serversRevoked === 1 ? "server" : "servers"} lost platform access.
          </span>
        </p>
      ) : null}
      {loading && !data ? <p className="ac-loading">Loading licenses…</p> : null}
      {data && data.length === 0 ? (
        <p className="adm-empty">No license matches “{query}”.</p>
      ) : null}
      {data && data.length > 0 ? (
        <div className="adm-tablewrap">
          <table className="adm-table">
            <thead>
              <tr>
                <th>Label</th>
                <th>Key</th>
                <th>Owner</th>
                <th>Created</th>
                <th>Status</th>
                <th className="adm-actions-cell">Actions</th>
              </tr>
            </thead>
            <tbody>
              {data.map((license) => (
                <tr key={license.licenseId} className={license.revokedAtUtc ? "is-muted" : ""}>
                  <td>{license.label}</td>
                  <td className="adm-mono adm-dim">op77_live_····{license.keyHint}</td>
                  <td className="adm-mono adm-dim">{license.ownerEmail}</td>
                  <td className="adm-mono adm-faint">{formatDateTime(license.createdAtUtc)}</td>
                  <td>
                    {license.revokedAtUtc ? (
                      <span className="adm-chip adm-chip-dim">revoked</span>
                    ) : (
                      <span className="adm-chip adm-chip-ok">active</span>
                    )}
                  </td>
                  <td className="adm-actions-cell">
                    {license.revokedAtUtc ? null : (
                      <ArmButton
                        label="Revoke"
                        confirmLabel="Confirm — servers lose access now?"
                        disabled={busy}
                        onConfirm={() => revoke(license.licenseId, license.label)}
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
        Revocation cascades: every server credential enrolled on the license loses bearer
        authentication immediately and drops off the platform on its next request.
      </p>
    </section>
  );
}
