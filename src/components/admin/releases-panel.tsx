"use client";

import { useCallback, useState } from "react";

import { ArmButton } from "@/components/admin/arm-button";
import { formatDateTime } from "@/components/admin/format";
import { ErrorStrip, useAdminData } from "@/components/admin/use-admin-data";
import { DownloadIcon, ServerRackIcon, ShieldIcon } from "@/components/icons";
import { masterCall, MasterApiError, MASTER_URL } from "@/lib/account/api";
import * as admin from "@/lib/account/admin-api";
import type {
  AuthorizedBuild,
  BuildKind,
  BuildStatus,
  ModManifestSummary,
} from "@/lib/account/admin-api";

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

const STATUS_CHIP: Record<BuildStatus, string> = {
  active: "adm-chip-ok",
  deprecated: "adm-chip-dim",
  revoked: "adm-chip-warn",
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

function DownloadLink({ href, label }: { href: string; label: string }) {
  return (
    <a className="adm-download" href={href} target="_blank" rel="noreferrer noopener" title={href}>
      <DownloadIcon size={13} />
      {label}
    </a>
  );
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
      {loading && !data ? <p className="ac-loading">Loading release state…</p> : null}

      {enforcement ? (
        <section className="adm-panel">
          <div className="adm-panel-head">
            <h2 className="adm-panel-title">
              <ShieldIcon size={16} />
              Enforcement posture
            </h2>
            <span className="adm-faint adm-mono">game build {enforcement.requiredGameBuild}</span>
          </div>
          <div className="adm-stats">
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
          <p className="adm-footnote">
            Enforcement is set in the master config (<span className="adm-mono">MasterOptions</span>) and shown
            read-only here. Revoked builds are always refused; unknown-build lock-down is the future full
            posture. Enforcement is fast-revocation + forced-upgrade, not tamper-proofing — a patched client can
            lie about its own hash.
          </p>
        </section>
      ) : null}

      <section className="adm-panel">
        <div className="adm-panel-head">
          <h2 className="adm-panel-title">
            <DownloadIcon size={15} />
            Live channels
          </h2>
          <span className="adm-faint">what players and owners download now</span>
        </div>
        <div className="adm-channels">
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
        <p className="adm-footnote">
          Launcher / server versions and links come from the master&apos;s build allowlist (the latest
          <span className="adm-mono"> active</span> build of each kind); the actual CDN pointer that a client
          follows is <span className="adm-mono">latest.json</span> on <span className="adm-mono">{cdn || "the CDN"}</span>,
          maintained on the CDN box. The mod card reflects the live signed manifest directly.
        </p>
      </section>

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
  const chip = on ? "adm-chip-ok" : dangerWhenOff ? "adm-chip-warn" : "adm-chip-dim";
  return (
    <div className="adm-stat">
      <div className="adm-stat-value">
        <span className={`adm-chip ${chip}`}>{on ? "ON" : "OFF"}</span>
      </div>
      <div className="adm-stat-label">{label}</div>
      <div className="adm-faint" style={{ fontSize: 12, marginTop: 4 }}>
        {on ? onText : offText}
      </div>
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
    <div className="adm-channel">
      <div className="adm-channel-title">{title}</div>
      {version ? (
        <>
          <div className="adm-channel-version adm-mono">{version}</div>
          <div className="adm-faint adm-channel-meta">
            {published ? <span>published {published}</span> : null}
            {meta ? <span className="adm-mono">{meta}</span> : null}
          </div>
          <div className="adm-channel-links">
            {links.map((link) => (
              <DownloadLink key={link.href} href={link.href} label={link.label} />
            ))}
          </div>
        </>
      ) : (
        <div className="adm-empty" style={{ padding: "12px 0" }}>
          {empty}
        </div>
      )}
      <div className="adm-channel-source adm-faint adm-mono">{source}</div>
    </div>
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
    <section className="adm-panel">
      <div className="adm-panel-head">
        <h2 className="adm-panel-title">
          <DownloadIcon size={15} />
          Mod manifest history
        </h2>
        <span className="adm-faint">rollback candidates</span>
      </div>
      {manifests.length === 0 ? (
        <p className="adm-empty">
          No archived mod manifest yet. The archive fills as manifests are published; only versions the master
          has archived can be rolled back to.
        </p>
      ) : (
        <div className="adm-tablewrap">
          <table className="adm-table">
            <thead>
              <tr>
                <th>Version</th>
                <th>Published</th>
                <th>Files</th>
                <th>Game build</th>
                <th className="adm-actions-cell">Actions</th>
              </tr>
            </thead>
            <tbody>
              {manifests.map((m) => (
                <tr key={m.version} className={m.current ? "" : "is-muted"}>
                  <td className="adm-mono">
                    {m.version}{" "}
                    {m.current ? <span className="adm-chip adm-chip-ok">live</span> : null}
                  </td>
                  <td className="adm-mono adm-faint">{formatMs(m.issuedAtMs)}</td>
                  <td className="adm-num">{m.fileCount}</td>
                  <td className="adm-mono adm-dim">{m.requiredGameBuild}</td>
                  <td className="adm-actions-cell">
                    {m.current ? (
                      <span className="adm-faint">current</span>
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
          </table>
        </div>
      )}
      <p className="adm-footnote">
        Rollback re-serves a prior manifest&apos;s exact signed bytes as the live one — the launcher re-syncs the
        mod to that version&apos;s files on its next check (those files already live on the CDN). It does{" "}
        <strong>not</strong> move the launcher or server <span className="adm-mono">latest.json</span> pointers —
        those live on the CDN box and are rolled back there.
      </p>
    </section>
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
    <section className="adm-panel">
      <div className="adm-panel-head">
        <h2 className="adm-panel-title">
          <ServerRackIcon size={16} />
          Authorized builds
        </h2>
        <select
          className="adm-select"
          value={kindFilter}
          onChange={(event) => setKindFilter(event.target.value as BuildKind | "all")}
          aria-label="Filter builds by kind"
        >
          <option value="all">All kinds</option>
          <option value="client">Client mod</option>
          <option value="server">Server</option>
          <option value="launcher">Launcher</option>
        </select>
      </div>
      {shown.length === 0 ? (
        <p className="adm-empty">No builds registered for this filter.</p>
      ) : (
        <div className="adm-tablewrap">
          <table className="adm-table">
            <thead>
              <tr>
                <th>Kind</th>
                <th>Version</th>
                <th>SHA-256</th>
                <th>Game</th>
                <th>Status</th>
                <th>Registered</th>
                <th className="adm-actions-cell">Actions</th>
              </tr>
            </thead>
            <tbody>
              {shown.map((b) => (
                <tr key={b.buildId} className={b.status === "revoked" ? "is-muted" : ""}>
                  <td>
                    <span className="adm-chip adm-chip-dim">{KIND_LABEL[b.kind]}</span>
                  </td>
                  <td className="adm-mono">{b.version}</td>
                  <td className="adm-mono adm-faint" title={b.sha256}>
                    {b.sha256.slice(0, 16)}…
                  </td>
                  <td className="adm-mono adm-dim">{b.gameBuild ?? "—"}</td>
                  <td>
                    <span className={`adm-chip ${STATUS_CHIP[b.status]}`}>{b.status}</span>
                  </td>
                  <td className="adm-mono adm-faint">{formatDateTime(b.releasedAtUtc)}</td>
                  <td className="adm-actions-cell">
                    <div className="adm-action-row">
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
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <p className="adm-footnote">
        This is the anti-crack allowlist consulted at connect-ticket time (clients) and heartbeat (servers).
        <strong> Revoking a client build is the fleet kill switch</strong>: those clients stop getting connect
        tickets on their next join and are told to update. Revoking a server build stops it getting run leases.
        Re-activate to undo.
      </p>
    </section>
  );
}
