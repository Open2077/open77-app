"use client";

import { useCallback, useState } from "react";

import {
  AdminPanel,
  AdminTable,
  EmptyBlock,
  LoadingBlock,
  Mono,
  StatusTag,
  cell,
} from "@/components/admin/admin-kit";
import { ArmButton } from "@/components/admin/arm-button";
import { formatDateTime } from "@/components/admin/format";
import { HashCell } from "@/components/admin/hash-cell";
import { ErrorStrip, useAdminData } from "@/components/admin/use-admin-data";
import { Button } from "@/components/admin/admin-button";
import { Select } from "@/components/ui/field";
import { download02, layers01, packageBox, serverStack01, shield01 } from "@/components/ui/icons";
import { masterCall, MasterApiError, MASTER_URL } from "@/lib/account/api";
import * as admin from "@/lib/account/admin-api";
import type {
  AuthorizedBuild,
  BuildKind,
  BuildStatus,
  ModManifestSummary,
} from "@/lib/account/admin-api";

import styles from "./releases-panel.module.css";

/** The live mod manifest as served publicly (a subset of the signed document). */
type RawManifest = {
  version: string;
  requiredGameBuild: string;
  requiredGameSha256: string;
  issuedAtMs: number;
  baseUrl: string;
  files: unknown[];
};

type LiveMod = {
  version: string;
  issuedAtMs: number;
  fileCount: number;
  requiredGameBuild: string;
  baseUrl: string;
};

const KIND_LABEL: Record<BuildKind, string> = {
  client: "Client mod",
  server: "Server",
  launcher: "Launcher",
};

const STATUS_TAG: Record<BuildStatus, "ok" | "neutral" | "danger"> = {
  active: "ok",
  deprecated: "neutral",
  revoked: "danger",
};

function formatMs(ms: number): string {
  return Number.isFinite(ms) ? formatDateTime(new Date(ms).toISOString()) : "—";
}

/** GET /api/v1/mod/manifest is public; a 404 (no_manifest) means nothing shipped yet. */
async function fetchLiveMod(): Promise<LiveMod | null> {
  try {
    const raw = await masterCall<RawManifest>("/api/v1/mod/manifest");
    return {
      version: raw.version,
      issuedAtMs: raw.issuedAtMs,
      fileCount: Array.isArray(raw.files) ? raw.files.length : 0,
      requiredGameBuild: raw.requiredGameBuild,
      baseUrl: raw.baseUrl,
    };
  } catch {
    // No manifest, or the master is briefly unreachable — the channel card
    // degrades to "none published" rather than failing the whole view.
    return null;
  }
}

function launcherUrl(cdnBaseUrl: string, version: string): string {
  return `${cdnBaseUrl}/launcher/${encodeURIComponent(version)}/Open77Launcher.exe`;
}

// The server ships one archive PER PLATFORM, and has since the multi-platform
// release: `-win-x64.zip` and `-linux-x64.tar.gz`. The old single
// `open77-server-<version>.zip` name has not existed on the CDN since, so
// building it here handed an operator a link that 404s. This panel only knows
// the version (it reads the build allowlist, not the CDN's latest.json), so it
// offers both real names rather than guessing which one the reader wants.
function serverUrls(cdnBaseUrl: string, version: string): { href: string; label: string }[] {
  const v = encodeURIComponent(version);
  const base = `${cdnBaseUrl}/server/${v}/open77-server-${v}`;
  return [
    { href: `${base}-win-x64.zip`, label: "windows zip" },
    { href: `${base}-linux-x64.tar.gz`, label: "linux tar.gz" },
  ];
}

/**
 * The release / ops view: what is live, what has shipped, the anti-crack
 * allowlist and the master's lockdown posture — plus the two sensitive levers
 * (revoke / re-activate a build, roll the mod manifest back). Reads are the
 * priority; every mutation is two-step confirmed and re-verified by a reload.
 */
