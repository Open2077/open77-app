"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";

import { Button } from "@/components/admin/admin-button";
import { Chip } from "@/components/ui/chip";
import type { DialogHandle } from "@/components/ui/dialog";
import { Loader } from "@/components/ui/feedback";
import { Checkbox, Field, Textarea } from "@/components/ui/field";
import { beaker, refresh, tick02 } from "@/components/ui/icons";
import { MasterApiError } from "@/lib/account/api";
import * as beta from "@/lib/account/ncwe-beta-api";
import type { AdminNcweBetaDecision, AdminNcweBetaRow, NcweBetaStatusValue } from "@/lib/account/ncwe-beta-api";
import {
  AdminPanel,
  AdminTable,
  EmptyBlock,
  Filters,
  Footnote,
  GuardedDialog,
  LoadingBlock,
  Mono,
  Pager,
  Primary,
  SearchBox,
  Stack,
  StatusTag,
  Sub,
  SuccessStrip,
  SubHeading,
  Toolbar,
  cell,
} from "./admin-kit";
import { ArmButton } from "./arm-button";
import { formatDateTime, safeHttpUrl } from "./format";
import { ErrorStrip, useAdminData } from "./use-admin-data";

import styles from "./ncwe-beta-panel.module.css";

type Filter = NcweBetaStatusValue | "all";
const STATUS_LABEL: Record<NcweBetaStatusValue, string> = { pending: "Pending", approved: "Accepted", rejected: "Declined" };
const STATUS_TAG: Record<NcweBetaStatusValue, "warn" | "ok" | "danger"> = { pending: "warn", approved: "ok", rejected: "danger" };
const DEFAULT_AVATAR = "https://cdn.discordapp.com/embed/avatars/0.png";

/** Discord CDN avatars only: the URL comes from the master, which built it from Discord's answer. */
function avatar(url: string | null): string {
  return url && url.startsWith("https://cdn.discordapp.com/") ? url : DEFAULT_AVATAR;
}

function snowflakeDate(id: string): string | null {
  try { return new Date(Number((BigInt(id) >> 22n) + 1420070400000n)).toISOString(); } catch { return null; }
}

function outcome(decision: AdminNcweBetaDecision, verb: string): string {
  const row = decision.row;
  const who = `${row.displayName} (@${row.application.discord.username})`;
  if (decision.discordState === "failed") return `${verb} ${who}, but Discord failed: ${decision.discordError ?? "unknown error"}. Open the application to retry.`;
  if (verb === "Accepted" && decision.discordState === "done") return `Accepted ${who}: NCWE Preview role given on Discord.`;
  if (verb === "Declined" && decision.discordState === "done") return `Declined ${who}: the Discord role was taken back.`;
  return `${verb} ${who}.`;
}

function DiscordAvatar({ url, size }: { url: string | null; size: number }) {
  return (
    // eslint-disable-next-line @next/next/no-img-element -- Discord CDN avatar
    <img className={styles.avatar} src={avatar(url)} alt="" width={size} height={size} referrerPolicy="no-referrer" />
  );
}

