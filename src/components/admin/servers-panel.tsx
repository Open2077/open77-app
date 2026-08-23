"use client";

import { useCallback } from "react";

import { formatAge, shortId } from "@/components/admin/format";
import { ErrorStrip, useAdminData } from "@/components/admin/use-admin-data";
import { ServerRackIcon } from "@/components/icons";
import * as admin from "@/lib/account/admin-api";

/** Every server the master currently lists, with license and owner columns. */
export function ServersPanel() {
  const load = useCallback((token: string) => admin.servers(token), []);
  const { data, error, loading, reload } = useAdminData(load);

  return (
    <section className="adm-panel">
      <div className="adm-panel-head">
        <h2 className="adm-panel-title">
          <ServerRackIcon size={16} />
          Live servers
        </h2>
        <div className="adm-panel-head" style={{ margin: 0 }}>
          {data ? <span className="adm-count">{data.length} registered</span> : null}
          <button className="ac-iconbtn" type="button" onClick={reload} disabled={loading}>
            Refresh
          </button>
        </div>
      </div>
      <ErrorStrip message={error} />
      {loading && !data ? <p className="ac-loading">Loading servers…</p> : null}
      {data && data.length === 0 ? (
        <p className="adm-empty">No server is registered with the master right now.</p>
      ) : null}
      {data && data.length > 0 ? (
        <div className="adm-tablewrap">
          <table className="adm-table">
            <thead>
              <tr>
                <th>Server</th>
                <th>Endpoint</th>
                <th className="adm-num">Players</th>
                <th>Heartbeat</th>
                <th>License</th>
                <th>Owner</th>
              </tr>
            </thead>
            <tbody>
              {data.map((server) => (
                <tr key={server.serverId}>
                  <td>
                    <div>{server.name}</div>
                    <div className="adm-mono adm-faint">{shortId(server.serverId)}</div>
                  </td>
                  <td className="adm-mono adm-dim">{server.connectEndpoint}</td>
                  <td className="adm-num adm-mono">
                    {server.connectedPlayers}/{server.maximumPlayers}
                  </td>
                  <td className="adm-mono adm-dim">{formatAge(server.lastHeartbeatUtc)} ago</td>
                  <td>
                    {server.licenseLabel ? (
                      <span className="adm-chip adm-chip-ok">{server.licenseLabel}</span>
                    ) : (
                      <span className="adm-chip adm-chip-dim">unlicensed</span>
                    )}
                  </td>
                  <td className="adm-mono adm-dim">{server.ownerEmail ?? "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}
      <p className="adm-footnote">
        Unlicensed rows are pre-platform enrollments; they disappear once license-gated enrollment
        replaces the anonymous flow.
      </p>
    </section>
  );
}
