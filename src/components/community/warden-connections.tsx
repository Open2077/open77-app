"use client";

import { useEffect, useState } from "react";

import { AuthCard, CardText } from "@/components/account/auth-card";
import { AuthPanel } from "@/components/account/auth-panel";
import {
  Actions,
  ArrowLink,
  Block,
  ConfirmDialog,
  Fine,
  Glyph,
  Pending,
  Row,
  Rows,
  StateTag,
  formatDateTime,
} from "@/components/account/kit";
import { Button } from "@/components/ui/button";
import { EmptyState, Notice } from "@/components/ui/feedback";
import { Checkbox, Field, Input, Select } from "@/components/ui/field";
import { arrowRight01, checkmarkBadge01, refresh, serverStack01, shield01 } from "@/components/ui/icons";
import { masterCall } from "@/lib/account/api";
import { useSession, type StoredSession } from "@/lib/account/session";

import styles from "./warden-connections.module.css";

type Connection = { connectionId: string; label: string; projectId: string | null; scopes: string[]; approvedAtUtc: string; expiresAtUtc: string; revoked: boolean };
type Preview = { label: string; scopes: string[]; expiresAtUtc: string };
type Project = { projectId: string; content: { title: string } };
const root = "/api/v1/community/connections";
const errorText = (error: unknown) => (error instanceof Error ? error.message : "The connection could not be updated.");

export function WardenConnections({ approve = false }: { approve?: boolean }) {
  const { session, ready } = useSession();
  if (!ready) return <Pending label="Account" />;
  if (!session) return <AuthPanel />;
  if (approve && !session.emailVerified)
    return (
      <AuthCard glyph={shield01} eyebrow="Warden" title="Verify your e-mail first">
        <CardText>Verify your email before approving a connection.</CardText>
        <ArrowLink href="/account">Open your account</ArrowLink>
      </AuthCard>
    );
  return approve ? <Approval key={session.token} session={session} /> : <ConnectionList key={session.token} session={session} />;
}

