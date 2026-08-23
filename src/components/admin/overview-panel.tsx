"use client";

import Link from "next/link";
import { useCallback } from "react";

import { formatDateTime, shortId } from "@/components/admin/format";
import { ErrorStrip, useAdminData } from "@/components/admin/use-admin-data";
import { CodeIcon } from "@/components/icons";
import * as admin from "@/lib/account/admin-api";

const TILES = [
  ["usersTotal", "Accounts"],
  ["serversActive", "Servers online"],
  ["playersOnline", "Players online"],
  ["licensesActive", "Active licenses"],
  ["bansActive", "Active bans"],
] as const;

/** The dashboard: five platform metrics plus the freshest audit entries. */
export function OverviewPanel() {
  const load = useCallback(
    (token: string) =>
      Promise.all([admin.overview(token), admin.audit(token, { limit: 8 })] as const),
    [],
  );
  const { data, error, loading } = useAdminData(load);
  const [metrics, latest] = data ?? [null, null];

  return (
    <>
      <ErrorStrip message={error} />
      {loading && !data ? <p className="ac-loading">Loading overview…</p> : null}

      {metrics ? (
        <div className="adm-stats">
          {TILES.map(([key, label]) => (
            <div className="adm-stat" key={key}>
              <div className="adm-stat-value">{metrics[key]}</div>
              <div className="adm-stat-label">{label}</div>
            </div>
          ))}
        </div>
      ) : null}

      {latest ? (
        <section className="adm-panel">
          <div className="adm-panel-head">
            <h2 className="adm-panel-title">
              <CodeIcon size={15} />
              Latest activity
            </h2>
            <Link className="ac-iconbtn" href="/admin/audit">
              Full audit log
            </Link>
          </div>
          {latest.length === 0 ? (
            <p className="adm-empty">The audit log is empty.</p>
          ) : (
            <div className="adm-tablewrap">
              <table className="adm-table">
                <thead>
                  <tr>
                    <th>Time</th>
                    <th>Action</th>
                    <th>Subject</th>
                    <th>Actor</th>
                  </tr>
                </thead>
                <tbody>
                  {latest.map((entry) => (
                    <tr key={entry.id}>
                      <td className="adm-mono adm-faint">{formatDateTime(entry.atUtc)}</td>
                      <td className="adm-mono">{entry.action}</td>
                      <td className="adm-mono adm-dim">{entry.subject ?? "—"}</td>
                      <td className="adm-mono adm-faint">
                        {entry.actorAccountId ? shortId(entry.actorAccountId) : "system"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      ) : null}
    </>
  );
}
