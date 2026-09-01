"use client";

import Link from "next/link";
import { type FormEvent, useCallback, useEffect, useState } from "react";

import { formatDateTime, hostOf, safeHttpUrl, shortId } from "@/components/admin/format";
import { HashCell } from "@/components/admin/hash-cell";
import {
  RedistributionTag,
  REDISTRIBUTION_OPTIONS,
  SafetyChip,
} from "@/components/admin/mod-badges";
import { ErrorStrip, useAdminData } from "@/components/admin/use-admin-data";
import { CheckIcon, InfoIcon, SearchIcon, ShieldIcon } from "@/components/icons";
import { MasterApiError } from "@/lib/account/api";
import * as mods from "@/lib/account/mods-api";
import type {
  ModAttestation,
  ModRedistribution,
  ModSafety,
} from "@/lib/account/mods-api";

const SAFETY_OPTIONS: { value: ModSafety; label: string }[] = [
  { value: "verified", label: "Verified — I read these bytes" },
  { value: "blocked", label: "Blocked — never install these bytes" },
];

function replaceRow(rows: ModAttestation[], row: ModAttestation): ModAttestation[] {
  return rows.map((existing) => (existing.sha256 === row.sha256 ? row : existing));
}

/**
 * The mod whitelist: one row per exact set of bytes we have an opinion about.
 *
 * Open77 never serves a mod file — server owners host their own bytes. All this
 * table holds is what we concluded about a SHA-256, and it holds it on two
 * independent axes that the columns keep apart on purpose:
 *
 *   safety         — we read these bytes and they are what they claim
 *   redistribution — the author permits a server to hand this to players
 *
 * A mod can be perfectly safe and still be `refused` for redistribution, in
 * which case the launcher sends the player to the author's own page instead of
 * accepting a server-hosted copy. Nothing in this panel may merge the two.
 *
 * Every string in a row — name, author, source URL — was typed by a human and
 * is treated as untrusted: React escapes the text, and a source link is only
 * rendered as a link when it parses as absolute http(s).
 */
