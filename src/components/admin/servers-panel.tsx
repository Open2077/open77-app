"use client";

import { Fragment, useCallback, useMemo, useRef, useState } from "react";

import { useAdminActivity } from "@/components/admin/admin-activity";
import {
  AdminPanel,
  AdminTable,
  Count,
  EmptyBlock,
  Footnote,
  LoadingBlock,
  Mono,
  Pager,
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
import { UpcomingServerEditor } from "@/components/admin/upcoming-server-editor";
import { ServerText } from "@/components/servers/server-text";
import { ErrorStrip, useAdminData } from "@/components/admin/use-admin-data";
import { Button } from "@/components/admin/admin-button";
import { Meter } from "@/components/ui/feedback";
import { Checkbox, Field, Input, Select } from "@/components/ui/field";
import { Icon } from "@/components/ui/icon";
import { alert02, refresh, serverStack01 } from "@/components/ui/icons";
import { MasterApiError } from "@/lib/account/api";
import * as admin from "@/lib/account/admin-api";
import { plainLauncherText } from "@/lib/launcher-text";

import styles from "./servers-panel.module.css";

/** Master-owned labels are independent of owner-controlled metadata and heartbeats. */
export function ServersPanel() {
  const load = useCallback((token: string) => admin.servers(token), []);
  const { token, data, setData, error, loading, reload } = useAdminData(load);
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState("all");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [drafts, setDrafts] = useState<ReadonlyMap<string, ServerDraft>>(() => new Map());
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
      setDrafts(current => {
        const next = new Map(current);
        next.delete(server.serverId);
        return next;
      });
      setData(current => current?.map(row => row.serverId === server.serverId ? { ...row, ...updated, upcoming: updated.upcoming ?? row.upcoming } : row) ?? null);
      setNotice(updated.hidden
        ? `${plainLauncherText(server.name)} is hidden from public lists. Direct connections remain available. Lists update on their next refresh.`
        : `Directory settings saved for ${plainLauncherText(server.name)}. Lists update on their next refresh.`);
      finish(true);
    } catch (err) {
      finish(false);
      throw err;
    } finally {
      inFlight.current = false;
      setBusy(false);
    }
  }

  const shown = useMemo(() => data?.filter(row =>
    (filter === "all" || (filter === "online" ? row.online !== false : filter === "offline" ? row.online === false : filter === "hidden" ? row.hidden : filter === "visible" ? !row.hidden : filter === "official" ? row.official : filter === "upcoming" ? row.upcoming?.enabled : row.featured)) &&
    plainLauncherText(`${row.name} ${row.upcoming?.name ?? ""} ${row.upcoming?.community ?? ""} ${row.upcoming?.languages.join(" ") ?? ""} ${row.connectEndpoint} ${row.serverId} ${row.ownerEmail || ""}`).toLowerCase().includes(query.toLowerCase())), [data, filter, query]);
  const total = shown?.length ?? 0;
  const pages = Math.max(1, Math.ceil(total / pageSize));
  const currentPage = Math.min(page, pages);
  const start = (currentPage - 1) * pageSize;
  const visible = shown?.slice(start, start + pageSize);
  const pagination = total > 0 ? (
    <Pager
      summary={`${start + 1}–${Math.min(start + pageSize, total)} of ${total} servers · page ${currentPage} of ${pages}`}
      previous={{ disabled: busy || loading || currentPage <= 1, onClick: () => setPage(currentPage - 1) }}
      next={{ disabled: busy || loading || currentPage >= pages, onClick: () => setPage(currentPage + 1) }}
    />
  ) : null;

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
        audited. Lower featured order appears first, including upcoming announcements. An upcoming announcement stays available when the server is offline.
      </Footnote>
      <Toolbar className={styles.toolbar}>
        <ToolbarGroup className={styles.fields}>
          <Field label="Find a server" className={styles.find}>
            <Input type="search" value={query} onChange={e => { setQuery(e.target.value); setPage(1); }} placeholder="Name, address, owner or server ID" className={styles.compact} />
          </Field>
          <Field label="Show" className={styles.show}>
            <Select value={filter} onChange={e => { setFilter(e.target.value); setPage(1); }} compact>
              <option value="all">All servers</option>
              <option value="online">Online</option>
              <option value="offline">Offline</option>
              <option value="visible">Not hidden</option>
              <option value="hidden">Hidden</option>
              <option value="featured">Featured</option>
              <option value="upcoming">Upcoming</option>
              <option value="official">Official</option>
            </Select>
          </Field>
          <Field label="Rows per page" className={styles.show}>
            <Select value={pageSize} onChange={e => { setPageSize(Number(e.target.value)); setPage(1); }} compact>
              {[25, 50, 100].map(size => <option key={size} value={size}>{size} per page</option>)}
            </Select>
          </Field>
          {pages > 1 ? (
            <Field label="Page" className={styles.page}>
              <Select value={currentPage} disabled={busy || loading} onChange={e => setPage(Number(e.target.value))} compact>
                {Array.from({ length: pages }, (_, index) => <option key={index + 1} value={index + 1}>{index + 1} / {pages}</option>)}
              </Select>
            </Field>
          ) : null}
        </ToolbarGroup>
        <Count>{shown?.length ?? 0} / {data?.length ?? 0} servers</Count>
      </Toolbar>
      <ErrorStrip message={error} />
      <SuccessStrip message={notice} />
      {pagination}
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
              <th>Opening announcement</th>
              <th className={cell.actions}>Save settings</th>
            </tr>
          </thead>
          <tbody>
            {visible?.map(server => (
              <ServerRow
                key={`${server.serverId}:${server.directoryRevision ?? 0}`}
                server={server}
                disabled={busy || loading}
                save={save}
                savedDraft={drafts.get(server.serverId)}
                remember={draft => setDrafts(current => new Map(current).set(server.serverId, draft))}
              />
            ))}
          </tbody>
        </AdminTable>
      ) : null}
      {pagination}
    </AdminPanel>
  );
}

