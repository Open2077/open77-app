"use client";

import { useCallback, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";

import { AuthPanel } from "@/components/account/auth-panel";
import { ShieldIcon } from "@/components/icons";
import { authorizeLauncher, MasterApiError } from "@/lib/account/api";
import { useSession } from "@/lib/account/session";

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
    url.pathname === "/callback" &&
    url.search === "" &&
    url.hash === "";
  if (!loopback) {
    return {
      error:
        "This launcher link points somewhere it shouldn't. For your safety the sign-in was stopped.",
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
      <div className="ac-card">
        <p className="ac-error" role="alert">
          <ShieldIcon size={15} />
          <span>{linkError}</span>
        </p>
        <p className="ac-hint">Start the OPEN//77 launcher again to get a fresh sign-in link.</p>
      </div>
    );
  }

  if (!ready) return <p className="ac-loading">Loading…</p>;

  if (!session) {
    return (
      <>
        <section className="ac-launch" aria-label="Launcher sign-in">
          <h2>
            <ShieldIcon size={19} />
            Sign in to authorize your launcher
          </h2>
          <p>
            Sign in — or create an account — and you can connect the OPEN//77 launcher on this
            device to your platform account.
          </p>
        </section>
        <AuthPanel />
      </>
    );
  }

  if (handedOff) {
    return (
      <div className="ac-card">
        <div className="ac-success" role="status">
          <h2 className="ac-reveal-title">
            <ShieldIcon size={19} />
            Launcher authorized.
          </h2>
          <p>
            You can return to the OPEN//77 launcher — it&apos;s signing you in now. You may close
            this tab.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="ac-card">
      <div className="ac-card-head">
        <h2 className="ac-card-title">
          <ShieldIcon size={19} />
          Authorize the launcher
        </h2>
      </div>
      <p className="ac-lead" style={{ margin: "0 0 6px" }}>
        The OPEN//77 launcher on this device wants to sign in as:
      </p>
      <dl className="ac-profile-grid">
        <div>
          <dt className="ac-label">Account</dt>
          <dd>{session.displayName}</dd>
        </div>
        {session.email ? (
          <div>
            <dt className="ac-label">E-mail</dt>
            <dd>{session.email}</dd>
          </div>
        ) : null}
      </dl>
      <p className="ac-hint">
        The launcher receives a short-lived, single-use code over a local connection — never your
        password. Only authorize a launcher you started yourself.
      </p>
      {error ? (
        <p className="ac-error" role="alert" style={{ marginTop: 12 }}>
          {error}
        </p>
      ) : null}
      <div className="ac-form-actions" style={{ marginTop: 16 }}>
        <button className="btn btn-primary" type="button" onClick={onAuthorize} disabled={busy}>
          {busy ? "Authorizing…" : "Authorize launcher"}
        </button>
        <button className="btn btn-ghost" type="button" onClick={onCancel} disabled={busy}>
          Cancel
        </button>
      </div>
    </div>
  );
}
