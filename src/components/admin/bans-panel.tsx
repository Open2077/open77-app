"use client";

import { type FormEvent, useCallback, useState } from "react";

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
  Span,
  Stack,
  StatusTag,
  Sub,
  cell,
} from "@/components/admin/admin-kit";
import { ArmButton } from "@/components/admin/arm-button";
import { formatDateTime, shortId } from "@/components/admin/format";
import { ErrorStrip, useAdminData } from "@/components/admin/use-admin-data";
import { Button } from "@/components/admin/admin-button";
import { Chip } from "@/components/ui/chip";
import { Field, Input, Select } from "@/components/ui/field";
import { add01, userBlock01 } from "@/components/ui/icons";
import { MasterApiError } from "@/lib/account/api";
import * as admin from "@/lib/account/admin-api";
import type { BanScope, BanSubjectKind } from "@/lib/account/admin-api";

import styles from "./bans-panel.module.css";

const SUBJECT_KINDS: { value: BanSubjectKind; label: string; placeholder: string }[] = [
  { value: "account", label: "Account", placeholder: "Account ID (GUID)" },
  { value: "identity", label: "Game identity", placeholder: "Identity GUID" },
  { value: "identity_key", label: "Identity key", placeholder: "Public-key hash (hex)" },
  { value: "license", label: "License", placeholder: "License ID (GUID)" },
];

