"use client";

import { useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Notice } from "@/components/ui/feedback";
import { alert02, arrowLeft01, arrowRight01, checkmarkBadge01, mail01, sent } from "@/components/ui/icons";
import * as master from "@/lib/account/api";
import { MasterApiError } from "@/lib/account/api";
import { AuthCard, CardText } from "./auth-card";
import { AuthLoading } from "./auth-scene";

type Phase = { kind: "verifying" } | { kind: "verified" } | { kind: "bad-link" } | { kind: "failed"; message: string };

type Resend = "idle" | "sending" | "sent" | "failed";

/**
 * Consumes the `?token=&email=` pair from a verification e-mail. The token is
 * spent against the master exactly once on mount; a stale or already-used link
 * lands on an error card that can mint a fresh one via the resend endpoint.
 */
export function EmailVerifier() {
  const params = useSearchParams();
  const email = params.get("email") ?? "";
  const token = params.get("token") ?? "";

  const [phase, setPhase] = useState<Phase>(email && token ? { kind: "verifying" } : { kind: "bad-link" });
  const [resend, setResend] = useState<Resend>("idle");

  // React 18+ mounts effects twice in development; the token is single-use,
  // so the second pass would burn it and report a false failure.
  const attempted = useRef(false);

  useEffect(() => {
    if (!email || !token || attempted.current) return;
    attempted.current = true;
    master
      .verifyEmail({ email, token })
      .then(() => setPhase({ kind: "verified" }))
      .catch((err: unknown) => {
        setPhase({
          kind: "failed",
          message: err instanceof MasterApiError && err.code !== "unknown" ? err.message : "This verification link is invalid or has expired.",
        });
      });
  }, [email, token]);

  async function onResend() {
    setResend("sending");
    try {
      await master.resendVerification({ email });
      setResend("sent");
    } catch {
      setResend("failed");
    }
  }

  if (phase.kind === "verifying") return <AuthLoading>Verifying your e-mail</AuthLoading>;

  if (phase.kind === "verified") {
    return (
      <AuthCard
        glyph={checkmarkBadge01}
        tone="blue"
        eyebrow="E-mail verification"
        title="Address confirmed"
        actions={
          <Button icon={arrowRight01} href="/account">
            Sign in
          </Button>
        }
      >
        <Notice kind="success" title="E-mail verified.">
          Your address is confirmed. You can now sign in and create server license keys.
        </Notice>
      </AuthCard>
    );
  }

  if (phase.kind === "bad-link") {
    return (
      <AuthCard
        glyph={mail01}
        tone="red"
        eyebrow="E-mail verification"
        title="Check your link"
        footer={
          <>
            You can also verify from your <a href="/account">account page</a> after signing in.
          </>
        }
      >
        <Notice kind="danger">
          This verification link is incomplete. Open the link from your e-mail again, or copy it in full into the address bar.
        </Notice>
      </AuthCard>
    );
  }

  return (
    <AuthCard
      glyph={alert02}
      tone="red"
      eyebrow="E-mail verification"
      title="Verification failed"
      actions={
        resend === "sent" ? null : (
          <>
            <Button key={resend === "sending" ? "Sending…" : "Resend verification e-mail"} icon={sent} busy={resend === "sending"} onClick={onResend}>
              {resend === "sending" ? "Sending…" : "Resend verification e-mail"}
            </Button>
            <Button lines="none" border color="neutral" size="sm" icon={arrowLeft01} iconPosition="left" href="/account">
              Back to sign-in
            </Button>
          </>
        )
      }
    >
      <Notice kind="danger">{phase.message}</Notice>
      {resend === "sent" ? (
        <Notice kind="success" title="A fresh verification e-mail is on its way.">
          It goes to <strong>{email}</strong>. The newest link replaces this one.
        </Notice>
      ) : null}
      {resend === "failed" ? <CardText>The e-mail could not be requested. Wait a minute and try again.</CardText> : null}
    </AuthCard>
  );
}
