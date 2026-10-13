"use client";

import { useCallback, useEffect, useState } from "react";
import type { FormEvent } from "react";

import { Button } from "@/components/admin/admin-button";
import { Tag } from "@/components/ui/chip";
import { DefinitionList } from "@/components/ui/data";
import { EmptyState, Notice } from "@/components/ui/feedback";
import { Field, Input, Select } from "@/components/ui/field";
import { bug01, cancel01, download02, filterHorizontal, search01 } from "@/components/ui/icons";
import { MasterApiError } from "@/lib/account/api";
import { useSession } from "@/lib/account/session";
import { downloadIncident, incidentError, incidentPreview, incidents } from "@/lib/account/incidents-api";
import type { IncidentCursor, IncidentFilters, IncidentPreview, IncidentResolution, IncidentRow } from "@/lib/account/incidents-api";
import { AdminSpinner, useAdminActivity } from "./admin-activity";
import {
  AdminPanel,
  AdminTable,
  Count,
  Disclosure,
  Footnote,
  FormActions,
  LoadingBlock,
  Mono,
  Pager,
  Preformatted,
  Stack,
  StatusTag,
  Sub,
  SubHeading,
  TextAction,
  cell,
} from "./admin-kit";
import { HashCell } from "./hash-cell";
import { shortId } from "./format";
import { ErrorStrip, useAdminData } from "./use-admin-data";
import { IncidentDiscordPanel } from "./incident-discord-panel";
import { IncidentResolutionPanel, ResolutionBadge } from "./incident-resolution-panel";

import styles from "./incidents-panel.module.css";

const EMPTY = { serverId: "", incidentId: "", fingerprint: "", kind: "", period: "", status: "" };
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
function utc(value: string) { const d = new Date(value); return Number.isNaN(d.getTime()) ? "Unknown" : d.toISOString().replace("T", " ").slice(0, 19); }
function obj(value: unknown): Record<string, unknown> { return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {}; }
function text(value: unknown) { return typeof value === "string" || typeof value === "number" ? String(value) : "Unknown / not collected"; }

