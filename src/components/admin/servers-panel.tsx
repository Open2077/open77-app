"use client";

import { useCallback, useRef, useState } from "react";

import { useAdminActivity } from "@/components/admin/admin-activity";
import {
  AdminPanel,
  AdminTable,
  Count,
  EmptyBlock,
  Footnote,
  LoadingBlock,
  Mono,
  Primary,
  Stack,
  StatusTag,
  Sub,
  SuccessStrip,
  Toolbar,
  ToolbarGroup,
  cell,
} from "@/components/admin/admin-kit";
import { formatAge, shortId } from "@/components/admin/format";
import { ErrorStrip, useAdminData } from "@/components/admin/use-admin-data";
import { Button } from "@/components/admin/admin-button";
import { Meter } from "@/components/ui/feedback";
import { Checkbox, Field, Input, Select } from "@/components/ui/field";
import { Icon } from "@/components/ui/icon";
import { alert02, refresh, serverStack01 } from "@/components/ui/icons";
import { MasterApiError } from "@/lib/account/api";
import * as admin from "@/lib/account/admin-api";

import styles from "./servers-panel.module.css";

/** Master-owned labels are independent of owner-controlled metadata and heartbeats. */
export function ServersPanel() {
  const load = useCallback((token: string) => admin.servers(token), []);
  const { token, data, setData, error, loading, reload } = useAdminData(load);
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState("all");
  const [busy, setBusy] = useState(false);
  const inFlight = useRef(false);
  const [notice, setNotice] = useState("");
  const { begin } = useAdminActivity();

  async function save(server: admin.AdminServer, labels: admin.ServerDirectoryLabels) {
    if (!token || inFlight.current) throw new Error("Please wait for the current save.");
    inFlight.current = true;
    setBusy(true);
    setNotice("");
    const finish = begin();
    try {
      const updated = await admin.setServerDirectory(token, server.serverId, labels);
      setData(current => current?.map(row => row.serverId === server.serverId ? { ...row, ...updated } : row) ?? null);
      setNotice(updated.hidden
        ? `${server.name} is hidden from public lists. Direct connections remain available. Lists update on their next refresh.`
        : `Directory settings saved for ${server.name}. Lists update on their next refresh.`);
      finish(true);
    } catch (err) {
      finish(false);
      throw err;
    } finally {
      inFlight.current = false;
      setBusy(false);
    }
  }

  const shown = data?.filter(row =>
    (filter === "all" || (filter === "hidden" ? row.hidden : filter === "visible" ? !row.hidden : filter === "official" ? row.official : row.featured)) &&
    `${row.name} ${row.connectEndpoint} ${row.serverId} ${row.ownerEmail || ""}`.toLowerCase().includes(query.toLowerCase()));

  return (
    <AdminPanel
      title="Server directory"
      icon={serverStack01}
      brackets
      actions={
        <Button size="sm" color="neutral" border lines="none" icon={refresh} iconPosition="left" onClick={reload} busy={loading} disabled={busy}>
          Refresh
        </Button>
      }
      footnote="Active sessions, hidden servers and offline curated servers are listed. Unhiding an offline server does not bring it online. Settings are tied to the stable server ID, not an IP address, and never bypass security checks or local-address filtering."
    >
      <Footnote>
        Hide a server to remove it from public lists on the website and launcher, including Featured. It remains manageable
        here and accessible by direct connection: this is not a ban. Visibility and labels persist across restarts and are
        audited. Lower featured order appears first.
      </Footnote>
      <Toolbar className={styles.toolbar}>
        <ToolbarGroup className={styles.fields}>
          <Field label="Find a server" className={styles.find}>
            <Input type="search" value={query} onChange={e => setQuery(e.target.value)} placeholder="Name, address, owner or server ID" className={styles.compact} />
          </Field>
          <Field label="Show" className={styles.show}>
            <Select value={filter} onChange={e => setFilter(e.target.value)} compact>
              <option value="all">All servers</option>
              <option value="visible">Not hidden</option>
              <option value="hidden">Hidden</option>
              <option value="featured">Featured</option>
              <option value="official">Official</option>
            </Select>
          </Field>
        </ToolbarGroup>
        <Count>{shown?.length ?? 0} / {data?.length ?? 0} servers</Count>
      </Toolbar>
      <ErrorStrip message={error} />
      <SuccessStrip message={notice} />
      {loading && !data ? <LoadingBlock label="Loading servers" /> : null}
      {shown?.length === 0 ? <EmptyBlock icon={serverStack01}>No servers match this view.</EmptyBlock> : null}
      {shown && shown.length > 0 ? (
        <AdminTable caption="Server directory settings" minWidth="60rem">
          <thead>
            <tr>
              <th>Server / owner</th>
              <th>Players / heartbeat</th>
              <th>Public visibility</th>
              <th>Official / featured order</th>
              <th className={cell.actions}>Save settings</th>
            </tr>
          </thead>
          <tbody>
            {shown.map(server => (
              <ServerRow key={`${server.serverId}:${server.directoryRevision ?? 0}`} server={server} disabled={busy || loading} save={save} />
            ))}
          </tbody>
        </AdminTable>
      ) : null}
    </AdminPanel>
  );
}