type ServerDraft = {
  revision: number;
  official: boolean;
  hidden: boolean;
  featured: boolean;
  order: string;
  upcoming: admin.UpcomingServerProfile;
};

function ServerRow({ server, disabled, save, savedDraft, remember }: {
  server: admin.AdminServer; disabled: boolean;
  save: (server: admin.AdminServer, labels: admin.ServerDirectoryLabels) => Promise<void>;
  savedDraft?: ServerDraft;
  remember: (draft: ServerDraft) => void;
}) {
  const canEditVisibility = typeof server.hidden === "boolean";
  const name = plainLauncherText(server.name);
  const canEditUpcoming = "upcoming" in server;
  const initialUpcoming: admin.UpcomingServerProfile = server.upcoming ?? {
    enabled: false, name: server.name, community: name, languages: [], opensAtUtc: null,
    discord: null, website: null, description: null, iconUrl: null, bannerUrl: null,
  };
  // Keep edits while paging/searching; a refreshed server revision invalidates stale drafts.
  const [draft, setDraft] = useState<ServerDraft>(() => {
    return savedDraft?.revision === (server.directoryRevision ?? 0) ? savedDraft : {
      revision: server.directoryRevision ?? 0,
      official: server.official ?? false, hidden: server.hidden ?? false,
      featured: server.featured ?? false, order: String(server.featuredOrder ?? 0), upcoming: initialUpcoming,
    };
  });
  function edit(patch: Partial<ServerDraft>) {
    const next = { ...draft, ...patch };
    remember(next);
    setDraft(next);
  }
  const { official, hidden, featured, order, upcoming } = draft;
  const [editingUpcoming, setEditingUpcoming] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const validOrder = /^\d{1,3}$/.test(order);
  const upcomingChanged = JSON.stringify(upcoming) !== JSON.stringify(initialUpcoming);
  const changed = hidden !== !!server.hidden || official !== !!server.official || featured !== !!server.featured || Number(order) !== (server.featuredOrder ?? 0) || upcomingChanged;
  const validUpcoming = !upcoming.enabled || Boolean(upcoming.name.trim() && upcoming.community.trim() && upcoming.languages.length > 0 && upcoming.languages.length <= 8
    && upcoming.languages.every(language => /^[a-z]{2,3}(-[a-z0-9]{2,8})*$/i.test(language) && language.length <= 35));
  async function submit() {
    if (!validOrder || !validUpcoming || disabled || saving) return;
    setSaving(true); setError(null);
    try { await save(server, { official, featured, featuredOrder: Number(order), directoryRevision: server.directoryRevision ?? 0, hidden, upcoming: canEditUpcoming && (upcoming.enabled || upcomingChanged) ? upcoming : undefined }); }
    catch (err) { setError(err instanceof MasterApiError ? err.message : "Save failed. Please try again."); }
    finally { setSaving(false); }
  }
  const saveButton = <Button
          size="sm"
          color={changed ? "red" : "neutral"}
          border={!changed}
          lines="none"
          busy={saving}
          disabled={disabled || !changed || !validOrder || !validUpcoming}
          onClick={submit}
        >
          {saving ? "Saving…" : changed ? "Save changes" : "Saved"}
        </Button>;
  const occupancy = server.maximumPlayers ? (server.connectedPlayers / server.maximumPlayers) * 100 : 0;
  return (
    <Fragment>
    <tr className={changed ? cell.active : undefined}>
      <td className={styles.server}>
        <Primary><ServerText text={server.name} /></Primary>
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
          <Checkbox checked={hidden} onChange={e => edit({ hidden: e.target.checked })} disabled={disabled || !canEditVisibility} aria-label={`Hide from public list: ${name}`}>
            Hide from list
          </Checkbox>
          <StatusTag status={!canEditVisibility || server.hidden ? "warn" : "neutral"}>
            {!canEditVisibility ? "Update master first" : server.hidden ? "Hidden" : "Not hidden"}
          </StatusTag>
        </Stack>
      </td>
      <td className={styles.labels}>
        <Checkbox checked={official} onChange={e => edit({ official: e.target.checked })} disabled={disabled} aria-label={`Official: ${name}`}>
          {official ? "Official" : "Community"}
        </Checkbox>
        <span className={styles.featured}>
          <Checkbox checked={featured} onChange={e => edit({ featured: e.target.checked })} disabled={disabled} aria-label={`Featured: ${name}`}>
            {featured ? "Featured" : "Standard"}
          </Checkbox>
          <Input
          type="number"
          min={0}
          max={999}
          step={1}
          value={order}
          onChange={e => edit({ order: e.target.value })}
          disabled={disabled || (!featured && !upcoming.enabled)}
          aria-invalid={!validOrder}
          aria-label={`Featured order: ${name}`}
          className={styles.order}
          />
        </span>
      </td>
      <td className={styles.upcoming}>
        <Checkbox checked={upcoming.enabled} disabled={disabled || !canEditUpcoming} onChange={e => {
          edit({ upcoming: { ...upcoming, enabled: e.target.checked } });
          if (e.target.checked) setEditingUpcoming(true);
        }}>Upcoming server</Checkbox>
        {upcoming.enabled ? <Sub><ServerText text={upcoming.community} /> · {upcoming.languages.join(" / ").toUpperCase()}</Sub> : null}
        <Button size="sm" color="neutral" border lines="none" disabled={disabled || !canEditUpcoming} onClick={() => setEditingUpcoming(!editingUpcoming)}>
          {editingUpcoming ? "Close announcement" : "Edit announcement"}
        </Button>
        {!canEditUpcoming ? <Sub>Update Master to manage upcoming announcements.</Sub> : null}
        {!validUpcoming ? <Sub>Add a name, community and 1–8 valid language tags before saving.</Sub> : null}
      </td>
      <td className={cell.actions}>
        {saveButton}
        {error ? (
          <p className={styles.rowError} role="alert">
            <Icon glyph={alert02} />
            {error}
          </p>
        ) : null}
      </td>
    </tr>
    {editingUpcoming ? (
      <tr>
        <td colSpan={6} className={styles.announcementEditor}>
          <div className={styles.editorHeading}><Primary>Opening announcement · <ServerText text={upcoming.name} /></Primary></div>
          <UpcomingServerEditor value={upcoming} onChange={value => edit({ upcoming: value })} disabled={disabled || !canEditUpcoming} />
          <div className={styles.editorActions}>
            {saveButton}
            <Button size="sm" color="neutral" border lines="none" disabled={saving} onClick={() => setEditingUpcoming(false)}>Close editor</Button>
          </div>
          {error ? <p className={styles.rowError} role="alert">{error}</p> : null}
        </td>
      </tr>
    ) : null}
    </Fragment>
  );
}
