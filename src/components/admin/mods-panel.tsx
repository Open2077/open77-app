"use client";

import { type FormEvent, useCallback, useEffect, useState } from "react";

import {
  AdminPanel,
  AdminTable,
  Count,
  EmptyBlock,
  FormActions,
  FormGrid,
  FormPanel,
  LoadingBlock,
  Mono,
  Primary,
  SearchBox,
  Span,
  Stack,
  StatusTag,
  Sub,
  SuccessStrip,
  Toolbar,
  ToolbarGroup,
  cell,
} from "@/components/admin/admin-kit";
import { formatDateTime, safeHttpUrl, shortId } from "@/components/admin/format";
import { HashCell } from "@/components/admin/hash-cell";
import {
  RedistributionTag,
  REDISTRIBUTION_OPTIONS,
  SafetyChip,
  SourceCell,
} from "@/components/admin/mod-badges";
import { ErrorStrip, useAdminData } from "@/components/admin/use-admin-data";
import { Button } from "@/components/admin/admin-button";
import { Notice } from "@/components/ui/feedback";
import { Field, Input, Select } from "@/components/ui/field";
import { add01, hourglass, puzzle, refresh } from "@/components/ui/icons";
import { MasterApiError } from "@/lib/account/api";
import * as mods from "@/lib/account/mods-api";
import type {
  ModAttestation,
  ModRedistribution,
  ModSafety,
} from "@/lib/account/mods-api";

import styles from "./mods-panel.module.css";

const SAFETY_OPTIONS: { value: ModSafety; label: string }[] = [
  { value: "verified", label: "Verified: I read these bytes" },
  { value: "blocked", label: "Blocked: never install these bytes" },
];

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
  const { token, data, error, setError, loading, reload } = useAdminData(load);

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
        `“${displayName.trim()}” recorded as ${created.safety}, redistribution ${created.redistribution}. Launchers pick it up on their next attest call.`,
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
      await mods.revokeModAttestation(token, target.sha256, revokeReason.trim());
      // The revoke answers 204, so there is no row to splice back — reload the list.
      reload();
      setNotice(
        `“${target.displayName}” is now blocked. No launcher release is needed. The verdict flips on the next attest call.`,
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
    <AdminPanel
      title="Mod whitelist"
      icon={puzzle}
      brackets
      actions={
        <SearchBox
          value={input}
          onChange={setInput}
          placeholder="Search name or SHA-256…"
          label="Search the mod whitelist by name or hash"
          maxLength={128}
        />
      }
      footnote={
        <>
          The platform stores a verdict, never a file: the bytes stay with the server that hosts them.
          An unknown hash is a valid answer and the common one. An unverified package may carry inert
          data only (.archive, .tweak, .xl, engine config), while .dll, .reds, CET Lua and .asi are
          refused until that exact hash is verified here.
        </>
      }
    >
      <Notice kind="info" title="Two answers, never one.">
        <em>Safety</em> says we read these exact bytes and they are what they claim. <em>Redistribution</em> says
        whether the author permits a server to hand the file to players. A mod can be safe and still refused, and a
        refusal sends the player to the author&apos;s own page instead. Open77 hosts no mod file either way.
      </Notice>

      <ErrorStrip message={error} />
      <SuccessStrip message={notice} />

      <Toolbar>
        <Button href="/admin/mods/requests" size="sm" color="neutral" border lines="none" icon={hourglass} iconPosition="left">
          Review queue
        </Button>
        <ToolbarGroup>
          {data ? (
            <Count>
              {data.length} {data.length === 1 ? "entry" : "entries"}
            </Count>
          ) : null}
          <Button size="sm" color="neutral" border lines="none" icon={refresh} iconPosition="left" onClick={reload} disabled={loading}>
            Refresh
          </Button>
          {!formOpen ? (
            <Button
              size="sm"
              color="red"
              lines="none"
              icon={add01}
              iconPosition="left"
              onClick={() => {
                setFormOpen(true);
                setRevokeTarget(null);
              }}
            >
              Whitelist a hash
            </Button>
          ) : null}
        </ToolbarGroup>
      </Toolbar>

      {formOpen ? (
        <FormPanel title="Whitelist a hash" onSubmit={onCreate}>
          <FormGrid>
            <Span>
              <Field
                label="SHA-256 of the package"
                hint={hashLooksRight ? "Hash the archive the server hosts, not an unpacked file. Case and spacing are normalised." : undefined}
                error={hashLooksRight ? undefined : `That is not a SHA-256: 64 hex characters expected, ${normalizedHash.length} given.`}
              >
                <Input
                  value={sha256}
                  onChange={(event) => setSha256(event.target.value)}
                  placeholder="64 hexadecimal characters"
                  spellCheck={false}
                  autoComplete="off"
                  className={styles.mono}
                  required
                />
              </Field>
            </Span>
            <Field label="Display name">
              <Input
                value={displayName}
                onChange={(event) => setDisplayName(event.target.value)}
                placeholder="As the author titles it"
                maxLength={160}
                required
              />
            </Field>
            <Field label="Author" optional>
              <Input value={author} onChange={(event) => setAuthor(event.target.value)} maxLength={160} />
            </Field>
            <Span>
              <Field
                label="Source page"
                hint={sourceLooksRight ? "The author’s own page. Kept for provenance, and where a refused mod sends the player." : undefined}
                error={sourceLooksRight ? undefined : "Only absolute http:// or https:// links are stored."}
              >
                <Input
                  value={sourceUrl}
                  onChange={(event) => setSourceUrl(event.target.value)}
                  placeholder="https://www.nexusmods.com/…"
                  type="url"
                  inputMode="url"
                  spellCheck={false}
                />
              </Field>
            </Span>
            <Field label="Safety: the bytes">
              <Select value={safety} onChange={(event) => setSafety(event.target.value as ModSafety)}>
                {SAFETY_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Redistribution: the licence">
              <Select value={redistribution} onChange={(event) => setRedistribution(event.target.value as ModRedistribution)}>
                {REDISTRIBUTION_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </Select>
            </Field>
            <Span>
              <Field label="Reviewer note" optional>
                <Input
                  value={note}
                  onChange={(event) => setNote(event.target.value)}
                  placeholder="What you checked, and where the licence answer came from"
                  maxLength={512}
                />
              </Field>
            </Span>
          </FormGrid>
          <FormActions>
            <Button type="submit" size="sm" color="red" lines="none" busy={busy} disabled={!canSubmit}>
              {busy ? "Working…" : "Record verdict"}
            </Button>
            <Button
              size="sm"
              color="neutral"
              border
              lines="none"
              onClick={() => {
                setFormOpen(false);
                resetForm();
              }}
            >
              Cancel
            </Button>
          </FormActions>
        </FormPanel>
      ) : null}

      {revokeTarget ? (
        <FormPanel title={`Revoke ${revokeTarget.displayName}`} onSubmit={onRevoke} danger>
          <p className={styles.explain}>
            Revoking <strong>{revokeTarget.displayName}</strong> flips its safety to <strong>blocked</strong>. Every
            launcher learns on its next attest call; no launcher release is involved.
          </p>
          <Field label="Reason" hint="Recorded against the entry and in the audit log.">
            <Input
              value={revokeReason}
              onChange={(event) => setRevokeReason(event.target.value)}
              maxLength={512}
              required
            />
          </Field>
          <FormActions>
            <Button type="submit" size="sm" color="red" lines="none" busy={busy} disabled={revokeReason.trim().length === 0}>
              {busy ? "Working…" : "Confirm and block this hash"}
            </Button>
            <Button
              size="sm"
              color="neutral"
              border
              lines="none"
              onClick={() => {
                setRevokeTarget(null);
                setRevokeReason("");
              }}
            >
              Cancel
            </Button>
          </FormActions>
        </FormPanel>
      ) : null}

      {loading && !data ? <LoadingBlock label="Loading the whitelist" /> : null}
      {data && data.length === 0 ? (
        <EmptyBlock icon={puzzle}>
          {query
            ? `No entry matches “${query}”.`
            : "Nothing is whitelisted yet. Every hash is unknown, and unknown packages carry inert data only."}
        </EmptyBlock>
      ) : null}

      {data && data.length > 0 ? (
        <AdminTable caption="Mod whitelist by SHA-256" minWidth="62rem">
          <thead>
            <tr>
              <th scope="col">SHA-256</th>
              <th scope="col">Mod / source</th>
              <th scope="col">Safety</th>
              <th scope="col">Redistribution</th>
              <th scope="col">Reviewed</th>
              <th scope="col">State</th>
              <th scope="col" className={cell.actions}>
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
                active={revokeTarget?.sha256 === row.sha256}
                onRevoke={() => {
                  setFormOpen(false);
                  setRevokeReason("");
                  setRevokeTarget(row);
                }}
              />
            ))}
          </tbody>
        </AdminTable>
      ) : null}
    </AdminPanel>
  );
}