function ServerRow({ server, disabled, save }: {
  server: admin.AdminServer; disabled: boolean;
  save: (server: admin.AdminServer, labels: admin.ServerDirectoryLabels) => Promise<void>;
}) {
  const [official, setOfficial] = useState(server.official ?? false);
  const [hidden, setHidden] = useState(server.hidden ?? false);
  const canEditVisibility = typeof server.hidden === "boolean";
  const [featured, setFeatured] = useState(server.featured ?? false);
  const [order, setOrder] = useState(String(server.featuredOrder ?? 0));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const validOrder = /^\d{1,3}$/.test(order);
  const changed = hidden !== !!server.hidden || official !== !!server.official || featured !== !!server.featured || Number(order) !== (server.featuredOrder ?? 0);
  async function submit() {
    if (!validOrder || disabled || saving) return;
    setSaving(true); setError(null);
    try { await save(server, { official, featured, featuredOrder: Number(order), directoryRevision: server.directoryRevision ?? 0, hidden }); }
    catch (err) { setError(err instanceof MasterApiError ? err.message : "Save failed. Please try again."); }
    finally { setSaving(false); }
  }
  const occupancy = server.maximumPlayers ? (server.connectedPlayers / server.maximumPlayers) * 100 : 0;
  return (
    <tr className={changed ? cell.active : undefined}>
      <td className={styles.server}>
        <Primary>{server.name}</Primary>
        <Sub>{server.connectEndpoint}</Sub>
        <Sub plain title={server.serverId}>{shortId(server.serverId)} · {server.ownerEmail ?? "Legacy enrollment"}</Sub>
        <span className={styles.license}>
          <StatusTag status="neutral">{server.licenseLabel ?? "unlicensed"}</StatusTag>
        </span>
      </td>
      <td className={styles.players}>
        {server.online === false ? (
          <StatusTag status="neutral">Offline / not listed</StatusTag>
        ) : (
          <>
            <Mono>{server.connectedPlayers}/{server.maximumPlayers}</Mono>
            <Meter value={occupancy} label={`${server.connectedPlayers} of ${server.maximumPlayers} players`} />
            <Sub>{formatAge(server.lastHeartbeatUtc)} ago</Sub>
          </>
        )}
      </td>
      <td className={cell.nowrap}>
        <Stack>
          <Checkbox checked={hidden} onChange={e => setHidden(e.target.checked)} disabled={disabled || !canEditVisibility} aria-label={`Hide from public list: ${server.name}`}>
            Hide from list
          </Checkbox>
          <StatusTag status={!canEditVisibility || server.hidden ? "warn" : "neutral"}>
            {!canEditVisibility ? "Update master first" : server.hidden ? "Hidden" : "Not hidden"}
          </StatusTag>
        </Stack>
      </td>
      <td className={styles.labels}>
        <Checkbox checked={official} onChange={e => setOfficial(e.target.checked)} disabled={disabled} aria-label={`Official: ${server.name}`}>
          {official ? "Official" : "Community"}
        </Checkbox>
        <span className={styles.featured}>
          <Checkbox checked={featured} onChange={e => setFeatured(e.target.checked)} disabled={disabled} aria-label={`Featured: ${server.name}`}>
            {featured ? "Featured" : "Standard"}
          </Checkbox>
          <Input
          type="number"
          min={0}
          max={999}
          step={1}
          value={order}
          onChange={e => setOrder(e.target.value)}
          disabled={disabled || !featured}
          aria-invalid={!validOrder}
          aria-label={`Featured order: ${server.name}`}
          className={styles.order}
          />
        </span>
      </td>
      <td className={cell.actions}>
        <Button
          size="sm"
          color={changed ? "red" : "neutral"}
          border={!changed}
          lines="none"
          busy={saving}
          disabled={disabled || !changed || !validOrder}
          onClick={submit}
        >
          {saving ? "Saving…" : changed ? "Save changes" : "Saved"}
        </Button>
        {error ? (
          <p className={styles.rowError} role="alert">
            <Icon glyph={alert02} />
            {error}
          </p>
        ) : null}
      </td>
    </tr>
  );
}