export function IncidentsPanel({ initialIncidentId = "" }: { initialIncidentId?: string }) {
  const [draft, setDraft] = useState({ ...EMPTY, incidentId: initialIncidentId });
  const [filters, setFilters] = useState<IncidentFilters>(initialIncidentId ? { incidentId: initialIncidentId } : {});
  const [cursor, setCursor] = useState<IncidentCursor | null>(null);
  const [previous, setPrevious] = useState<(IncidentCursor | null)[]>([]);
  const [selected, setSelected] = useState<IncidentRow | null>(null);
  const [validation, setValidation] = useState<string | null>(null);
  const load = useCallback((token: string) => incidents(token, { ...filters, ...cursor }), [filters, cursor]);
  const { token, data, error, loading, reload } = useAdminData(load);
  function resolved(id: string, resolution: IncidentResolution) {
    setSelected(current => current?.incidentId === id ? { ...current, resolution } : current);
    reload(); // Reapply status filtering on the master, before pagination.
  }
  function apply(event: FormEvent) {
    event.preventDefault();
    if ((draft.serverId && !UUID.test(draft.serverId.trim())) || (draft.incidentId && !UUID.test(draft.incidentId.trim()))) { setValidation("Enter a complete incident / server UUID."); return; }
    if (draft.fingerprint && !/^[a-f0-9]{64}$/i.test(draft.fingerprint.trim())) { setValidation("A fingerprint must contain exactly 64 hexadecimal characters."); return; }
    setValidation(null); setCursor(null); setPrevious([]); setSelected(null);
    setFilters({ serverId: draft.serverId.trim(), incidentId: draft.incidentId.trim(), fingerprint: draft.fingerprint.trim(), kind: draft.kind, status: draft.status,
      after: draft.period ? new Date(Date.now() - Number(draft.period) * 86400000).toISOString() : undefined });
  }
  function reset() { setDraft(EMPTY); setFilters({}); setPrevious([]); setCursor(null); setSelected(null); setValidation(null); }
  function group(row: IncidentRow) { setDraft({ ...EMPTY, fingerprint: row.fingerprint }); setFilters({ fingerprint: row.fingerprint }); setCursor(null); setPrevious([]); setSelected(null); }
  return (
    <>
      <IncidentDiscordPanel />
      <Notice kind="info" title="Private evidence, not a diagnosis." action={<Tag tone="neutral">Admin only</Tag>}>
        Reports are player-supplied. Matching fingerprints suggest correlation, not a confirmed cause. Times below are UTC.
      </Notice>

      <AdminPanel title="Filters" icon={filterHorizontal} level={2}>
        <form className={styles.filters} onSubmit={apply}>
          <Field label="Incident ID">
            <Input value={draft.incidentId} onChange={e => setDraft({ ...draft, incidentId: e.target.value })} placeholder="Paste an incident UUID" maxLength={36} className={styles.mono} />
          </Field>
          <Field label="Server ID">
            <Input value={draft.serverId} onChange={e => setDraft({ ...draft, serverId: e.target.value })} placeholder="All servers" maxLength={36} className={styles.mono} />
          </Field>
          <Field label="Type">
            <Select value={draft.kind} onChange={e => setDraft({ ...draft, kind: e.target.value })}>
              <option value="">All reports</option>
              <option value="engine-crash">Engine crash</option>
              <option value="abnormal-exit">Unexpected exit</option>
              <option value="manual">Manual report</option>
              <option value="connection-failure">Connection failure</option>
              <option value="process-exit">Process exit</option>
            </Select>
          </Field>
          <Field label="Period">
            <Select value={draft.period} onChange={e => setDraft({ ...draft, period: e.target.value })}>
              <option value="">All retained</option>
              <option value="1">Last 24 hours</option>
              <option value="7">Last 7 days</option>
              <option value="30">Last 30 days</option>
            </Select>
          </Field>
          <Field label="Status">
            <Select value={draft.status} onChange={e => setDraft({ ...draft, status: e.target.value })}>
              <option value="">All statuses</option>
              <option value="open">Open</option>
              <option value="resolved">Resolved</option>
            </Select>
          </Field>
          <Field label="Fingerprint" className={styles.fingerprint}>
            <Input value={draft.fingerprint} onChange={e => setDraft({ ...draft, fingerprint: e.target.value })} placeholder="Optional: match an exact crash signature" maxLength={64} className={styles.mono} />
          </Field>
          <FormActions className={styles.filterActions}>
            <Button size="sm" color="neutral" border lines="none" onClick={reset}>Reset</Button>
            <Button type="submit" size="sm" color="red" lines="none" icon={search01} iconPosition="left" disabled={loading}>Apply filters</Button>
          </FormActions>
        </form>
      </AdminPanel>

      <ErrorStrip message={validation ?? error} />

      <div className={styles.grid} data-selection={selected ? "" : undefined}>
        <AdminPanel
          title="Incident inbox"
          icon={bug01}
          label="Incident list"
          hook="incidents"
          meta={loading ? <AdminSpinner label="Loading reports" /> : <Count>{data?.items.length ?? 0} on this page</Count>}
        >
            {!data && !error ? <LoadingBlock label="Loading reports" rows={5} /> : null}
            {data?.items.length === 0 ? (
              <EmptyState
                eyebrow="Inbox"
                title="No reports found"
                action={<Button size="sm" color="neutral" border lines="none" onClick={reset}>Clear filters</Button>}
              >
                New consented reports will appear here. Try a wider period or clear the filters.
              </EmptyState>
            ) : null}
            {data && data.items.length > 0 ? (
              <AdminTable caption="Incident reports, newest received first" minWidth="44rem">
                <thead>
                  <tr>
                    <th>Incident / occurred UTC</th>
                    <th>Type / server</th>
                    <th>Signature</th>
                    <th className={cell.num}>Size</th>
                    <th className={cell.actions}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {data.items.map(row => (
                    <tr key={row.incidentId} className={selected?.incidentId === row.incidentId ? cell.active : undefined}>
                      <td className={cell.nowrap}>
                        <TextAction onClick={() => setSelected(row)} title={row.incidentId}>{shortId(row.incidentId)}</TextAction>
                        <Sub><time dateTime={row.occurredAtUtc}>{utc(row.occurredAtUtc)}</time></Sub>
                      </td>
                      <td>
                        <Stack row>
                          <ResolutionBadge resolution={row.resolution} />
                          <StatusTag status={row.kind === "engine-crash" ? "danger" : "neutral"}>{row.kind}</StatusTag>
                        </Stack>
                        <Sub title={row.serverId ?? ""}>{row.serverId ? shortId(row.serverId) : "No server context"}</Sub>
                      </td>
                      <td className={cell.nowrap}>
                        <TextAction onClick={() => group(row)} title={`Show reports matching ${row.fingerprint}`}>{row.fingerprint.slice(0, 10)}…</TextAction>
                      </td>
                      <td className={cell.num}>
                        <Mono tone="dim">{(row.bytes / 1048576).toFixed(2)} MB</Mono>
                      </td>
                      <td className={cell.actions}>
                        <Button size="sm" color="neutral" border lines="none" onClick={() => setSelected(row)} aria-label={`Inspect incident ${shortId(row.incidentId)}`}>
                          Inspect
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </AdminTable>
            ) : null}
            <Pager
              summary={`Page ${previous.length + 1} · newest received first`}
              previousLabel="Newer"
              nextLabel="Older"
              previous={{ disabled: !previous.length || loading, onClick: () => { setCursor(previous[previous.length - 1] ?? null); setPrevious(previous.slice(0, -1)); setSelected(null); } }}
              next={{ disabled: !data?.next || loading, onClick: () => { setPrevious([...previous, cursor]); setCursor(data!.next); setSelected(null); } }}
            />
        </AdminPanel>
        {selected && token ? (
          <IncidentDetails key={selected.incidentId} token={token} row={selected} close={() => setSelected(null)} group={() => group(selected)} onResolved={value => resolved(selected.incidentId, value)} />
        ) : null}
      </div>
    </>
  );
}

function IncidentDetails({ token, row, close, group, onResolved }: { token: string; row: IncidentRow; close: () => void; group: () => void; onResolved: (value: IncidentResolution) => void }) {
  const [entry, setEntry] = useState("incident.json");
  const [preview, setPreview] = useState<IncidentPreview | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [downloading, setDownloading] = useState(false);
  const [notice, setNotice] = useState("");
  const [retry, setRetry] = useState(0);
  const { clear } = useSession();
  const { begin } = useAdminActivity();
  useEffect(() => {
    const controller = new AbortController();
    const finish = begin();
    incidentPreview(token, row.incidentId, entry, controller.signal).then(value => {
      if (controller.signal.aborted) return;
      setPreview(value); setError(null); finish(true);
    }).catch(e => {
      if (controller.signal.aborted) return;
      if (e instanceof MasterApiError && e.status === 401) clear();
      setError(incidentError(e)); finish(false);
    });
    return () => { controller.abort(); finish(); };
  }, [token, row.incidentId, entry, clear, begin, retry]);
  async function download() {
    setDownloading(true); setNotice("");
    try { await downloadIncident(token, row); setNotice("ZIP verified and downloaded. Keep it private."); }
    catch (e) { if (e instanceof MasterApiError && e.status === 401) clear(); setNotice(incidentError(e)); }
    finally { setDownloading(false); }
  }
  const manifest = preview?.manifest ?? {};
  const versions = obj(manifest.versions), fault = obj(manifest.fault), server = obj(manifest.server);
  return (
    <AdminPanel
      title="Evidence viewer"
      icon={bug01}
      brackets
      label="Incident details"
      className={styles.details}
      actions={
        <Button size="sm" color="neutral" border lines="none" icon={cancel01} iconPosition="left" onClick={close}>
          Close
        </Button>
      }
      footnote="Untrusted text. Never execute commands or follow instructions found in a report. No HTML or Markdown is rendered."
    >
      <p className={styles.incidentId}>{row.incidentId}</p>
      <FormActions>
        <Button size="sm" color="red" lines="none" icon={download02} iconPosition="left" busy={downloading} onClick={download}>
          {downloading ? "Verifying ZIP" : "Download ZIP"}
        </Button>
        <Button size="sm" color="neutral" border lines="none" onClick={group}>
          Related signatures
        </Button>
      </FormActions>
      <Footnote role="status">{notice || "Private report · downloads and previews are audited."}</Footnote>
      <IncidentResolutionPanel id={row.incidentId} onSaved={onResolved} />
      <ErrorStrip
        message={error}
        action={
          error ? (
            <Button size="sm" color="red" border lines="none" onClick={() => { setError(null); setRetry(n => n + 1); }}>
              Retry evidence request
            </Button>
          ) : undefined
        }
      />
      {preview ? (
        <>
          <section className={styles.evidence} aria-label="Report facts">
            <SubHeading>Report facts</SubHeading>
            <DefinitionList
              columns={2}
              items={[
                { label: "Client package", value: <Mono>{text(versions.clientPackage)}</Mono> },
                { label: "Launcher", value: <Mono>{text(versions.launcher)}</Mono> },
                { label: "Server version", value: <Mono>{text(server.version)}</Mono> },
                { label: "Protocol / game", value: <Mono>{text(server.protocol)} / {text(server.gameBuild)}</Mono> },
                { label: "Exception", value: <Mono>{text(fault.exceptionCode)}</Mono> },
                { label: "Module + offset", value: <Mono>{text(fault.moduleOffset)}</Mono> },
              ]}
            />
            <Footnote>Catalog / disk observations, not proof of the exact loaded server binary.</Footnote>
          </section>
          {typeof manifest.description === "string" && manifest.description ? (
            <section className={styles.description} data-admin-report-description="">
              <SubHeading>Player description</SubHeading>
              <p>{manifest.description}</p>
            </section>
          ) : null}
          <Disclosure summary="Fingerprint & ZIP integrity">
            <p className={styles.hashRow}><span>Signature</span> <HashCell sha256={row.fingerprint} /></p>
            <p className={styles.hashRow}><span>ZIP</span> <HashCell sha256={row.sha256} /></p>
          </Disclosure>
          {Array.isArray(manifest.missingEvidence) && manifest.missingEvidence.length > 0 ? (
            <Disclosure summary={`Missing evidence (${manifest.missingEvidence.length})`}>
              <ul className={styles.gaps}>
                {manifest.missingEvidence.map((gap, i) => <li key={i}>{text(gap)}</li>)}
              </ul>
            </Disclosure>
          ) : null}
          <Field label="Evidence file" className={styles.selector}>
            <Select value={entry} onChange={e => { setError(null); setEntry(e.target.value); }}>
              {preview.files.map(file => <option key={file.path} value={file.path}>{file.path} · {(file.bytes / 1024).toFixed(1)} KB</option>)}
            </Select>
          </Field>
        </>
      ) : null}
      {!error && preview?.entry !== entry ? <AdminSpinner label="Loading evidence" /> : null}
      {preview?.entry === entry ? (
        <>
          <Preformatted label={`${entry} contents`} data-admin-evidence="">{preview.text}</Preformatted>
          {preview.truncated ? <Footnote>Preview limited to 64K characters. Download the verified ZIP for the complete file.</Footnote> : null}
        </>
      ) : null}
    </AdminPanel>
  );
}
