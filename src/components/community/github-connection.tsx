"use client";

import { useEffect, useRef, useState } from "react";

import { AuthPanel } from "@/components/account/auth-panel";
import { ArrowLink, ConfirmDialog, Fine, Glyph, Pending, StateTag, formatDateTime } from "@/components/account/kit";
import { Button } from "@/components/ui/button";
import { Notice } from "@/components/ui/feedback";
import { github as githubGlyph, refresh } from "@/components/ui/icons";
import { useSession, type StoredSession } from "@/lib/account/session";
import * as github from "@/lib/community/github-api";
import { githubConnectionKey, githubPkce } from "@/lib/community/github-pkce";

import styles from "./github-connection.module.css";

const errorText = (error: unknown) => (error instanceof Error ? error.message : "Your GitHub connection could not be updated.");

export function GitHubAccountConnection() {
  const { session, ready } = useSession();
  if (!ready) return <Pending label="Account" />;
  if (!session) return <AuthPanel />;
  if (!session.emailVerified)
    return (
      <Notice kind="info" title="Verify your e-mail first">
        Verify your email before connecting GitHub. <ArrowLink href="/account">Open your account</ArrowLink>
      </Notice>
    );
  return <GitHubConnectionControl key={session.token} session={session} />;
}

export function GitHubConnectionControl({
  session,
  projectId,
  repository,
}: {
  session: StoredSession;
  projectId?: string;
  repository?: github.GitHubRepository;
}) {
  const [value, setValue] = useState<github.GitHubConnectionState | null>(null);
  const [refreshCount, setRefresh] = useState(0);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [removing, setRemoving] = useState(false);
  const connecting = useRef<AbortController | null>(null);
  useEffect(() => () => connecting.current?.abort(), []);
  useEffect(() => {
    const operation = new AbortController();
    void github
      .connection(session.token, repository?.repositoryId, AbortSignal.any([operation.signal, AbortSignal.timeout(10000)]))
      .then((value) => {
        if (!operation.signal.aborted) {
          setValue(value);
          setError("");
        }
      })
      .catch((error) => {
        if (!operation.signal.aborted) setError(errorText(error));
      });
    return () => operation.abort();
  }, [session.token, repository?.repositoryId, refreshCount]);
  async function connect() {
    if (!value || busy) return;
    setBusy(true);
    setError("");
    const operation = new AbortController();
    connecting.current = operation;
    try {
      const { verifier, challenge } = await githubPkce();
      const response = await github.connect(session.token, value.connection.revision, challenge, projectId, repository, operation.signal);
      if (operation.signal.aborted) return;
      const url = new URL(response.authorizationUrl);
      if (url.origin !== "https://github.com" || url.pathname !== "/login/oauth/authorize") throw new Error("Unsupported GitHub authorization destination.");
      sessionStorage.setItem(
        githubConnectionKey(response.state),
        JSON.stringify({ state: response.state, accountId: session.accountId, verifier, expiresAtUtc: response.expiresAtUtc }),
      );
      window.location.assign(url.href);
    } catch (error) {
      if (!operation.signal.aborted) {
        setError(errorText(error));
        setBusy(false);
      }
    }
  }
  async function disconnect() {
    if (!value || busy) return;
    setBusy(true);
    setError("");
    try {
      await github.disconnect(session.token, value.connection.revision);
      setRemoving(false);
      setValue(null);
      setRefresh((value) => value + 1);
    } catch (error) {
      setError(errorText(error));
    } finally {
      setBusy(false);
    }
  }
  const login = value?.connection.login;
  return (
    <section className={styles.control} aria-label="GitHub account connection" data-github-connection>
      <header className={styles.head}>
        <Glyph glyph={githubGlyph} />
        <div className={styles.headCopy}>
          <h3 className={styles.title}>{repository ? "Optional repository verification" : "GitHub connection"}</h3>
          <p className={styles.text}>
            Connect to verify your public GitHub identity{repository ? ` and control of ${repository.fullName}` : ""}. Public imports do not
            require a connection. No repository write permissions are requested.
          </p>
        </div>
        {value ? <StateTag state={login ? "connected" : "draft"} label={login ? "Connected" : "Not connected"} /> : null}
      </header>
      {error && !removing ? <Notice kind="danger">{error}</Notice> : null}
      {!value && !error ? <Pending label="Loading GitHub connection" /> : null}
      {value ? (
        <>
          <div className={styles.status}>
            <p className={styles.login}>{login ? <>Connected as <strong>@{login}</strong>.</> : "No GitHub account connected."}</p>
            {repository ? (
              <p className={styles.text}>
                {value.controlVerifiedAtUtc
                  ? `Repository control verified on ${formatDateTime(value.controlVerifiedAtUtc)}. Proof is valid for new imports for 24 hours.`
                  : "No current repository-control proof. You can still import resources you have permission to share."}
              </p>
            ) : null}
            {!value.oauthAvailable ? (
              <Notice kind="info">GitHub connection is currently unavailable. Public import and ZIP publishing remain independent.</Notice>
            ) : null}
          </div>
          <div className={styles.actions}>
            <Button key={busy && !removing ? "Working…" : login ? "Reconnect with GitHub" : "Connect with GitHub"} lines="none" icon={githubGlyph} iconPosition="left" busy={busy && !removing} disabled={busy || !value.oauthAvailable} onClick={() => void connect()}>
              {busy && !removing ? "Working…" : login ? "Reconnect with GitHub" : "Connect with GitHub"}
            </Button>
            {value.connection.userId !== null ? (
              <Button lines="none" border color="red" size="sm" disabled={busy} onClick={() => setRemoving(true)}>
                Disconnect
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
              onClick={() => {
                setRemoving(false);
                setRefresh((value) => value + 1);
              }}
            >
              Refresh connection
            </Button>
          </div>
        </>
      ) : error ? (
        <div className={styles.actions}>
          <Button lines="none" border color="neutral" size="sm" icon={refresh} iconPosition="left" disabled={busy} onClick={() => setRefresh((value) => value + 1)}>
            Refresh connection
          </Button>
        </div>
      ) : null}
      <ConfirmDialog
        open={removing}
        onClose={() => setRemoving(false)}
        eyebrow="GitHub connection"
        title="Disconnect GitHub?"
        confirmLabel="Confirm disconnect"
        busyLabel="Disconnecting…"
        busy={busy}
        danger
        onConfirm={() => void disconnect()}
        error={error || undefined}
      >
        <p>
          Disconnect this account and remove its proof for future imports? Existing import history stays unchanged.
        </p>
        <Fine>
          To revoke GitHub&apos;s app authorization too, use your{" "}
          <a href="https://github.com/settings/applications" target="_blank" rel="noopener noreferrer">
            GitHub settings
          </a>
          .
        </Fine>
      </ConfirmDialog>
    </section>
  );
}