function AttestationRow({
  row,
  busy,
  active,
  onRevoke,
}: {
  row: ModAttestation;
  busy: boolean;
  active: boolean;
  onRevoke: () => void;
}) {
  const revoked = row.revokedAtUtc !== null;
  const reviewer = row.reviewerEmail ?? (row.reviewerAccountId ? shortId(row.reviewerAccountId) : null);

  return (
    <tr className={revoked ? cell.muted : active ? cell.active : undefined}>
      <td className={cell.nowrap}>
        <HashCell sha256={row.sha256} />
      </td>
      <td className={styles.mod}>
        <Primary>{row.displayName}</Primary>
        <Sub>{row.author ?? "author unknown"}</Sub>
        <span className={styles.sourceCell}>
          <SourceCell url={row.sourceUrl} />
        </span>
      </td>
      <td>
        <SafetyChip safety={row.safety} />
      </td>
      <td>
        <RedistributionTag value={row.redistribution} />
      </td>
      <td className={cell.nowrap}>
        <Mono tone="dim">{formatDateTime(row.reviewedAtUtc)}</Mono>
        <Sub>{reviewer ?? "—"}</Sub>
      </td>
      <td>
        {row.revokedAtUtc !== null ? (
          <Stack>
            <StatusTag status="danger">revoked</StatusTag>
            <Sub>
              {formatDateTime(row.revokedAtUtc)}
              {row.revokedByEmail ? ` · ${row.revokedByEmail}` : ""}
            </Sub>
            {row.revokedReason ? <Sub plain>{row.revokedReason}</Sub> : null}
          </Stack>
        ) : (
          <StatusTag status="ok">live</StatusTag>
        )}
      </td>
      <td className={cell.actions}>
        {revoked ? null : (
          <Button size="sm" color="red" border lines="none" disabled={busy} onClick={onRevoke}>
            Revoke
          </Button>
        )}
      </td>
    </tr>
  );
}