function ConnectionList({ session }: { session: StoredSession }) {
  const [data, setData] = useState<{ items: Connection[]; connectionsAvailable: boolean } | null>(null);
  const [refreshCount, setRefresh] = useState(0);
  const [error, setError] = useState("");
  const [confirm, setConfirm] = useState<Connection | null>(null);
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    const operation = new AbortController();
    void masterCall<{ items: Connection[]; connectionsAvailable: boolean }>(root, {
      token: session.token,
      signal: AbortSignal.any([operation.signal, AbortSignal.timeout(10000)]),
    })
      .then((value) => {
        if (!operation.signal.aborted) {
          setData(value);
          setError("");
        }
      })
      .catch((error) => {
        if (!operation.signal.aborted) setError(errorText(error));
      });
    return () => operation.abort();
  }, [session.token, refreshCount]);
  async function revoke(id: string) {
    setBusy(true);
    setError("");
    try {
      await masterCall<void>(`${root}/${encodeURIComponent(id)}/revoke`, { token: session.token, method: "POST", signal: AbortSignal.timeout(15000) });
      setConfirm(null);
      setRefresh((value) => value + 1);
    } catch (error) {
      setError(errorText(error));
    } finally {
      setBusy(false);
    }
  }
  return (
    <Block
      eyebrow="Server consoles"
      title="Connected Wardens"
      lead="Connected Wardens can prepare resource drafts and upload selected files with your approval. Review and publication remain in the Workshop."
      actions={
        <>
          {data?.connectionsAvailable ? (
            <Button lines="none" icon={arrowRight01} href="/account/connections/approve">
              Enter a code from Warden
            </Button>
          ) : null}
          <Button
            lines="none"
            border
            color="neutral"
            size="sm"
            icon={refresh}
            iconPosition="left"
            disabled={busy}
            onClick={() => setRefresh((value) => value + 1)}
          >
            Refresh connections
          </Button>
        </>
      }
    >
      <section aria-label="Warden creator connections" className={styles.list}>
        {error && !confirm ? <Notice kind="danger">{error}</Notice> : null}
        {!data && !error ? <Pending label="Loading connections" /> : null}
        {data ? (
          <>
            {!data.connectionsAvailable ? (
              <Notice kind="info">New connections are temporarily unavailable. You can still revoke existing connections.</Notice>
            ) : null}
            {data.items.length === 0 ? (
              <EmptyState eyebrow="No connection" title="You have no Warden connections">
                Run the Workshop export from your server&apos;s Warden; it shows a short code to enter here.
              </EmptyState>
            ) : (
              <Rows label="Warden connections">
                {data.items.map((item) => (
                  <Row
                    key={item.connectionId}
                    marker={!item.revoked}
                    muted={item.revoked}
                    leading={<Glyph glyph={serverStack01} tone={item.revoked ? "neutral" : "yellow"} />}
                    meta={<>Expires {formatDateTime(item.expiresAtUtc)}</>}
                    title={item.label}
                    description={
                      <>
                        <p>{item.projectId ? `Restricted to project ${item.projectId}.` : "Can create one new project, then upload drafts for that project."}</p>
                        <p className={styles.scopes}>
                          {item.scopes.map((scope) => (
                            <code key={scope}>{scope}</code>
                          ))}
                        </p>
                      </>
                    }
                    aside={
                      item.revoked ? (
                        <StateTag state="revoked" />
                      ) : (
                        <>
                          <StateTag state="active" />
                          <Button lines="none" border color="red" size="sm" disabled={busy} onClick={() => setConfirm(item)}>
                            Revoke…
                          </Button>
                        </>
                      )
                    }
                  />
                ))}
              </Rows>
            )}
          </>
        ) : null}
      </section>
      <ConfirmDialog
        open={confirm !== null}
        onClose={() => setConfirm(null)}
        eyebrow="Warden connection"
        title={`Revoke ${confirm?.label ?? "this Warden"}?`}
        confirmLabel="Revoke connection"
        busyLabel="Revoking…"
        busy={busy}
        danger
        onConfirm={() => confirm && void revoke(confirm.connectionId)}
        error={error || undefined}
      >
        <p>Revoke this Warden&apos;s access? Existing drafts and uploaded files remain in your account.</p>
      </ConfirmDialog>
    </Block>
  );
}

