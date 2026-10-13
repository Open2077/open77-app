"use client";

import { useEffect, useRef, useState } from "react";

import { AuthCard, CardText } from "@/components/account/auth-card";
import { AuthPanel } from "@/components/account/auth-panel";
import { AuthLoading } from "@/components/account/auth-scene";
import { ArrowLink } from "@/components/account/kit";
import { Button } from "@/components/ui/button";
import { Notice } from "@/components/ui/feedback";
import { alert02, arrowRight01, checkmarkBadge01, shield01 } from "@/components/ui/icons";
import { useSession, type StoredSession } from "@/lib/account/session";
import { finishConnection, type GitHubCallbackResult } from "@/lib/community/github-api";
import { githubConnectionKey, readPendingGitHubConnection } from "@/lib/community/github-pkce";

export function GitHubCallback() {
  const { session, ready } = useSession();
  if (!ready) return <AuthLoading />;
  if (!session)
    return (
      <>
        <Notice kind="info" title="Sign in to finish connecting GitHub">
          Sign in with the Open77 account that started this connection.
        </Notice>
        <AuthPanel />
      </>
    );
  if (!session.emailVerified)
    return (
      <AuthCard glyph={shield01} eyebrow="GitHub" title="Verify your e-mail first">
        <CardText>Verify your Open77 email before finishing the GitHub connection.</CardText>
        <ArrowLink href="/account">Open account</ArrowLink>
      </AuthCard>
    );
  return <Callback key={session.token} session={session} />;
}

function Callback({ session }: { session: StoredSession }) {
  const request = useRef<Promise<GitHubCallbackResult> | null>(null);
  const [result, setResult] = useState<GitHubCallbackResult | null>(null);
  const [error, setError] = useState("");
  useEffect(() => {
    let visible = true;
    // Share the same one-shot promise across Strict Mode effect replay. Do not
    // retry a consumed provider code when an HTTP response is lost.
    request.current ??= Promise.resolve().then(async () => {
      const query = new URLSearchParams(window.location.search);
      const state = query.get("state") ?? "";
      const code = query.get("code") ?? "";
      const key = githubConnectionKey(state);
      if (query.has("error")) {
        window.history.replaceState(window.history.state, "", "/account/github/callback");
        sessionStorage.removeItem(key);
        throw new Error("GitHub authorization was cancelled or refused. You can start again from your account.");
      }
      if (!code || code.length > 1000) throw new Error("The GitHub callback has no valid authorization code. Start again.");
      const pending = readPendingGitHubConnection(sessionStorage.getItem(key), state, session.accountId);
      window.history.replaceState(window.history.state, "", "/account/github/callback");
      try {
        const result = await finishConnection(session.token, state, code, pending.verifier);
        if (result.returnPath !== "/account/github" && !/^\/account\/creations\/[a-f0-9-]{36}\/edit#hub-releases$/.test(result.returnPath))
          throw new Error("GitHub connected, but the return location was invalid. Open your account to inspect the connection.");
        return result;
      } finally {
        sessionStorage.removeItem(key);
      }
    });
    request.current
      .then((value) => {
        if (visible) setResult(value);
      })
      .catch((error) => {
        if (visible) setError(error instanceof Error ? error.message : "The GitHub connection could not be completed.");
      });
    return () => {
      visible = false;
    };
  }, [session.accountId, session.token]);
  if (error)
    return (
      <AuthCard
        glyph={alert02}
        tone="red"
        eyebrow="GitHub"
        title="Connection not completed"
        actions={
          <Button lines="none" border color="neutral" icon={arrowRight01} href="/account/github">
            Check GitHub connection
          </Button>
        }
      >
        <Notice kind="danger">{error}</Notice>
        <CardText>A response may have been lost after the connection completed. Check its current state before starting again.</CardText>
      </AuthCard>
    );
  if (!result) return <AuthLoading>Verifying your GitHub identity</AuthLoading>;
  return (
    <AuthCard
      glyph={checkmarkBadge01}
      tone="blue"
      eyebrow="GitHub"
      title={`Connected as @${result.connection.login}`}
      actions={
        <Button icon={arrowRight01} href={result.returnPath}>
          Continue
        </Button>
      }
    >
      {result.repositoryId !== null ? (
        <CardText>
          {result.repositoryControlVerified
            ? "Repository control was verified for new imports during the next 24 hours."
            : "Repository control could not be verified. You may still share resources you have permission to redistribute."}
        </CardText>
      ) : (
        <CardText>Your public GitHub identity is now linked to this account.</CardText>
      )}
    </AuthCard>
  );
}