/** Central bans: enforced at ticket issuance, so a ban lands on the next join. */
export function BansPanel() {
  const [includeLifted, setIncludeLifted] = useState(false);
  const [busy, setBusy] = useState(false);
  const [formOpen, setFormOpen] = useState(false);
  const [scope, setScope] = useState<BanScope>("global");
  const [serverId, setServerId] = useState("");
  const [subjectKind, setSubjectKind] = useState<BanSubjectKind>("account");
  const [subjectValue, setSubjectValue] = useState("");
  const [reason, setReason] = useState("");
  const [expires, setExpires] = useState("");

  const load = useCallback(
    (token: string) => admin.bans(token, { includeLifted }),
    [includeLifted],
  );
  const { token, data, error, setError, loading, reload } = useAdminData(load);

  async function onCreate(event: FormEvent) {
    event.preventDefault();
    if (!token) return;
    setBusy(true);
    setError(null);
    try {
      await admin.createBan(token, {
        scope,
        ...(scope === "server" ? { serverId: serverId.trim() } : {}),
        subjectKind,
        subjectValue: subjectValue.trim(),
        reason: reason.trim(),
        ...(expires ? { expiresAtUtc: new Date(expires).toISOString() } : {}),
      });
      setFormOpen(false);
      setSubjectValue("");
      setReason("");
      setExpires("");
      reload();
    } catch (err) {
      setError(err instanceof MasterApiError ? err.message : "Request failed. Try again.");
    } finally {
      setBusy(false);
    }
  }

  async function lift(banId: string) {
    if (!token) return;
    setBusy(true);
    setError(null);
    try {
      await admin.liftBan(token, banId);
      reload();
    } catch (err) {
      setError(err instanceof MasterApiError ? err.message : "Request failed. Try again.");
    } finally {
      setBusy(false);
    }
  }

  const kindMeta = SUBJECT_KINDS.find((kind) => kind.value === subjectKind)!;

  return (
    <AdminPanel
      title="Bans"
      icon={userBlock01}
      brackets
      meta={data ? <Count>{data.length} {includeLifted ? "issued" : "active"}</Count> : undefined}
      actions={
        <>
          <Chip size="sm" pressed={includeLifted} onClick={() => setIncludeLifted((value) => !value)}>
            Show lifted
          </Chip>
          {!formOpen ? (
            <Button size="sm" color="red" lines="none" icon={add01} iconPosition="left" onClick={() => setFormOpen(true)}>
              New ban
            </Button>
          ) : null}
        </>
      }
      footnote={
        <>
          Bans are enforced when the master issues connect tickets: they take effect on the subject&apos;s
          next join, with the reason shown in their game client.
        </>
      }
    >
      <ErrorStrip message={error} />

      {formOpen ? (
        <FormPanel title="Issue a ban" onSubmit={onCreate} danger>
          <FormGrid>
            <Field label="Scope">
              <Select value={scope} onChange={(event) => setScope(event.target.value as BanScope)}>
                <option value="global">Global: whole platform</option>
                <option value="server">Single server</option>
              </Select>
            </Field>
            {scope === "server" ? (
              <Field label="Server ID">
                <Input
                  value={serverId}
                  onChange={(event) => setServerId(event.target.value)}
                  placeholder="Server GUID"
                  spellCheck={false}
                  className={styles.mono}
                  required
                />
              </Field>
            ) : null}
            <Field label="Subject kind">
              <Select value={subjectKind} onChange={(event) => setSubjectKind(event.target.value as BanSubjectKind)}>
                {SUBJECT_KINDS.map((kind) => (
                  <option key={kind.value} value={kind.value}>
                    {kind.label}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Subject">
              <Input
                value={subjectValue}
                onChange={(event) => setSubjectValue(event.target.value)}
                placeholder={kindMeta.placeholder}
                spellCheck={false}
                className={styles.mono}
                required
              />
            </Field>
            <Field label="Expires" optional hint="Leave empty for a permanent ban.">
              <Input type="datetime-local" value={expires} onChange={(event) => setExpires(event.target.value)} />
            </Field>
            <Span>
              <Field label="Reason" hint="Shown to the banned player at ticket time.">
                <Input
                  value={reason}
                  onChange={(event) => setReason(event.target.value)}
                  maxLength={512}
                  required
                />
              </Field>
            </Span>
          </FormGrid>
          <FormActions>
            <Button
              type="submit"
              size="sm"
              color="red"
              lines="none"
              busy={busy}
              disabled={subjectValue.trim().length === 0 || reason.trim().length === 0}
            >
              {busy ? "Working…" : "Issue ban"}
            </Button>
            <Button size="sm" color="neutral" border lines="none" onClick={() => setFormOpen(false)}>
              Cancel
            </Button>
          </FormActions>
        </FormPanel>
      ) : null}

      {loading && !data ? <LoadingBlock label="Loading bans" /> : null}
      {data && data.length === 0 ? (
        <EmptyBlock icon={userBlock01}>{includeLifted ? "No ban has ever been issued." : "No active ban."}</EmptyBlock>
      ) : null}
      {data && data.length > 0 ? (
        <AdminTable caption="Bans" minWidth="60rem">
          <thead>
            <tr>
              <th>Scope</th>
              <th>Subject</th>
              <th>Reason</th>
              <th>Issued</th>
              <th>Expires</th>
              <th className={cell.actions}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {data.map((ban) => (
              <tr key={ban.banId} className={ban.liftedAtUtc ? cell.muted : undefined}>
                <td>
                  <Stack>
                    <StatusTag status={ban.scope === "global" ? "danger" : "neutral"}>{ban.scope}</StatusTag>
                    {ban.serverId ? <Sub title={ban.serverId}>server {shortId(ban.serverId)}</Sub> : null}
                  </Stack>
                </td>
                <td>
                  <Mono tone="dim">{ban.subjectKind}</Mono>
                  <Sub>{ban.subjectValue}</Sub>
                </td>
                <td className={cell.wrap}>
                  <span className={styles.reason}>{ban.reason}</span>
                </td>
                <td className={cell.nowrap}>
                  <Mono tone="dim">{formatDateTime(ban.issuedAtUtc)}</Mono>
                </td>
                <td className={cell.nowrap}>
                  {ban.liftedAtUtc ? (
                    <Stack>
                      <StatusTag status="neutral">lifted</StatusTag>
                      <Sub>{formatDateTime(ban.liftedAtUtc)}</Sub>
                    </Stack>
                  ) : ban.expiresAtUtc ? (
                    <Mono tone="dim">{formatDateTime(ban.expiresAtUtc)}</Mono>
                  ) : (
                    <Mono>never</Mono>
                  )}
                </td>
                <td className={cell.actions}>
                  {ban.liftedAtUtc ? null : (
                    <ArmButton label="Lift" confirmLabel="Confirm lift?" disabled={busy} onConfirm={() => lift(ban.banId)} />
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </AdminTable>
      ) : null}
    </AdminPanel>
  );
}