export function ModsPanel() {
  const [input, setInput] = useState("");
  const [query, setQuery] = useState("");
  const [busy, setBusy] = useState(false);
  const [formOpen, setFormOpen] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  // New-entry form.
  const [sha256, setSha256] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [author, setAuthor] = useState("");
  const [sourceUrl, setSourceUrl] = useState("");
  const [safety, setSafety] = useState<ModSafety>("verified");
  const [redistribution, setRedistribution] = useState<ModRedistribution>("unknown");
  const [note, setNote] = useState("");

  // Revocation asks for a reason, so it cannot ride the one-click arm/confirm
  // button the other panels use: the row opens this form instead.
  const [revokeTarget, setRevokeTarget] = useState<ModAttestation | null>(null);
  const [revokeReason, setRevokeReason] = useState("");

  // Debounced search, exactly as the licenses and alpha-access panels do it.
  useEffect(() => {
    const timer = setTimeout(() => setQuery(input.trim()), 350);
    return () => clearTimeout(timer);
  }, [input]);

  const load = useCallback(
    (token: string) => mods.modAttestations(token, query ? { query } : {}),
    [query],
  );
  const { token, data, setData, error, setError, loading, reload } = useAdminData(load);

  const normalizedHash = mods.normalizeSha256(sha256);
  const hashLooksRight = normalizedHash.length === 0 || mods.isSha256(normalizedHash);
  const trimmedSource = sourceUrl.trim();
  const sourceLooksRight = trimmedSource.length === 0 || safeHttpUrl(trimmedSource) !== null;
  const canSubmit =
    mods.isSha256(normalizedHash) && displayName.trim().length > 0 && sourceLooksRight;

  function resetForm() {
    setSha256("");
    setDisplayName("");
    setAuthor("");
    setSourceUrl("");
    setSafety("verified");
    setRedistribution("unknown");
    setNote("");
  }

  async function onCreate(event: FormEvent) {
    event.preventDefault();
    if (!token || !canSubmit) return;
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      const created = await mods.createModAttestation(token, {
        sha256: normalizedHash,
        displayName: displayName.trim(),
        ...(author.trim() ? { author: author.trim() } : {}),
        ...(trimmedSource ? { sourceUrl: trimmedSource } : {}),
        safety,
        redistribution,
        ...(note.trim() ? { note: note.trim() } : {}),
      });
      setNotice(
        `“${created.displayName}” recorded as ${created.safety}, redistribution ${created.redistribution}. Launchers pick it up on their next attest call.`,
      );
      setFormOpen(false);
      resetForm();
      reload();
    } catch (err) {
      setError(err instanceof MasterApiError ? err.message : "Request failed. Try again.");
    } finally {
      setBusy(false);
    }
  }

  async function onRevoke(event: FormEvent) {
    event.preventDefault();
    if (!token || !revokeTarget || revokeReason.trim().length === 0) return;
    const target = revokeTarget;
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      const updated = await mods.revokeModAttestation(token, target.sha256, revokeReason.trim());
      setData((current) => (current ? replaceRow(current, updated) : current));
      setNotice(
        `“${target.displayName}” is now blocked. No launcher release is needed — the verdict flips on the next attest call.`,
      );
      setRevokeTarget(null);
      setRevokeReason("");
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
          <ShieldIcon size={17} />
          Mod whitelist
        </h2>
        <div className="adm-search">
          <SearchIcon size={13} />
          <input
            value={input}
            onChange={(event) => setInput(event.target.value)}
            placeholder="Search name or SHA-256…"
            aria-label="Search the mod whitelist by name or hash"
            spellCheck={false}
            maxLength={128}
          />
        </div>
      </div>

      <p className="ac-notice adm-gate is-on" style={{ marginBottom: 12 }}>
        <InfoIcon />
        <span>
          <strong>Two answers, never one.</strong> <em>Safety</em> says we read these exact bytes
          and they are what they claim. <em>Redistribution</em> says whether the author permits a
          server to hand the file to players — a mod can be safe and still refused, and a refusal
          sends the player to the author&apos;s own page instead. Open77 hosts no mod file either
          way.
        </span>
      </p>

      <ErrorStrip message={error} />
      {notice ? (
        <p className="ac-success" role="status" style={{ marginBottom: 12 }}>
          <CheckIcon size={14} />
          <span>{notice}</span>
        </p>
      ) : null}

      <div className="adm-toolbar">
        <Link className="ac-iconbtn" href="/admin/mods/requests">
          Review queue
        </Link>
        <div className="adm-panel-head" style={{ margin: 0 }}>
          {data ? (
            <span className="adm-count">
              {data.length} {data.length === 1 ? "entry" : "entries"}
            </span>
          ) : null}
          <button className="ac-iconbtn" type="button" onClick={reload} disabled={loading}>
            Refresh
          </button>
          {!formOpen ? (
            <button
              className="btn btn-small btn-primary"
              type="button"
              onClick={() => {
                setFormOpen(true);
                setRevokeTarget(null);
              }}
            >
              Whitelist a hash
            </button>
          ) : null}
        </div>
      </div>

      {formOpen ? (
        <form className="adm-form" onSubmit={onCreate}>
          <label className="ac-label adm-form-span">
            SHA-256 of the package
            <input
              className="ac-input adm-mono"
              value={sha256}
              onChange={(event) => setSha256(event.target.value)}
              placeholder="64 hexadecimal characters"
              aria-invalid={!hashLooksRight}
              aria-describedby="mod-hash-hint"
              spellCheck={false}
              autoComplete="off"
              required
            />
            <span className="ac-hint" id="mod-hash-hint">
              {hashLooksRight
                ? "Hash the archive the server hosts, not an unpacked file. Case and spacing are normalised."
                : `That is not a SHA-256 — 64 hex characters expected, ${normalizedHash.length} given.`}
            </span>
          </label>
          <label className="ac-label">
            Display name
            <input
              className="ac-input"
              value={displayName}
              onChange={(event) => setDisplayName(event.target.value)}
              placeholder="As the author titles it"
              maxLength={160}
              required
            />
          </label>
          <label className="ac-label">
            Author
            <input
              className="ac-input"
              value={author}
              onChange={(event) => setAuthor(event.target.value)}
              placeholder="Optional"
              maxLength={160}
            />
          </label>
          <label className="ac-label adm-form-span">
            Source page
            <input
              className="ac-input"
              value={sourceUrl}
              onChange={(event) => setSourceUrl(event.target.value)}
              placeholder="https://www.nexusmods.com/…"
              type="url"
              inputMode="url"
              aria-invalid={!sourceLooksRight}
              aria-describedby="mod-source-hint"
              spellCheck={false}
            />
            <span className="ac-hint" id="mod-source-hint">
              {sourceLooksRight
                ? "The author’s own page. Kept for provenance, and where a refused mod sends the player."
                : "Only absolute http:// or https:// links are stored."}
            </span>
          </label>
          <label className="ac-label">
            Safety — the bytes
            <select
              className="adm-select"
              value={safety}
              onChange={(event) => setSafety(event.target.value as ModSafety)}
            >
              {SAFETY_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
          <label className="ac-label">
            Redistribution — the licence
            <select
              className="adm-select"
              value={redistribution}
              onChange={(event) => setRedistribution(event.target.value as ModRedistribution)}
            >
              {REDISTRIBUTION_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
          <label className="ac-label adm-form-span">
            Reviewer note
            <input
              className="ac-input"
              value={note}
              onChange={(event) => setNote(event.target.value)}
              placeholder="What you checked, and where the licence answer came from"
              maxLength={512}
            />
          </label>
          <div className="ac-form-actions adm-form-span" style={{ margin: 0 }}>
            <button
              className="btn btn-small btn-primary"
              type="submit"
              disabled={busy || !canSubmit}
            >
              {busy ? "Working…" : "Record verdict"}
            </button>
            <button
              className="btn btn-small btn-ghost"
              type="button"
              onClick={() => {
                setFormOpen(false);
                resetForm();
              }}
            >
              Cancel
            </button>
          </div>
        </form>
      ) : null}

      {revokeTarget ? (
        <form className="adm-form" onSubmit={onRevoke}>
          <p className="ac-notice adm-form-span" style={{ margin: 0 }}>
            <InfoIcon />
            <span>
              Revoking <strong>{revokeTarget.displayName}</strong> flips its safety to{" "}
              <strong>blocked</strong>. Every launcher learns on its next attest call; no launcher
              release is involved.
            </span>
          </p>
          <label className="ac-label adm-form-span">
            Reason
            <input
              className="ac-input"
              value={revokeReason}
              onChange={(event) => setRevokeReason(event.target.value)}
              placeholder="Recorded against the entry and in the audit log"
              maxLength={512}
              required
            />
          </label>
          <div className="ac-form-actions adm-form-span" style={{ margin: 0 }}>
            <button
              className="btn btn-small btn-primary"
              type="submit"
              disabled={busy || revokeReason.trim().length === 0}
            >
              {busy ? "Working…" : "Confirm — block this hash"}
            </button>
            <button
              className="btn btn-small btn-ghost"
              type="button"
              onClick={() => {
                setRevokeTarget(null);
                setRevokeReason("");
              }}
            >
              Cancel
            </button>
          </div>
        </form>
      ) : null}

      {loading && !data ? <p className="ac-loading">Loading the whitelist…</p> : null}
      {data && data.length === 0 ? (
        <p className="adm-empty">
          {query
            ? `No entry matches “${query}”.`
            : "Nothing is whitelisted yet — every hash is unknown, and unknown packages carry inert data only."}
        </p>
      ) : null}

      {data && data.length > 0 ? (
        <div className="adm-tablewrap">
          <table className="adm-table">
            <thead>
              <tr>
                <th scope="col">SHA-256</th>
                <th scope="col">Mod</th>
                <th scope="col">Source</th>
                <th scope="col">Safety</th>
                <th scope="col">Redistribution</th>
                <th scope="col">Reviewer</th>
                <th scope="col">Reviewed</th>
                <th scope="col">State</th>
                <th scope="col" className="adm-actions-cell">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {data.map((row) => (
                <AttestationRow
                  key={row.sha256}
                  row={row}
                  busy={busy}
                  onRevoke={() => {
                    setFormOpen(false);
                    setRevokeReason("");
                    setRevokeTarget(row);
                  }}
                />
              ))}
            </tbody>
          </table>
        </div>
      ) : null}

      <p className="adm-footnote">
        The platform stores a verdict, never a file: the bytes stay with the server that hosts them.
        An unknown hash is a valid answer and the common one — an unverified package may carry inert
        data only (.archive, .tweak, .xl, engine config), while .dll, .reds, CET Lua and .asi are
        refused until that exact hash is verified here.
      </p>
    </section>
  );
}

function AttestationRow({
  row,
  busy,
  onRevoke,
}: {
  row: ModAttestation;
  busy: boolean;
  onRevoke: () => void;
}) {
  const revoked = row.revokedAtUtc !== null;
  const source = safeHttpUrl(row.sourceUrl);
  const reviewer = row.reviewerEmail ?? (row.reviewerAccountId ? shortId(row.reviewerAccountId) : null);

  return (
    <tr className={revoked ? "is-muted" : ""}>
      <td>
        <HashCell sha256={row.sha256} />
      </td>
      <td>
        <div>{row.displayName}</div>
        <div className="adm-mono adm-faint">{row.author ?? "author unknown"}</div>
      </td>
      <td className="adm-source">
        {source ? (
          <a href={source} target="_blank" rel="noreferrer noopener" title={source}>
            {hostOf(source)}
          </a>
        ) : row.sourceUrl ? (
          // Not a link we will follow — shown as plain text so the reviewer can
          // still read what was submitted.
          <span className="adm-mono adm-faint" title="Not an http(s) link — not rendered as one">
            {row.sourceUrl}
          </span>
        ) : (
          <span className="adm-faint">—</span>
        )}
      </td>
      <td>
        <SafetyChip safety={row.safety} />
      </td>
      <td>
        <RedistributionTag value={row.redistribution} />
      </td>
      <td className="adm-mono adm-dim">{reviewer ?? "—"}</td>
      <td className="adm-mono adm-faint">{formatDateTime(row.reviewedAtUtc)}</td>
      <td>
        {row.revokedAtUtc !== null ? (
          <div className="adm-stack">
            <span className="adm-chip adm-chip-warn">revoked</span>
            <span className="adm-stack-note">
              {formatDateTime(row.revokedAtUtc)}
              {row.revokedByEmail ? ` · ${row.revokedByEmail}` : ""}
            </span>
            {row.revokedReason ? (
              <span className="adm-stack-note">{row.revokedReason}</span>
            ) : null}
          </div>
        ) : (
          <span className="adm-chip adm-chip-dim">live</span>
        )}
      </td>
      <td className="adm-actions-cell">
        {revoked ? null : (
          <button
            className="ac-iconbtn is-danger"
            type="button"
            disabled={busy}
            onClick={onRevoke}
          >
            Revoke
          </button>
        )}
      </td>
    </tr>
  );
}