export function NcweBetaPanel() {
  const [input, setInput] = useState("");
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<Filter>("pending");
  const [page, setPage] = useState(1);
  const [selection, setSelection] = useState<AdminNcweBetaRow | null>(null);
  const [note, setNote] = useState("");
  const [announce, setAnnounce] = useState(true);
  const [busy, setBusy] = useState(false);
  const [mutationError, setMutationError] = useState<string | null>(null);
  const [notice, setNotice] = useState("");
  const inFlight = useRef(false);
  const dialog = useRef<DialogHandle>(null);
  useEffect(() => {
    const timer = setTimeout(() => { setQuery(input.trim()); setPage(1); }, 350);
    return () => clearTimeout(timer);
  }, [input]);
  useEffect(() => {
    if (selection) dialog.current?.open();
    else dialog.current?.close();
  }, [selection]);
  const load = useCallback((token: string) => beta.adminNcweBeta(token, filter === "all" ? undefined : filter, query, page), [filter, query, page]);
  const { token, data, error, loading, reload } = useAdminData(load);

  function open(row: AdminNcweBetaRow) {
    setNote(row.application.decisionNote ?? ""); setAnnounce(true); setMutationError(null); setSelection(row);
  }

  async function run(action: (token: string, row: AdminNcweBetaRow) => Promise<AdminNcweBetaDecision>, verb: string) {
    if (!selection || !token || inFlight.current) return;
    const row = selection;
    inFlight.current = true; setBusy(true); setMutationError(null);
    try {
      const decision = await action(token, row);
      setNotice(outcome(decision, verb));
      // A Discord failure keeps the application open on screen, with its retry button.
      if (decision.discordState === "failed") { setSelection(decision.row); setMutationError(decision.discordError ?? "Discord failed."); }
      else setSelection(null);
      reload();
    } catch (err) {
      setMutationError(err instanceof MasterApiError ? err.message : "The request failed. Refresh the list to check the current state.");
      if (err instanceof MasterApiError && err.code === "application_changed") reload();
    } finally { inFlight.current = false; setBusy(false); }
  }

  const decide = (decision: "approve" | "reject" | "reopen", verb: string) => run((t, row) =>
    beta.decideNcweBeta(t, row.application.accountId, decision, { revision: row.application.revision, note, announce }), verb);
  const pages = data ? Math.max(1, Math.ceil(data.total / data.pageSize)) : 1;
  const counts: Record<Filter, number | undefined> = { pending: data?.pending, approved: data?.approved, rejected: data?.rejected,
    all: data ? data.pending + data.approved + data.rejected : undefined };
  const current = selection?.application;
  const created = current ? snowflakeDate(current.discord.userId) : null;

  return (
    <>
      <AdminPanel
        title="NCWE closed beta"
        icon={beaker}
        brackets
        actions={
          <SearchBox value={input} onChange={setInput} placeholder="Search e-mail, name, Discord user or ID…" label="Search NCWE beta applications" maxLength={96} />
        }
        footnote="Every decision is recorded in the audit log with its author. The Discord account was checked on the server when the applicant confirmed it and again when they submitted."
      >
        <Footnote>
          Applications from <Link href="/ncwe">/ncwe</Link>. Accepting gives the Discord account the NCWE Preview role and
          posts a welcome tagging the member; declining an accepted application takes the role back. Notes are shown to the
          applicant.
        </Footnote>
        <Toolbar>
          <Filters label="Filter applications">
            {([["pending", "Pending"], ["approved", "Accepted"], ["rejected", "Declined"], ["all", "All"]] as const).map(([value, label]) => (
              <Chip key={value} pressed={filter === value} count={counts[value]} onClick={() => { setFilter(value); setPage(1); }}>
                {label}
              </Chip>
            ))}
          </Filters>
          <Button size="sm" color="neutral" border lines="none" icon={refresh} iconPosition="left" disabled={loading} onClick={reload}>
            Refresh list
          </Button>
        </Toolbar>
        <ErrorStrip message={error} />
        <SuccessStrip message={notice} />
        {loading && !data ? <LoadingBlock label="Loading applications…" /> : null}
        {data && !data.items.length ? (
          <EmptyBlock icon={beaker}>{filter === "pending" && !query ? "No application is waiting for review." : "No application matches."}</EmptyBlock>
        ) : null}
        {data?.items.length ? (
          <AdminTable caption="NCWE beta applications" minWidth="64rem">
            <thead>
              <tr>
                <th>Account</th>
                <th>Discord</th>
                <th>Why NCWE</th>
                <th>Sent</th>
                <th>Status</th>
                <th className={cell.actions}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {data.items.map(row => {
                const app = row.application;
                return (
                  <tr key={app.accountId} className={selection?.application.accountId === app.accountId ? cell.active : undefined}>
                    <td>
                      <Primary>{row.displayName}</Primary>
                      <Sub>{row.email}{row.emailVerified ? "" : " · unverified"}</Sub>
                    </td>
                    <td>
                      <span className={styles.who}>
                        <DiscordAvatar url={app.discord.avatarUrl} size={32} />
                        <span>
                          <Primary>{app.discord.displayName || app.discord.username}</Primary>
                          <Sub>@{app.discord.username}</Sub>
                        </span>
                      </span>
                    </td>
                    <td>
                      <span className={styles.excerpt}>{app.motivation}</span>
                    </td>
                    <td className={cell.nowrap}>
                      <Mono tone="dim">{formatDateTime(app.createdAtUtc)}</Mono>
                    </td>
                    <td>
                      <Stack>
                        <StatusTag status={STATUS_TAG[app.status]}>{STATUS_LABEL[app.status]}</StatusTag>
                        {row.discordState === "failed" ? <StatusTag status="danger">Discord failed</StatusTag> : null}
                      </Stack>
                    </td>
                    <td className={cell.actions}>
                      <Button size="sm" color="neutral" border lines="none" disabled={busy} onClick={() => open(row)}>
                        Review
                      </Button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </AdminTable>
        ) : null}
        {data ? (
          <Pager
            summary={`${data.total} applications · page ${data.page} of ${pages}`}
            previous={{ disabled: loading || page <= 1, onClick: () => setPage(page - 1) }}
            next={{ disabled: loading || page >= pages, onClick: () => setPage(page + 1) }}
          />
        ) : null}
      </AdminPanel>

      <GuardedDialog
        ref={dialog}
        size="lg"
        eyebrow={current ? <>NCWE beta · <span className={styles.eyebrowStatus}>{STATUS_LABEL[current.status]}</span></> : "NCWE beta"}
        title={selection?.displayName ?? "Application"}
        locked={() => inFlight.current}
        onClose={() => setSelection(null)}
        footer={
          current && selection ? (
            <>
              <Button size="sm" color="neutral" border lines="none" disabled={busy} onClick={() => setSelection(null)}>
                Close
              </Button>
              {current.status === "rejected" ? (
                <Button size="sm" color="neutral" border lines="none" disabled={busy || !token} onClick={() => void decide("reopen", "Reopened")}>
                  Back to pending
                </Button>
              ) : null}
              {current.status === "approved" && selection.discordState === "failed" ? (
                <Button size="sm" color="red" lines="none" disabled={busy || !token}
                  onClick={() => void run((t, row) => beta.retryNcweDiscord(t, row.application.accountId, true), "Retried Discord for")}>
                  Retry Discord
                </Button>
              ) : null}
              {current.status !== "rejected" ? (
                <ArmButton
                  label={current.status === "approved" ? "Withdraw access" : "Decline"}
                  confirmLabel={current.status === "approved" ? "Confirm: take the role back" : "Confirm decline"}
                  disabled={busy || !token}
                  onConfirm={() => void decide("reject", "Declined")}
                />
              ) : null}
              {current.status !== "approved" ? (
                <Button size="sm" color="red" lines="none" icon={tick02} iconPosition="left" disabled={busy || !token} onClick={() => void decide("approve", "Accepted")}>
                  Accept & give the role
                </Button>
              ) : null}
            </>
          ) : null
        }
      >
        {selection && current ? (
          <div className={styles.review}>
            <div className={styles.cards}>
              <section className={styles.card} aria-label="OPEN//77 account">
                <SubHeading>OPEN//77 account</SubHeading>
                <Primary>{selection.displayName}</Primary>
                <Sub>{selection.email} · {selection.emailVerified ? "verified" : "not verified"}</Sub>
                <Sub>{selection.role} · {selection.accountStatus} · since {formatDateTime(selection.accountCreatedAtUtc)}</Sub>
                <Sub>{current.accountId}</Sub>
              </section>
              <section className={styles.card} aria-label="Discord account">
                <SubHeading>Discord</SubHeading>
                <span className={styles.who}>
                  <DiscordAvatar url={current.discord.avatarUrl} size={48} />
                  <span>
                    <Primary>{current.discord.displayName || current.discord.username}</Primary>
                    <Sub>@{current.discord.username} · {current.discord.userId}</Sub>
                  </span>
                </span>
                <Sub plain>
                  {current.discord.joinedServerAtUtc ? `On the server since ${formatDateTime(current.discord.joinedServerAtUtc)}` : "Join date unknown"}
                  {created ? ` · account created ${formatDateTime(created)}` : ""}
                </Sub>
              </section>
            </div>
            <dl className={styles.answers}>
              <div><dt>Why NCWE</dt><dd>{current.motivation}</dd></div>
              <div><dt>First build</dt><dd>{current.plans}</dd></div>
              <div><dt>Experience</dt><dd>{current.experience}</dd></div>
              <div><dt>Time for the beta</dt><dd>{beta.NCWE_AVAILABILITY.find(([value]) => value === current.availability)?.[1] ?? current.availability}</dd></div>
              {current.portfolioUrl ? (
                <div>
                  <dt>Portfolio</dt>
                  <dd>
                    {safeHttpUrl(current.portfolioUrl)
                      ? <a href={safeHttpUrl(current.portfolioUrl)!} target="_blank" rel="noopener noreferrer nofollow">{current.portfolioUrl}</a>
                      : current.portfolioUrl}
                  </dd>
                </div>
              ) : null}
              <div>
                <dt>Submitted</dt>
                <dd>
                  {formatDateTime(current.createdAtUtc)}
                  {current.status === "pending" && current.updatedAtUtc !== current.createdAtUtc ? ` · edited ${formatDateTime(current.updatedAtUtc)}` : ""}
                  {" · "}revision {current.revision}
                </dd>
              </div>
            </dl>
            {current.decidedAtUtc ? (
              <div className={styles.decision} data-failed={selection.discordState === "failed"}>
                {STATUS_LABEL[current.status]} {current.decidedAtUtc ? formatDateTime(current.decidedAtUtc) : ""}{selection.decidedByName ? ` by ${selection.decidedByName}` : ""}.
                {selection.discordState ? (
                  <>
                    {" "}Discord: <strong>{selection.discordState}</strong>{selection.discordError ? ` (${selection.discordError})` : ""}
                    {selection.discordDoneAtUtc && selection.discordState === "done" ? `, ${formatDateTime(selection.discordDoneAtUtc)}` : ""}.
                  </>
                ) : null}
              </div>
            ) : null}
            <form className={styles.form} onSubmit={e => e.preventDefault()}>
              <Field label="Note to the applicant" optional hint="Shown on their /ncwe page.">
                <Textarea
                  value={note}
                  onChange={e => setNote(e.target.value)}
                  maxLength={beta.NCWE_LIMITS.noteMax}
                  rows={3}
                  placeholder="Welcome aboard! Builds, news and feedback are in the NCWE channels on Discord."
                  disabled={busy}
                />
              </Field>
              {current.status !== "approved" ? (
                <Checkbox checked={announce} disabled={busy} onChange={e => setAnnounce(e.target.checked)}>
                  Post the welcome message on Discord, tagging the member
                </Checkbox>
              ) : null}
            </form>
            <ErrorStrip message={mutationError} />
            {busy ? <Loader label="Saving decision and updating Discord…" /> : null}
          </div>
        ) : null}
      </GuardedDialog>
    </>
  );
}
