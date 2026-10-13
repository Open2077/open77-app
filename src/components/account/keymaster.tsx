"use client";

import { type FormEvent, type ReactNode, useCallback, useEffect, useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import { cx } from "@/components/ui/cx";
import { EmptyState, Notice } from "@/components/ui/feedback";
import { Field, Input } from "@/components/ui/field";
import { Icon } from "@/components/ui/icon";
import { add01, copy01, key01, serverStack01, tag01, tick02 } from "@/components/ui/icons";
import { Panel } from "@/components/ui/panel";
import { Display, Eyebrow } from "@/components/ui/typography";
import * as master from "@/lib/account/api";
import { type CreatedLicense, type License, MasterApiError } from "@/lib/account/api";
import { type StoredSession, useSession } from "@/lib/account/session";
import { ArrowLink, Block, ConfirmDialog, Glyph, Pending, Row, Rows, StateTag, formatDay } from "./kit";

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
  const [licenses, setLicenses] = useState<License[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const [createOpen, setCreateOpen] = useState(serverLaunch);
  const [label, setLabel] = useState(serverLaunch ? "My server" : "");
  const [created, setCreated] = useState<CreatedLicense | null>(null);
  const [revoking, setRevoking] = useState<License | null>(null);
  const [revokeError, setRevokeError] = useState<string | null>(null);

  const emailVerified = session.emailVerified;

  useEffect(() => {
    let cancelled = false;
    master
      .listLicenses(session.token)
      .then((result) => {
        if (!cancelled) setLicenses(result);
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        if (err instanceof MasterApiError && err.status === 401) clear();
        else setError(err instanceof MasterApiError ? err.message : "Could not load your keys.");
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session.token]);

  async function onCreate(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setBusy(true);
    try {
      const license = await master.createLicense(session.token, label.trim());
      setCreated(license);
      setCreateOpen(false);
      setLabel("");
      setLicenses((current) =>
        current
          ? [
              {
                licenseId: license.licenseId,
                label: license.label,
                keyHint: license.keyHint,
                createdAtUtc: license.createdAtUtc,
                revokedAtUtc: null,
              },
              ...current,
            ]
          : current,
      );
    } catch (err) {
      setError(err instanceof MasterApiError ? err.message : "Could not create the key.");
    } finally {
      setBusy(false);
    }
  }

  async function onRevoke() {
    if (!revoking || busy) return;
    const licenseId = revoking.licenseId;
    setRevokeError(null);
    setError(null);
    setBusy(true);
    try {
      await master.revokeLicense(session.token, licenseId);
      const now = new Date().toISOString();
      setLicenses(
        (current) => current?.map((license) => (license.licenseId === licenseId ? { ...license, revokedAtUtc: now } : license)) ?? null,
      );
      if (created?.licenseId === licenseId) setCreated(null);
      setRevoking(null);
    } catch (err) {
      setRevokeError(err instanceof MasterApiError ? err.message : "Could not revoke the key.");
    } finally {
      setBusy(false);
    }
  }

  const active = licenses?.filter((license) => !license.revokedAtUtc).length ?? 0;

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
        title="License keys"
        lead="Only you see the labels. Each key registers one dedicated server with the platform."
        actions={
          !createOpen ? (
            <Button lines="none" icon={add01} iconPosition="left" disabled={!emailVerified} onClick={() => setCreateOpen(true)}>
              New key
            </Button>
          ) : null
        }
      >
        {!emailVerified ? (
          <Notice kind="info" title="Verify your e-mail first">
            Creating keys requires a verified e-mail address. <ArrowLink href="/account">Verify your account</ArrowLink>
          </Notice>
        ) : null}

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
              <Button key={busy ? "Creating…" : "Create key"} type="submit" icon={key01} busy={busy} disabled={label.trim().length === 0 || !emailVerified}>
                {busy ? "Creating…" : "Create key"}
              </Button>
              <Button lines="none" border color="neutral" onClick={() => setCreateOpen(false)}>
                Cancel
              </Button>
            </div>
          </form>
        ) : null}

        {licenses === null ? (
          error ? null : <Pending label="Loading keys" />
        ) : licenses.length === 0 ? (
          <div data-empty="keys">
            <EmptyState eyebrow="Keymaster" title="No license keys yet">
              Create one to bring your first server onto the platform.
            </EmptyState>
          </div>
        ) : (
          <Rows label="Your license keys">
            {licenses.map((license) => (
              <Row
                key={license.licenseId}
                marker={!license.revokedAtUtc}
                muted={!!license.revokedAtUtc}
                leading={<Glyph glyph={key01} tone={license.revokedAtUtc ? "neutral" : "yellow"} />}
                meta={<>Created {formatDay(license.createdAtUtc)}{license.revokedAtUtc ? ` · Revoked ${formatDay(license.revokedAtUtc)}` : ""}</>}
                title={license.label}
                description={<code className={styles.hint}>op77_live_····{license.keyHint}</code>}
                aside={
                  license.revokedAtUtc ? (
                    <StateTag state="revoked" />
                  ) : (
                    <>
                      <StateTag state="active" />
                      <Button
                        lines="none"
                        border
                        color="red"
                        size="sm"
                        disabled={busy}
                        aria-label={`Revoke ${license.label}`}
                        onClick={() => {
                          setRevokeError(null);
                          setRevoking(license);
                        }}
                      >
                        Revoke
                      </Button>
                    </>
                  )
                }
              />
            ))}
          </Rows>
        )}
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
          create a new key to replace it.
        </p>
      </ConfirmDialog>
    </div>
  );
}