export function ReleasesPanel() {
  const load = useCallback(
    (token: string) =>
      Promise.all([
        admin.enforcement(token),
        admin.builds(token),
        admin.modManifests(token),
        fetchLiveMod(),
      ] as const),
    [],
  );
  const { token, data, error, setError, loading, reload } = useAdminData(load);
  const [busy, setBusy] = useState(false);

  const [enforcement, builds, manifests, liveMod] = data ?? [null, null, null, null];

  async function run(action: () => Promise<unknown>) {
    if (!token) return;
    setBusy(true);
    setError(null);
    try {
      await action();
      reload();
    } catch (err) {
      setError(err instanceof MasterApiError ? err.message : "Request failed. Try again.");
    } finally {
      setBusy(false);
    }
  }

  const latestActive = (kind: BuildKind): AuthorizedBuild | undefined =>
    builds?.find((b) => b.kind === kind && b.status === "active");

  const cdn = enforcement?.cdnBaseUrl ?? "";
  const launcher = latestActive("launcher");
  const server = latestActive("server");

  return (
    <>
      <ErrorStrip message={error} />
      {loading && !data ? <LoadingBlock label="Loading release state" rows={3} /> : null}

      {enforcement ? (
        <AdminPanel
          title="Enforcement posture"
          icon={shield01}
          brackets
          meta={<>game build {enforcement.requiredGameBuild}</>}
          footnote={
            <>
              Enforcement is set in the master config (<code className={styles.code}>MasterOptions</code>) and shown
              read-only here. Revoked builds are always refused; unknown-build lock-down is the future full
              posture. Enforcement is fast-revocation + forced-upgrade, not tamper-proofing. A patched client can
              lie about its own hash.
            </>
          }
        >
          <div className={styles.posture}>
            <PostureTile
              label="Revoked builds"
              on={enforcement.rejectRevokedBuilds}
              onText="Refused (kill switch)"
              offText="Allowed"
              dangerWhenOff
            />
            <PostureTile
              label="Unknown clients"
              on={enforcement.rejectUnknownClientBuilds}
              onText="Locked down"
              offText="Permitted (beta)"
            />
            <PostureTile
              label="Unknown servers"
              on={enforcement.rejectUnknownServerBuilds}
              onText="Locked down"
              offText="Permitted (beta)"
            />
          </div>
        </AdminPanel>
      ) : null}

      {data ? (
        <AdminPanel
          title="Live channels"
          icon={download02}
          meta="what players and owners download now"
          footnote={
            <>
              Launcher / server versions and links come from the master&apos;s build allowlist (the latest{" "}
              <code className={styles.code}>active</code> build of each kind); the actual CDN pointer that a client
              follows is <code className={styles.code}>latest.json</code> on <code className={styles.code}>{cdn || "the CDN"}</code>,
              maintained on the CDN box. The mod card reflects the live signed manifest directly.
            </>
          }
        >
          <div className={styles.channels}>
            <ChannelCard
              title="Client mod"
              version={liveMod?.version ?? null}
              published={liveMod ? formatMs(liveMod.issuedAtMs) : null}
              meta={liveMod ? `${liveMod.fileCount} files · needs game ${liveMod.requiredGameBuild}` : null}
              links={
                liveMod
                  ? [
                      { href: `${MASTER_URL}/api/v1/mod/manifest`, label: "Signed manifest" },
                      { href: liveMod.baseUrl, label: "Mod file root" },
                    ]
                  : []
              }
              empty="No mod manifest published."
              source="GET /api/v1/mod/manifest"
            />
            <ChannelCard
              title="Launcher"
              version={launcher?.version ?? null}
              published={launcher ? formatDateTime(launcher.releasedAtUtc) : null}
              meta={launcher ? `sha ${launcher.sha256.slice(0, 12)}…` : null}
              links={launcher && cdn ? [{ href: launcherUrl(cdn, launcher.version), label: "Open77Launcher.exe" }] : []}
              empty="No active launcher build registered."
              source="latest active launcher build"
            />
            <ChannelCard
              title="Server"
              version={server?.version ?? null}
              published={server ? formatDateTime(server.releasedAtUtc) : null}
              meta={server ? `sha ${server.sha256.slice(0, 12)}…` : null}
              links={server && cdn ? serverUrls(cdn, server.version) : []}
              empty="No active server build registered."
              source="latest active server build"
            />
          </div>
        </AdminPanel>
      ) : null}

      <ModHistory manifests={manifests} busy={busy} onRollback={(v) => run(() => admin.rollbackMod(token!, v))} />

      <BuildsTable
        builds={builds}
        busy={busy}
        onStatus={(id, status) => run(() => admin.setBuildStatus(token!, id, status))}
      />
    </>
  );
}

