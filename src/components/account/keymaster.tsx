"use client";

import { type FormEvent, type ReactNode, useCallback, useEffect, useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import { cx } from "@/components/ui/cx";
import { EmptyState, Notice } from "@/components/ui/feedback";
import { Field, Input, Select } from "@/components/ui/field";
import { Icon } from "@/components/ui/icon";
import { add01, copy01, key01, serverStack01, tag01, tick02, refresh } from "@/components/ui/icons";
import { Panel } from "@/components/ui/panel";
import { Display, Eyebrow } from "@/components/ui/typography";
import * as master from "@/lib/account/api";
import { type CreatedLicense, MasterApiError } from "@/lib/account/api";
import { type StoredSession, useSession } from "@/lib/account/session";
import * as owners from "@/lib/account/server-owner-api";
import { plainLauncherText } from "@/lib/launcher-text";
import { LicenseCard } from "./license-card";
import { ArrowLink, Block, ConfirmDialog, Glyph, Pager, Pending } from "./kit";

import styles from "./keymaster.module.css";

/** Copy with a per-target "copied" flash; clipboard failures fall back to the legacy copy command. */
function useCopy() {
  const [copied, setCopied] = useState<string | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const copy = useCallback(async (id: string, text: string) => {
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      // Older engines / non-secure contexts: the legacy path still works.
      const area = document.createElement("textarea");
      area.value = text;
      area.style.position = "fixed";
      area.style.opacity = "0";
      document.body.append(area);
      area.select();
      document.execCommand("copy");
      area.remove();
    }
    setCopied(id);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => setCopied(null), 1800);
  }, []);

  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
    },
    [],
  );

  return { copied, copy };
}

function configSnippet(key: string): string {
  return ["{", '  "masterServer": {', `    "licenseKey": "${key}"`, "  }", "}"].join("\n");
}

function CopyAction({ active, label, onClick }: { active: boolean; label: string; onClick: () => void }) {
  return (
    <button type="button" className={cx(styles.copy, active && styles.copied)} onClick={onClick}>
      <Icon glyph={active ? tick02 : copy01} />
      <span aria-live="polite">{active ? "Copied" : label}</span>
    </button>
  );
}

/**
 * Shown when a dedicated server launched without a key sent its operator here
 * (`?source=server-launch`), before and after sign-in.
 */
export function ServerLaunchBrief({ children }: { children?: ReactNode }) {
  return (
    <Panel as="section" variant="outline" padding="md" className={styles.brief} aria-label="Server launch">
      <div className={styles.briefHead}>
        <Glyph glyph={serverStack01} />
        <div className={styles.briefCopy}>
          <Eyebrow>Server launch</Eyebrow>
          <h2 className={styles.briefTitle}>Your server needs a license key</h2>
        </div>
      </div>
      {children}
    </Panel>
  );
}

/**
 * The keymaster: every server license key of the account, FiveM-style.
 *
 * The one moment that matters here is creation: the raw op77_live_ key exists
 * in the browser exactly once, so the reveal block stays on screen until the
 * owner dismisses it deliberately, carries its own copy button, and shows the
 * exact `server.jsonc` lines the key goes into.
 */
