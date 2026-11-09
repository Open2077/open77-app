"use client";

import { useCallback, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";

import { Button } from "@/components/ui/button";
import { DefinitionList } from "@/components/ui/data";
import { Notice } from "@/components/ui/feedback";
import { checkmarkBadge01, computer, link01, shield01 } from "@/components/ui/icons";
import { authorizeLauncher, MasterApiError } from "@/lib/account/api";
import { useSession } from "@/lib/account/session";
import { AuthCard, CardText } from "./auth-card";
import { AuthPanel } from "./auth-panel";
import { AuthLoading } from "./auth-scene";
import { masterMessage, useAuthText, type AuthMessages } from "./auth-text";

import styles from "./auth-forms.module.css";

type LauncherRequest = {
  redirectUri: string;
  state: string;
  codeChallenge: string;
};

const BASE64URL_43 = /^[A-Za-z0-9_-]{43}$/;

/**
 * Validate the launcher's parameters. The redirect_uri is a security boundary:
 * a one-time code is only ever handed to a loopback callback, never to an
 * arbitrary origin, so a page opened with a hostile redirect_uri can't
 * exfiltrate an authorization to another site.
 */
function parseRequest(params: URLSearchParams, m: AuthMessages["launcher"]): { request?: LauncherRequest; error?: string } {
  const redirectUri = params.get("redirect_uri") ?? "";
  const state = params.get("state") ?? "";
  const codeChallenge = params.get("code_challenge") ?? "";
  const method = params.get("code_challenge_method") ?? "";

  let url: URL;
  try {
    url = new URL(redirectUri);
  } catch {
    return { error: m.badRedirect };
  }
  const loopback =
    url.protocol === "http:" &&
    (url.hostname === "127.0.0.1" || url.hostname === "localhost") &&
    url.port !== "" &&
    // .NET's HttpListener loopback prefix carries a trailing slash, so the
    // launcher's redirect_uri is /callback/ — accept it with or without.
    (url.pathname === "/callback" || url.pathname === "/callback/") &&
    url.search === "" &&
    url.hash === "";
  if (!loopback) {
    return { error: m.hostile };
  }
  if (!state) {
    return { error: m.noState };
  }
  if (!BASE64URL_43.test(codeChallenge) || method !== "S256") {
    return { error: m.badChallenge };
  }
  return { request: { redirectUri, state, codeChallenge } };
}

function redirectToLauncher(redirectUri: string, params: Record<string, string>) {
  const url = new URL(redirectUri);
  for (const [key, value] of Object.entries(params)) {
    url.searchParams.set(key, value);
  }
  window.location.assign(url.toString());
}

export function LauncherConsent() {
  const { session, ready, clear } = useSession();
  const params = useSearchParams();
  const { m: auth, locale } = useAuthText();
  const m = auth.launcher;
  const { request, error: linkError } = useMemo(() => parseRequest(params, m), [params, m]);

  const [busy, setBusy] = useState(false);
  const [handedOff, setHandedOff] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const onAuthorize = useCallback(async () => {
    if (!session || !request) return;
    setBusy(true);
    setError(null);
    try {
      const { code } = await authorizeLauncher(session.token, request.codeChallenge);
      setHandedOff(true);
      redirectToLauncher(request.redirectUri, { code, state: request.state });
    } catch (caught) {
      if (caught instanceof MasterApiError && caught.code === "invalid_session") {
        clear();
        setError(m.expired);
      } else {
        setError(caught instanceof MasterApiError ? masterMessage(caught, auth, locale) : caught instanceof Error ? caught.message : m.failed);
      }
      setBusy(false);
    }
  }, [session, request, clear, m, auth, locale]);

  const onCancel = useCallback(() => {
    if (!request) return;
    redirectToLauncher(request.redirectUri, { error: "access_denied", state: request.state });
  }, [request]);

  // A bad or hostile launcher link — never redirect, just explain.
  if (linkError) {
    return (
      <AuthCard glyph={shield01} tone="red" eyebrow={m.eyebrow} title={m.stoppedTitle} footer={m.stoppedFooter}>
        <Notice kind="danger">{linkError}</Notice>
      </AuthCard>
    );
  }

  if (!ready) return <AuthLoading />;

  // The scene's title and lead already say why; the form itself must stay in the first screen.
  if (!session) {
    return (
      <>
        {error ? <Notice kind="danger">{error}</Notice> : null}
        <AuthPanel />
      </>
    );
  }

  if (handedOff) {
    return (
      <AuthCard glyph={checkmarkBadge01} tone="blue" eyebrow={m.eyebrow} title={m.doneTitle}>
        <Notice kind="success" title={m.doneNotice}>
          {m.doneBody}
        </Notice>
      </AuthCard>
    );
  }

  return (
    <AuthCard
      glyph={computer}
      eyebrow={m.eyebrow}
      title={m.title}
      actions={
        <>
          <Button key={busy ? m.authorizing : m.authorize} icon={link01} busy={busy} onClick={onAuthorize}>
            {busy ? m.authorizing : m.authorize}
          </Button>
          <Button lines="none" border color="neutral" disabled={busy} onClick={onCancel}>
            {m.cancel}
          </Button>
        </>
      }
    >
      <CardText>{m.lead}</CardText>
      <DefinitionList
        className={styles.facts}
        items={[
          { label: m.account, value: session.displayName },
          ...(session.email ? [{ label: m.email, value: session.email }] : []),
        ]}
      />
      <p className={styles.hint}>{m.hint}</p>
      {error ? <Notice kind="danger">{error}</Notice> : null}
    </AuthCard>
  );
}