function PostureTile({
  label,
  on,
  onText,
  offText,
  dangerWhenOff = false,
}: {
  label: string;
  on: boolean;
  onText: string;
  offText: string;
  dangerWhenOff?: boolean;
}) {
  return (
    <div className={styles.tile} data-state={on ? "on" : dangerWhenOff ? "danger" : "off"}>
      <span className={styles.tileLabel}>{label}</span>
      <span className={styles.tileValue}>
        <StatusTag status={on ? "live" : dangerWhenOff ? "danger" : "neutral"}>{on ? "ON" : "OFF"}</StatusTag>
      </span>
      <span className={styles.tileText}>{on ? onText : offText}</span>
    </div>
  );
}

function ChannelCard({
  title,
  version,
  published,
  meta,
  links,
  empty,
  source,
}: {
  title: string;
  version: string | null;
  published: string | null;
  meta: string | null;
  links: { href: string; label: string }[];
  empty: string;
  source: string;
}) {
  return (
    <article className={styles.channel} data-empty={version ? undefined : ""}>
      <h3 className={styles.channelTitle}>{title}</h3>
      {version ? (
        <>
          <p className={styles.version}>{version}</p>
          <div className={styles.channelMeta}>
            {published ? <span>published {published}</span> : null}
            {meta ? <Mono tone="dim">{meta}</Mono> : null}
          </div>
          {links.length ? (
            <div className={styles.links}>
              {links.map((link) => (
                <Button key={link.href} href={link.href} size="sm" color="neutral" border lines="none" icon={download02} iconPosition="left" title={link.href}>
                  {link.label}
                </Button>
              ))}
            </div>
          ) : null}
        </>
      ) : (
        <p className={styles.channelEmpty}>{empty}</p>
      )}
      <p className={styles.source}>{source}</p>
    </article>
  );
}

