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
function parseRequest(params: URLSearchParams): { request?: LauncherRequest; error?: string } {
  const redirectUri = params.get("redirect_uri") ?? "";
  const state = params.get("state") ?? "";
  const codeChallenge = params.get("code_challenge") ?? "";
  const method = params.get("code_challenge_method") ?? "";

  let url: URL;
  try {
    url = new URL(redirectUri);
  } catch {
    return { error: "This launcher link is missing a valid redirect address." };
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
    return {
      error: "This launcher link points somewhere it shouldn't. For your safety the sign-in was stopped.",
    };
  }
  if (!state) {
    return { error: "This launcher link is incomplete (missing state)." };
  }
  if (!BASE64URL_43.test(codeChallenge) || method !== "S256") {
    return { error: "This launcher link is incomplete (bad PKCE challenge)." };
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
  const { request, error: linkError } = useMemo(() => parseRequest(params), [params]);

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
        setError("Your session expired. Sign in again to authorize the launcher.");
      } else {
        setError(caught instanceof Error ? caught.message : "Could not authorize the launcher.");
      }
      setBusy(false);
    }
  }, [session, request, clear]);

  const onCancel = useCallback(() => {
    if (!request) return;
    redirectToLauncher(request.redirectUri, { error: "access_denied", state: request.state });
  }, [request]);

  // A bad or hostile launcher link — never redirect, just explain.
  if (linkError) {
    return (
      <AuthCard glyph={shield01} tone="red" eyebrow="Launcher" title="Connection stopped" footer="Start the OPEN//77 launcher again to get a fresh sign-in link.">
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
      <AuthCard glyph={checkmarkBadge01} tone="blue" eyebrow="Launcher" title="Launcher authorized">
        <Notice kind="success" title="You can return to the OPEN//77 launcher.">
          It&apos;s signing you in now. You may close this tab.
        </Notice>
      </AuthCard>
    );
  }

  return (
    <AuthCard
      glyph={computer}
      eyebrow="Launcher"
      title="Authorize the launcher"
      actions={
        <>
          <Button key={busy ? "Authorizing…" : "Authorize launcher"} icon={link01} busy={busy} onClick={onAuthorize}>
            {busy ? "Authorizing…" : "Authorize launcher"}
          </Button>
          <Button lines="none" border color="neutral" disabled={busy} onClick={onCancel}>
            Cancel
          </Button>
        </>
      }
    >
      <CardText>The OPEN//77 launcher on this device wants to sign in as:</CardText>
      <DefinitionList
        className={styles.facts}
        items={[
          { label: "Account", value: session.displayName },
          ...(session.email ? [{ label: "E-mail", value: session.email }] : []),
        ]}
      />
      <p className={styles.hint}>
        The launcher receives a short-lived, single-use code over a local connection, never your password. Only authorize a launcher you
        started yourself.
      </p>
      {error ? <Notice kind="danger">{error}</Notice> : null}
    </AuthCard>
  );
}
