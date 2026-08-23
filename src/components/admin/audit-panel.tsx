"use client";

import { useCallback, useState } from "react";

import { formatDateTime, shortId } from "@/components/admin/format";
import { ErrorStrip, useAdminData } from "@/components/admin/use-admin-data";
import { CodeIcon } from "@/components/icons";
import { MasterApiError } from "@/lib/account/api";
import * as admin from "@/lib/account/admin-api";

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
    <section className="adm-panel">
      <div className="adm-panel-head">
        <h2 className="adm-panel-title">
          <CodeIcon size={15} />
          Audit log
        </h2>
        {data ? <span className="adm-count">{data.length} loaded</span> : null}
      </div>
      <ErrorStrip message={error} />
      {loading && !data ? <p className="ac-loading">Loading audit log…</p> : null}
      {data && data.length === 0 ? <p className="adm-empty">The audit log is empty.</p> : null}
      {data && data.length > 0 ? (
        <>
          <div className="adm-tablewrap">
            <table className="adm-table">
              <thead>
                <tr>
                  <th className="adm-num">#</th>
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
                    <td className="adm-num adm-mono adm-faint">{entry.id}</td>
                    <td className="adm-mono adm-faint">{formatDateTime(entry.atUtc)}</td>
                    <td className="adm-mono">{entry.action}</td>
                    <td className="adm-mono adm-dim">{entry.subject ?? "—"}</td>
                    <td className="adm-mono adm-faint">
                      {entry.actorAccountId ? shortId(entry.actorAccountId) : "system"}
                    </td>
                    <td className="adm-mono adm-faint">{entry.detailsJson ?? ""}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {!exhausted ? (
            <div className="adm-more">
              <button className="ac-iconbtn" type="button" onClick={loadOlder} disabled={busy}>
                {busy ? "Loading…" : "Load older"}
              </button>
            </div>
          ) : null}
        </>
      ) : null}
    </section>
  );
}