function ModHistory({
  manifests,
  busy,
  onRollback,
}: {
  manifests: ModManifestSummary[] | null;
  busy: boolean;
  onRollback: (version: string) => void;
}) {
  if (!manifests) return null;
  return (
    <AdminPanel
      title="Mod manifest history"
      icon={layers01}
      meta="rollback candidates"
      footnote={
        <>
          Rollback re-serves a prior manifest&apos;s exact signed bytes as the live one. The launcher re-syncs the
          mod to that version&apos;s files on its next check (those files already live on the CDN). It does{" "}
          <strong>not</strong> move the launcher or server <code className={styles.code}>latest.json</code> pointers;
          those live on the CDN box and are rolled back there.
        </>
      }
    >
      {manifests.length === 0 ? (
        <EmptyBlock icon={layers01}>
          No archived mod manifest yet. The archive fills as manifests are published; only versions the master
          has archived can be rolled back to.
        </EmptyBlock>
      ) : (
        <AdminTable caption="Archived mod manifests" minWidth="44rem">
          <thead>
            <tr>
              <th>Version</th>
              <th>Published</th>
              <th className={cell.num}>Files</th>
              <th>Game build</th>
              <th className={cell.actions}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {manifests.map((m) => (
              <tr key={m.version} className={m.current ? cell.active : undefined}>
                <td className={cell.nowrap}>
                  <span className={styles.versionCell}>
                    <Mono>{m.version}</Mono>
                    {m.current ? <StatusTag status="live">live</StatusTag> : null}
                  </span>
                </td>
                <td className={cell.nowrap}>
                  <Mono tone="dim">{formatMs(m.issuedAtMs)}</Mono>
                </td>
                <td className={cell.num}>
                  <Mono>{m.fileCount}</Mono>
                </td>
                <td>
                  <Mono tone="dim">{m.requiredGameBuild}</Mono>
                </td>
                <td className={cell.actions}>
                  {m.current ? (
                    <span className={styles.current}>current</span>
                  ) : (
                    <ArmButton
                      label="Roll back"
                      confirmLabel="Re-publish this?"
                      disabled={busy}
                      onConfirm={() => onRollback(m.version)}
                    />
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </AdminTable>
      )}
    </AdminPanel>
  );
}

function BuildsTable({
  builds,
  busy,
  onStatus,
}: {
  builds: AuthorizedBuild[] | null;
  busy: boolean;
  onStatus: (buildId: string, status: BuildStatus) => void;
}) {
  const [kindFilter, setKindFilter] = useState<BuildKind | "all">("all");
  if (!builds) return null;
  const shown = kindFilter === "all" ? builds : builds.filter((b) => b.kind === kindFilter);

  return (
    <AdminPanel
      title="Authorized builds"
      icon={serverStack01}
      meta={<>{shown.length} of {builds.length}</>}
      actions={
        <Select
          compact
          value={kindFilter}
          onChange={(event) => setKindFilter(event.target.value as BuildKind | "all")}
          aria-label="Filter builds by kind"
          className={styles.kindFilter}
        >
          <option value="all">All kinds</option>
          <option value="client">Client mod</option>
          <option value="server">Server</option>
          <option value="launcher">Launcher</option>
        </Select>
      }
      footnote={
        <>
          This is the anti-crack allowlist consulted at connect-ticket time (clients) and heartbeat (servers).
          <strong> Revoking a client build is the fleet kill switch</strong>: those clients stop getting connect
          tickets on their next join and are told to update. Revoking a server build stops it getting run leases.
          Re-activate to undo.
        </>
      }
    >
      {shown.length === 0 ? (
        <EmptyBlock icon={packageBox}>No builds registered for this filter.</EmptyBlock>
      ) : (
        <AdminTable caption="Authorized builds" minWidth="62rem">
          <thead>
            <tr>
              <th>Kind</th>
              <th>Version</th>
              <th>SHA-256</th>
              <th>Game</th>
              <th>Status</th>
              <th>Registered</th>
              <th className={cell.actions}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {shown.map((b) => (
              <tr key={b.buildId} className={b.status === "revoked" ? cell.muted : undefined}>
                <td className={cell.nowrap}>
                  <StatusTag status="neutral">{KIND_LABEL[b.kind]}</StatusTag>
                </td>
                <td className={cell.nowrap}>
                  <Mono>{b.version}</Mono>
                </td>
                <td>
                  <HashCell sha256={b.sha256} />
                </td>
                <td>
                  <Mono tone="dim">{b.gameBuild ?? "—"}</Mono>
                </td>
                <td>
                  <StatusTag status={STATUS_TAG[b.status]}>{b.status}</StatusTag>
                </td>
                <td className={cell.nowrap}>
                  <Mono tone="dim">{formatDateTime(b.releasedAtUtc)}</Mono>
                </td>
                <td className={cell.actions}>
                  <span className={styles.actions}>
                    {b.status !== "active" ? (
                      <ArmButton
                        label="Re-activate"
                        confirmLabel="Confirm?"
                        disabled={busy}
                        onConfirm={() => onStatus(b.buildId, "active")}
                      />
                    ) : null}
                    {b.status !== "revoked" ? (
                      <ArmButton
                        label={b.kind === "client" ? "Revoke (kill)" : "Revoke"}
                        confirmLabel="Confirm revoke?"
                        disabled={busy}
                        onConfirm={() => onStatus(b.buildId, "revoked")}
                      />
                    ) : null}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </AdminTable>
      )}
    </AdminPanel>
  );
}
