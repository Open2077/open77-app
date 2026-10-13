"use client";

import { useCallback, useState } from "react";

import { AdminPanel, AdminTable, Count, EmptyBlock, LoadingBlock, Mono, cell } from "@/components/admin/admin-kit";
import { formatDateTime, shortId } from "@/components/admin/format";
import { ErrorStrip, useAdminData } from "@/components/admin/use-admin-data";
import { Button } from "@/components/admin/admin-button";
import { activity01, arrowDown01 } from "@/components/ui/icons";
import { MasterApiError } from "@/lib/account/api";
import * as admin from "@/lib/account/admin-api";

import styles from "./audit-panel.module.css";

const PAGE_SIZE = 30;

/** The audit log, newest first, paging older entries through beforeId. */
export function AuditPanel() {
  const [busy, setBusy] = useState(false);
  const [exhausted, setExhausted] = useState(false);

  const load = useCallback(async (token: string) => {
    const page = await admin.audit(token, { limit: PAGE_SIZE });
    setExhausted(page.length < PAGE_SIZE);
    return page;
  }, []);
  const { token, data, setData, error, setError, loading } = useAdminData(load);

  async function loadOlder() {
    if (!token || !data || data.length === 0) return;
    setBusy(true);
    setError(null);
    try {
      const oldest = data[data.length - 1]!.id;
      const page = await admin.audit(token, { limit: PAGE_SIZE, beforeId: oldest });
      if (page.length < PAGE_SIZE) setExhausted(true);
      setData([...data, ...page]);
    } catch (err) {
      setError(err instanceof MasterApiError ? err.message : "Request failed. Try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <AdminPanel
      title="Audit log"
      icon={activity01}
      brackets
      meta={data ? <Count>{data.length} loaded</Count> : undefined}
      footnote="Newest first; older entries load 30 at a time."
    >
      <ErrorStrip message={error} />
      {loading && !data ? <LoadingBlock label="Loading audit log" rows={6} /> : null}
      {data && data.length === 0 ? <EmptyBlock icon={activity01}>The audit log is empty.</EmptyBlock> : null}
      {data && data.length > 0 ? (
        <AdminTable caption="Audit log, newest first" minWidth="64rem">
          <thead>
            <tr>
              <th className={cell.num}>#</th>
              <th>Time</th>
              <th>Action</th>
              <th>Subject</th>
              <th>Actor</th>
              <th>Details</th>
            </tr>
          </thead>
          <tbody>
            {data.map((entry) => (
              <tr key={entry.id}>
                <td className={cell.num}>
                  <Mono tone="dim">{entry.id}</Mono>
                </td>
                <td className={cell.nowrap}>
                  <Mono tone="dim">{formatDateTime(entry.atUtc)}</Mono>
                </td>
                <td className={cell.nowrap}>
                  <Mono className={styles.action}>{entry.action}</Mono>
                </td>
                <td className={styles.subject}>
                  <Mono tone="dim">{entry.subject ?? "—"}</Mono>
                </td>
                <td className={cell.nowrap}>
                  <Mono tone="dim" title={entry.actorAccountId ?? undefined}>
                    {entry.actorAccountId ? shortId(entry.actorAccountId) : "system"}
                  </Mono>
                </td>
                <td className={styles.details}>
                  {entry.detailsJson ? <code title={entry.detailsJson}>{entry.detailsJson}</code> : null}
                </td>
              </tr>
            ))}
          </tbody>
        </AdminTable>
      ) : null}
      {data && data.length > 0 && !exhausted ? (
        <div className={styles.more}>
          <Button size="sm" color="neutral" border lines="none" icon={arrowDown01} iconPosition="left" busy={busy} onClick={loadOlder}>
            {busy ? "Loading…" : "Load older"}
          </Button>
        </div>
      ) : null}
    </AdminPanel>
  );
}