function Approval({ session }: { session: StoredSession }) {
  const [code, setCode] = useState("");
  const [preview, setPreview] = useState<Preview | null>(null);
  const [projects, setProjects] = useState<Project[]>([]);
  const [cursor, setCursor] = useState<string | null>(null);
  const [projectId, setProjectId] = useState("");
  const [consent, setConsent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [approved, setApproved] = useState(false);
  async function inspect() {
    setBusy(true);
    setError("");
    setPreview(null);
    setConsent(false);
    setProjectId("");
    try {
      const [device, page] = await Promise.all([
        masterCall<Preview>(`${root}/device/preview`, { token: session.token, method: "POST", body: { userCode: code.trim() }, signal: AbortSignal.timeout(15000) }),
        masterCall<{ items: Project[]; nextCursor: string | null }>("/api/v1/community/me/projects?limit=24", {
          token: session.token,
          signal: AbortSignal.timeout(15000),
        }),
      ]);
      setPreview(device);
      setProjects(page.items);
      setCursor(page.nextCursor);
    } catch (error) {
      setError(errorText(error));
    } finally {
      setBusy(false);
    }
  }
  async function more() {
    if (!cursor) return;
    setBusy(true);
    setError("");
    try {
      const page = await masterCall<{ items: Project[]; nextCursor: string | null }>(
        `/api/v1/community/me/projects?limit=24&cursor=${encodeURIComponent(cursor)}`,
        { token: session.token, signal: AbortSignal.timeout(15000) },
      );
      setProjects((old) => [...old, ...page.items.filter((item) => !old.some((existing) => existing.projectId === item.projectId))]);
      setCursor(page.nextCursor);
    } catch (error) {
      setError(errorText(error));
    } finally {
      setBusy(false);
    }
  }
  async function allow() {
    if (!preview || !consent || busy) return;
    setBusy(true);
    setError("");
    try {
      await masterCall<Connection>(`${root}/device/approve`, {
        token: session.token,
        method: "POST",
        body: { userCode: code.trim(), projectId: projectId || null },
        signal: AbortSignal.timeout(15000),
      });
      setApproved(true);
    } catch (error) {
      setError(errorText(error));
      setConsent(false);
    } finally {
      setBusy(false);
    }
  }
  if (approved)
    return (
      <AuthCard
        glyph={checkmarkBadge01}
        tone="blue"
        eyebrow="Warden"
        title="Connection approved"
        actions={
          <Button lines="none" border color="neutral" icon={arrowRight01} href="/account/connections">
            Manage connections
          </Button>
        }
      >
        <Notice kind="success" title="Warden approved">
          Return to Warden to finish connecting and review your export.
        </Notice>
      </AuthCard>
    );
  return (
    <AuthCard glyph={serverStack01} eyebrow="Warden" title="Approve a Warden">
      <section aria-label="Approve Warden" className={styles.approval}>
        <CardText>Enter the code displayed by the Warden you are connecting. Check its name and choose what it may access.</CardText>
        {error ? <Notice kind="danger">{error}</Notice> : null}
        <form
          className={styles.codeForm}
          onSubmit={(event) => {
            event.preventDefault();
            void inspect();
          }}
        >
          <Field label="Warden code">
            <Input
              icon={shield01}
              inputSize="lg"
              required
              maxLength={16}
              autoComplete="off"
              spellCheck={false}
              value={code}
              disabled={busy}
              className={styles.code}
              onChange={(event) => {
                setCode(event.target.value);
                setPreview(null);
                setConsent(false);
              }}
            />
          </Field>
          <Button type="submit" lines="none" border busy={busy && !preview} disabled={busy || !code.trim()}>
            Review connection
          </Button>
        </form>
        {preview ? (
          <div className={styles.preview}>
            <div className={styles.previewHead}>
              <p className={styles.previewKicker}>Requesting access</p>
              <h3 className={styles.previewTitle}>{preview.label}</h3>
              <p className={styles.scopes}>
                {preview.scopes.map((scope) => (
                  <code key={scope}>{scope}</code>
                ))}
              </p>
              <Fine>Code expires {formatDateTime(preview.expiresAtUtc)}.</Fine>
            </div>
            <Field label="Allow access to">
              <Select
                value={projectId}
                disabled={busy}
                onChange={(event) => {
                  setProjectId(event.target.value);
                  setConsent(false);
                }}
              >
                <option value="">One new project and its drafts</option>
                {projects.map((project) => (
                  <option key={project.projectId} value={project.projectId}>
                    {project.content.title}
                  </option>
                ))}
              </Select>
            </Field>
            {cursor ? (
              <div>
                <Button lines="none" border color="neutral" size="sm" disabled={busy} onClick={() => void more()}>
                  Load more projects
                </Button>
              </div>
            ) : null}
            <CardText>
              Warden can create drafts and upload selected resource files within this scope. You can revoke this connection from your account.
            </CardText>
            <Checkbox checked={consent} disabled={busy} onChange={(event) => setConsent(event.target.checked)}>
              I recognize this Warden and approve this access.
            </Checkbox>
            <Actions>
              <Button key={busy ? "Working…" : "Approve Warden"} icon={checkmarkBadge01} busy={busy} disabled={!consent} onClick={() => void allow()}>
                {busy ? "Working…" : "Approve Warden"}
              </Button>
              <Button lines="none" border color="neutral" size="sm" href="/account/connections">
                Cancel
              </Button>
            </Actions>
          </div>
        ) : null}
      </section>
    </AuthCard>
  );
}