export function Keymaster({ session, serverLaunch }: { session: StoredSession; serverLaunch: boolean }) {
  const { clear } = useSession();
  const { copied, copy } = useCopy();
  const [workspace, setWorkspace] = useState<owners.OwnerLicenseWorkspace | null>(null);
  const licenses = workspace?.licenses ?? null;
  const quota = workspace?.quota;
  const [filter, setFilter] = useState("active");
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);
  const [notice, setNotice] = useState("");
  const inFlight = useRef(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const [createOpen, setCreateOpen] = useState(serverLaunch);
  const [label, setLabel] = useState(serverLaunch ? "My server" : "");
  const [created, setCreated] = useState<CreatedLicense | null>(null);
  const [revoking, setRevoking] = useState<owners.OwnerLicense | null>(null);
  const [revokeError, setRevokeError] = useState<string | null>(null);

  const emailVerified = session.emailVerified;

  useEffect(() => {
    let cancelled = false;
    owners
      .licenseWorkspace(session.token)
      .then((result) => {
        if (!cancelled) setWorkspace(result);
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        if (err instanceof MasterApiError && err.status === 401) clear();
        else setError(err instanceof MasterApiError ? err.message : "Could not load your keys.");
      });
    return () => {
      cancelled = true;
    };
  }, [session.token, clear]);

  async function reloadWorkspace() {
    if (inFlight.current) return;
    inFlight.current = true; setBusy(true); setError(null);
    try { setWorkspace(await owners.licenseWorkspace(session.token)); }
    catch (err) { setError(err instanceof MasterApiError ? err.message : "Could not refresh your workspace."); }
    finally { inFlight.current = false; setBusy(false); }
  }

  async function submitAnnouncement(licenseId: string, profile: owners.UpcomingServerProfile, revision: number) {
    if (inFlight.current) throw new Error("Please wait for the current action.");
    inFlight.current = true; setBusy(true); setNotice("");
    try {
      setWorkspace(await owners.submitUpcoming(session.token, licenseId, profile, revision));
      setNotice("Announcement submitted for staff review. You can follow its status below.");
    } finally { inFlight.current = false; setBusy(false); }
  }

  async function onCreate(event: FormEvent) {
    event.preventDefault();
    if (inFlight.current || !canCreate) return;
    inFlight.current = true;
    setError(null);
    setBusy(true);
    try {
      const license = await master.createLicense(session.token, label.trim());
      setCreated(license);
      setCreateOpen(false);
      setLabel("");
      setWorkspace(current => current ? {
        licenses: [{ licenseId: license.licenseId, label: license.label, keyHint: license.keyHint, createdAtUtc: license.createdAtUtc, revokedAtUtc: null, lastServer: null, upcoming: null }, ...current.licenses],
        quota: { ...current.quota, active: current.quota.active + 1, createdToday: current.quota.createdToday + 1 },
      } : current);
      setFilter("active"); setQuery(""); setPage(1);
      setWorkspace(await owners.licenseWorkspace(session.token));
    } catch (err) {
      setError(err instanceof MasterApiError ? err.message : "Could not create the key.");
    } finally {
      inFlight.current = false;
      setBusy(false);
    }
  }

  async function onRevoke() {
    if (!revoking || inFlight.current) return;
    inFlight.current = true;
    const licenseId = revoking.licenseId;
    setRevokeError(null);
    setError(null);
    setBusy(true);
    try {
      await master.revokeLicense(session.token, licenseId);
      const now = new Date().toISOString();
      setWorkspace(current => current ? {
        ...current,
        quota: { ...current.quota, active: Math.max(0, current.quota.active - 1) },
        licenses: current.licenses.map(license => license.licenseId === licenseId ? { ...license, revokedAtUtc: now } : license),
      } : current);
      if (created?.licenseId === licenseId) setCreated(null);
      setRevoking(null);
      setNotice("License revoked. This does not restore today's creation quota.");
      setWorkspace(await owners.licenseWorkspace(session.token));
    } catch (err) {
      setRevokeError(err instanceof MasterApiError ? err.message : "Could not revoke the key.");
    } finally {
      inFlight.current = false;
      setBusy(false);
    }
  }

  const active = quota?.active ?? 0;
  const canCreate = Boolean(emailVerified && quota && active < quota.maximumActive && quota.createdToday < quota.maximumDailyCreations);
  const shown = licenses?.filter(license => (filter === "all" || (filter === "active" ? !license.revokedAtUtc : Boolean(license.revokedAtUtc)))
    && plainLauncherText(`${license.label} ${license.licenseId} ${license.keyHint} ${license.lastServer?.name ?? ""} ${license.lastServer?.serverId ?? ""}`).toLowerCase().includes(query.toLowerCase())) ?? [];
  const pages = Math.max(1, Math.ceil(shown.length / 10));
  const currentPage = Math.min(page, pages);
  const visible = shown.slice((currentPage - 1) * 10, currentPage * 10);

  return (
    <div className={styles.keymaster}>
      {serverLaunch ? (
        <ServerLaunchBrief>
          <p className={styles.briefText}>
            A dedicated server joins the OPEN//77 platform with a license key created here. That key is what ties the server to your
            account in the server browser.
          </p>
          <ol className={styles.steps}>
            <li>
              <span className={styles.stepIndex}>01</span>
              <span>Create a key below and copy it. It is shown only once.</span>
            </li>
            <li>
              <span className={styles.stepIndex}>02</span>
              <span>
                Paste it into the <code>masterServer.licenseKey</code> field of your <code>server.jsonc</code>.
              </span>
            </li>
            <li>
              <span className={styles.stepIndex}>03</span>
              <span>Restart the server; it enrolls with the platform on boot.</span>
            </li>
          </ol>
        </ServerLaunchBrief>
      ) : null}

      {error || (revokeError && !revoking) ? <Notice kind="danger">{error ?? revokeError}</Notice> : null}

      {notice ? <Notice kind="success">{notice}</Notice> : null}
      <div className={styles.quotaGrid} aria-label="License quotas">
        <Panel padding="md"><Eyebrow>Active licenses</Eyebrow><strong>{quota ? `${active} / ${quota.maximumActive}` : "— / 5"}</strong><p>Revoke an unused license to free an active slot.</p></Panel>
        <Panel padding="md"><Eyebrow>Created today · UTC</Eyebrow><strong>{quota ? `${quota.createdToday} / ${quota.maximumDailyCreations}` : "— / 5"}</strong><p>Revoking or deleting keys does not refund creations. Resets at 00:00 UTC{quota ? ` (${new Date(quota.resetsAtUtc).toLocaleString()} your time)` : ""}.</p></Panel>
        <Panel padding="md"><Eyebrow>Upcoming launches</Eyebrow><strong>{licenses?.filter(license => !license.revokedAtUtc && license.upcoming?.status === "pending").length ?? 0} pending</strong><p>One approved announcement per license. Staff approval locks its content.</p></Panel>
      </div>
      {created ? (
        <Panel as="section" brackets padding="lg" className={styles.reveal} aria-label="New license key" data-key-reveal>
          <div className={styles.revealHead}>
            <Eyebrow>Key created</Eyebrow>
            <Display as="h2" size="sm" className={styles.revealTitle}>
              {created.label}
            </Display>
          </div>
          <div className={styles.keyBox}>
            <code className={styles.key}>{created.key}</code>
            <CopyAction active={copied === "key"} label="Copy key" onClick={() => void copy("key", created.key)} />
          </div>
          <Notice kind="warning" title="This key is shown only once.">
            The platform stores a fingerprint, not the key. If you lose it, revoke it and create a new one.
          </Notice>
          <figure className={styles.snippet}>
            <figcaption className={styles.snippetBar}>
              <span className={styles.snippetTitle}>server.jsonc</span>
              <CopyAction active={copied === "snippet"} label="Copy snippet" onClick={() => void copy("snippet", configSnippet(created.key))} />
            </figcaption>
            <pre className={styles.snippetBody}>
              <code>
                {"{\n"}
                {"  "}
                <span className={styles.tokKey}>&quot;masterServer&quot;</span>
                {": {\n"}
                {"    "}
                <span className={styles.tokKey}>&quot;licenseKey&quot;</span>
                {": "}
                <span className={styles.tokStr}>&quot;{created.key}&quot;</span>
                {"\n  }\n}"}
              </code>
            </pre>
          </figure>
          <div>
            <Button lines="none" border color="neutral" icon={tick02} iconPosition="left" onClick={() => setCreated(null)}>
              I saved my key
            </Button>
          </div>
        </Panel>
      ) : null}

      <Block
        id="keys"
        eyebrow={licenses ? `${active} active · ${licenses.length - active} revoked` : "License keys"}
        title="Your server licenses"
        lead="Manage your keys, inspect the last attached server and plan your community's upcoming launch. Revoked licenses are hidden by default."
        actions={
          <div className={styles.cardActions}>
            <Button size="sm" lines="none" border color="neutral" icon={refresh} disabled={busy} busy={busy} onClick={() => void reloadWorkspace()}>Refresh</Button>
            {!createOpen ? <Button lines="none" icon={add01} iconPosition="left" disabled={busy || !canCreate} onClick={() => setCreateOpen(true)}>New license</Button> : null}
          </div>
        }
      >
        {!emailVerified ? (
          <Notice kind="info" title="Verify your e-mail first">
            Creating keys requires a verified e-mail address. <ArrowLink href="/account">Verify your account</ArrowLink>
          </Notice>
        ) : null}

        {emailVerified && quota && !canCreate ? <Notice kind="warning" title={active >= quota.maximumActive ? "Active license limit reached" : "Daily creation limit reached"}>
          {active >= quota.maximumActive ? "You can keep up to 5 active licenses. Revoke an unused license to free a slot." : "You have created 5 licenses today. Even revoked or deleted licenses count. You can create another after 00:00 UTC."}
        </Notice> : null}
        {createOpen ? (
          <form className={styles.create} onSubmit={onCreate} aria-label="Create a license key" data-key-form>
            <Field label="Key label" hint="Only you see the label. Name it after the server it runs.">
              <Input
                icon={tag01}
                value={label}
                onChange={(event) => setLabel(event.target.value)}
                placeholder="What server is this for?"
                maxLength={96}
                autoFocus
                required
              />
            </Field>
            <div className={styles.createActions}>
              <Button key={busy ? "Creating…" : "Create key"} type="submit" icon={key01} busy={busy} disabled={busy || label.trim().length === 0 || !canCreate}>
                {busy ? "Creating…" : "Create key"}
              </Button>
              <Button lines="none" border color="neutral" onClick={() => setCreateOpen(false)}>
                Cancel
              </Button>
            </div>
          </form>
        ) : null}

        <div className={styles.filters}>
          <Field label="License status"><Select value={filter} onChange={event => { setFilter(event.target.value); setPage(1); }}><option value="active">Active licenses</option><option value="revoked">Revoked licenses</option><option value="all">All licenses</option></Select></Field>
          <Field label="Find a license"><Input type="search" value={query} onChange={event => { setQuery(event.target.value); setPage(1); }} placeholder="Label, key hint or last server…" /></Field>
        </div>
        {licenses === null ? (
          error ? null : <Pending label="Loading license workspace" />
        ) : shown.length === 0 ? (
          <div data-empty="keys"><EmptyState eyebrow="Server workspace" title="No licenses in this view">{filter === "active" ? "Create a license to bring your server onto the platform, or use the filter to inspect revoked licenses." : "Change the status filter or search to find a license."}</EmptyState></div>
        ) : <div className={styles.cards}>
          {visible.map(license => <LicenseCard key={`${license.licenseId}:${license.upcoming?.revision ?? 0}:${license.revokedAtUtc ?? ""}`} license={license} disabled={busy || !emailVerified}
            onRevoke={() => { setRevokeError(null); setRevoking(license); }}
            onSubmit={(profile, revision) => submitAnnouncement(license.licenseId, profile, revision)} />)}
        </div>}
        {shown.length > 10 ? <Pager label="License pages">
          <Button size="sm" color="neutral" border lines="none" disabled={busy || currentPage === 1} onClick={() => setPage(currentPage - 1)}>Previous</Button>
          <span>{(currentPage - 1) * 10 + 1}–{Math.min(currentPage * 10, shown.length)} of {shown.length} · page {currentPage} of {pages}</span>
          <Button size="sm" color="neutral" border lines="none" disabled={busy || currentPage === pages} onClick={() => setPage(currentPage + 1)}>Next</Button>
        </Pager> : null}
      </Block>

      <ConfirmDialog
        open={revoking !== null}
        onClose={() => setRevoking(null)}
        eyebrow="Keymaster"
        title={`Revoke ${revoking?.label ?? "this key"}?`}
        confirmLabel="Revoke key"
        busyLabel="Revoking…"
        busy={busy}
        danger
        onConfirm={() => void onRevoke()}
        error={revokeError}
      >
        <p>
          A server using <strong>op77_live_····{revoking?.keyHint}</strong> can no longer register with the platform. Revoking cannot be undone;
          create a new key to replace it. Revocation does not restore your daily creation quota and removes any upcoming announcement using this license.
        </p>
      </ConfirmDialog>
    </div>
  );
}
