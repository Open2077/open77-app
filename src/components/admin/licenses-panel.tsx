"use client";

import { useCallback, useEffect, useState } from "react";

import {
  AdminPanel,
  AdminTable,
  Count,
  EmptyBlock,
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
import { formatDateTime, shortId } from "@/components/admin/format";
import { ErrorStrip, useAdminData } from "@/components/admin/use-admin-data";
import { key01 } from "@/components/ui/icons";
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
    <AdminPanel
      title="Licenses"
      icon={key01}
      brackets
      meta={data ? <Count>{data.length} shown</Count> : undefined}
      actions={<SearchBox value={input} onChange={setInput} placeholder="Search label or owner e-mail…" label="Search licenses" />}
      footnote={
        <>
          Revocation cascades: every server credential enrolled on the license loses bearer
          authentication immediately and drops off the platform on its next request.
        </>
      }
    >
      <ErrorStrip message={error} />
      <SuccessStrip
        message={
          lastRevoke
            ? `Revoked “${lastRevoke.label}”: ${lastRevoke.serversRevoked} ${lastRevoke.serversRevoked === 1 ? "server" : "servers"} lost platform access.`
            : null
        }
      />
      {loading && !data ? <LoadingBlock label="Loading licenses" /> : null}
      {data && data.length === 0 ? <EmptyBlock icon={key01}>No license matches “{query}”.</EmptyBlock> : null}
      {data && data.length > 0 ? (
        <AdminTable caption="Server licenses" minWidth="56rem">
          <thead>
            <tr>
              <th>Label</th>
              <th>Key</th>
              <th>Owner</th>
              <th>Created</th>
              <th>Status</th>
              <th className={cell.actions}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {data.map((license) => (
              <tr key={license.licenseId} className={license.revokedAtUtc ? cell.muted : undefined}>
                <td className={cell.wrap}>
                  <Primary>{license.label}</Primary>
                  <Sub title={license.licenseId}>{shortId(license.licenseId)}</Sub>
                </td>
                <td className={cell.nowrap}>
                  <Mono tone="dim">op77_live_····{license.keyHint}</Mono>
                </td>
                <td>
                  <Mono tone="dim">{license.ownerEmail}</Mono>
                </td>
                <td className={cell.nowrap}>
                  <Mono tone="dim">{formatDateTime(license.createdAtUtc)}</Mono>
                </td>
                <td>
                  {license.revokedAtUtc ? (
                    <StatusTag status="neutral" title={`Revoked ${formatDateTime(license.revokedAtUtc)}`}>revoked</StatusTag>
                  ) : (
                    <StatusTag status="ok">active</StatusTag>
                  )}
                </td>
                <td className={cell.actions}>
                  {license.revokedAtUtc ? null : (
                    <ArmButton
                      label="Revoke"
                      confirmLabel="Confirm: servers lose access now?"
                      disabled={busy}
                      onConfirm={() => revoke(license.licenseId, license.label)}
                    />
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </AdminTable>
      ) : null}
    </AdminPanel>
  );
}
