"use client";

import Link from "next/link";
import { useCallback } from "react";

import { formatDateTime, shortId } from "@/components/admin/format";
import { ErrorStrip, useAdminData } from "@/components/admin/use-admin-data";
import { CodeIcon, InfoIcon, ServerRackIcon, DownloadIcon } from "@/components/icons";
import * as admin from "@/lib/account/admin-api";
import { incidents } from "@/lib/account/incidents-api";

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
      Promise.all([admin.overview(token), admin.audit(token, { limit: 10 }), admin.servers(token), incidents(token).catch(() => null)] as const),
    [],
  );
  const { data, error, loading } = useAdminData(load);
  const [metrics, latest, servers, reports] = data ?? [null, null, null, null];

  return (
    <>
      <ErrorStrip message={error} />
      {loading && !data ? <p className="ac-loading">Loading overview…</p> : null}
      {loading && !data ? <div className="adm-skeleton-list" aria-hidden="true"><div /><div /><div /></div> : null}

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

      <div className="adm-quicklinks">
        <Link className="adm-quicklink" href="/admin/incidents"><InfoIcon size={22} /><div><strong>Investigate a crash</strong><span>Correlate reports and inspect evidence</span></div></Link>
        <Link className="adm-quicklink" href="/admin/releases"><DownloadIcon size={22} /><div><strong>Manage releases</strong><span>Channels, compatibility and trusted builds</span></div></Link>
        <Link className="adm-quicklink" href="/admin/alpha-access"><ServerRackIcon size={22} /><div><strong>Manage preview access</strong><span>Find an account and review its permissions</span></div></Link>
      </div>

      {data ? <div className="adm-overview-grid">
        <section className="adm-panel"><div className="adm-panel-head"><h2 className="adm-panel-title"><ServerRackIcon size={16} /> Active worlds</h2><Link href="/admin/servers" className="ac-iconbtn">All servers</Link></div>
          {servers?.length ? <div className="adm-tablewrap"><table className="adm-table"><thead><tr><th>World</th><th>Players</th><th>Last heartbeat</th></tr></thead><tbody>{[...servers].sort((a,b) => b.connectedPlayers - a.connectedPlayers).slice(0,6).map(server => <tr key={server.serverId}><td>{server.name}<span className="adm-cell-sub">{server.connectEndpoint}</span></td><td className="adm-mono">{server.connectedPlayers} / {server.maximumPlayers}</td><td className="adm-mono adm-faint">{formatDateTime(server.lastHeartbeatUtc)}</td></tr>)}</tbody></table></div> : <p className="adm-empty">No active servers are reporting a heartbeat.</p>}
        </section>
        <section className="adm-panel"><div className="adm-panel-head"><h2 className="adm-panel-title"><InfoIcon size={16} /> Recent reports</h2><Link href="/admin/incidents" className="ac-iconbtn">Open inbox</Link></div>
          {reports?.items.length ? <div className="adm-tablewrap"><table className="adm-table"><thead><tr><th>Incident</th><th>Received</th></tr></thead><tbody>{reports.items.slice(0,5).map(report => <tr key={report.incidentId}><td><Link href={`/admin/incidents?incidentId=${report.incidentId}`} className="adm-text-button adm-mono">{shortId(report.incidentId)}</Link><span className="adm-cell-sub">{report.kind}</span></td><td className="adm-mono adm-faint">{formatDateTime(report.receivedAtUtc)}</td></tr>)}</tbody></table></div> : <p className="adm-empty">{reports ? "No diagnostic reports received yet." : "Incident receiver unavailable. Open the inbox for details."}</p>}
          <p className="adm-footnote">Private player evidence · receipt order, not a live crash counter.</p>
        </section>
      </div> : null}

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
