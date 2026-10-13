"use client";

import Link from "next/link";
import { useCallback } from "react";

import { AdminPanel, AdminTable, EmptyBlock, LoadingBlock, Mono, Primary, StatusTag, Sub, cell } from "@/components/admin/admin-kit";
import { formatDateTime, shortId } from "@/components/admin/format";
import { ErrorStrip, useAdminData } from "@/components/admin/use-admin-data";
import { Button } from "@/components/admin/admin-button";
import { Meter, Stat } from "@/components/ui/feedback";
import { Icon } from "@/components/ui/icon";
import { activity01, arrowRight01, bug01, packageBox, serverStack01, ticket01 } from "@/components/ui/icons";
import { Panel } from "@/components/ui/panel";
import * as admin from "@/lib/account/admin-api";
import { incidents } from "@/lib/account/incidents-api";

import styles from "./overview-panel.module.css";

const TILES = [
  ["usersTotal", "Accounts"],
  ["serversActive", "Servers online"],
  ["playersOnline", "Players online"],
  ["licensesActive", "Active licenses"],
  ["bansActive", "Active bans"],
] as const;

const QUICK = [
  { href: "/admin/incidents", glyph: bug01, title: "Investigate a crash", text: "Correlate reports and inspect evidence" },
  { href: "/admin/releases", glyph: packageBox, title: "Manage releases", text: "Channels, compatibility and trusted builds" },
  { href: "/admin/alpha-access", glyph: ticket01, title: "Manage Alpha access", text: "Find an account and review its permissions" },
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
      {loading && !data ? <LoadingBlock label="Loading overview" rows={3} /> : null}

      {metrics ? (
        <section className={styles.metrics} aria-label="Platform metrics">
          {TILES.map(([key, label]) => (
            <Stat key={key} value={metrics[key]} label={label} className={styles.metric} />
          ))}
        </section>
      ) : null}

      <nav className={styles.quick} aria-label="Frequent operations">
        {QUICK.map((item) => (
          <Panel key={item.href} as={Link} href={item.href} shape="slant" interactive padding="md" className={styles.quickCard}>
            <Icon glyph={item.glyph} className={styles.quickIcon} />
            <span className={styles.quickCopy}>
              <strong>{item.title}</strong>
              <span>{item.text}</span>
            </span>
            <Icon glyph={arrowRight01} className={styles.quickArrow} />
          </Panel>
        ))}
      </nav>

      {data ? (
        <div className={styles.split}>
          <AdminPanel
            title="Active worlds"
            icon={serverStack01}
            meta={servers ? `${servers.length} reporting` : undefined}
            actions={
              <Button href="/admin/servers" size="sm" color="neutral" border lines="none">
                All servers
              </Button>
            }
          >
            {servers?.length ? (
              <AdminTable caption="Active worlds, most players first" minWidth="30rem">
                <thead>
                  <tr>
                    <th>World</th>
                    <th>Players</th>
                    <th>Last heartbeat</th>
                  </tr>
                </thead>
                <tbody>
                  {[...servers]
                    .sort((a, b) => b.connectedPlayers - a.connectedPlayers)
                    .slice(0, 6)
                    .map((server) => (
                      <tr key={server.serverId}>
                        <td>
                          <Primary>{server.name}</Primary>
                          <Sub>{server.connectEndpoint}</Sub>
                        </td>
                        <td className={styles.players}>
                          <Mono>
                            {server.connectedPlayers} / {server.maximumPlayers}
                          </Mono>
                          <Meter
                            value={server.maximumPlayers ? (server.connectedPlayers / server.maximumPlayers) * 100 : 0}
                            label={`${server.connectedPlayers} of ${server.maximumPlayers} players`}
                          />
                        </td>
                        <td className={cell.nowrap}>
                          <Mono tone="dim">{formatDateTime(server.lastHeartbeatUtc)}</Mono>
                        </td>
                      </tr>
                    ))}
                </tbody>
              </AdminTable>
            ) : (
              <EmptyBlock icon={serverStack01}>No active servers are reporting a heartbeat.</EmptyBlock>
            )}
          </AdminPanel>

          <AdminPanel
            title="Recent reports"
            icon={bug01}
            actions={
              <Button href="/admin/incidents" size="sm" color="neutral" border lines="none">
                Open inbox
              </Button>
            }
            footnote="Private player evidence · receipt order, not a live crash counter."
          >
            {reports?.items.length ? (
              <AdminTable caption="Most recent crash reports" minWidth="26rem">
                <thead>
                  <tr>
                    <th>Incident</th>
                    <th>Received</th>
                  </tr>
                </thead>
                <tbody>
                  {reports.items.slice(0, 5).map((report) => (
                    <tr key={report.incidentId}>
                      <td>
                        <Link href={`/admin/incidents?incidentId=${report.incidentId}`} className={styles.incident}>
                          {shortId(report.incidentId)}
                        </Link>
                        <span className={styles.kind}>
                          <StatusTag status={report.kind === "engine-crash" ? "danger" : "neutral"}>{report.kind}</StatusTag>
                        </span>
                      </td>
                      <td className={cell.nowrap}>
                        <Mono tone="dim">{formatDateTime(report.receivedAtUtc)}</Mono>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </AdminTable>
            ) : (
              <EmptyBlock icon={bug01}>
                {reports ? "No diagnostic reports received yet." : "Incident receiver unavailable. Open the inbox for details."}
              </EmptyBlock>
            )}
          </AdminPanel>
        </div>
      ) : null}

      {latest ? (
        <AdminPanel
          title="Latest activity"
          icon={activity01}
          actions={
            <Button href="/admin/audit" size="sm" color="neutral" border lines="none">
              Full audit log
            </Button>
          }
        >
          {latest.length === 0 ? (
            <EmptyBlock icon={activity01}>The audit log is empty.</EmptyBlock>
          ) : (
            <AdminTable caption="Latest audit entries">
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
                    <td className={cell.nowrap}>
                      <Mono tone="dim">{formatDateTime(entry.atUtc)}</Mono>
                    </td>
                    <td>
                      <Mono className={styles.action}>{entry.action}</Mono>
                    </td>
                    <td>
                      <Mono tone="dim" className={styles.subject}>
                        {entry.subject ?? "—"}
                      </Mono>
                    </td>
                    <td className={cell.nowrap}>
                      <Mono tone="dim" title={entry.actorAccountId ?? undefined}>
                        {entry.actorAccountId ? shortId(entry.actorAccountId) : "system"}
                      </Mono>
                    </td>
                  </tr>
                ))}
              </tbody>
            </AdminTable>
          )}
        </AdminPanel>
      ) : null}
    </>
  );
}

