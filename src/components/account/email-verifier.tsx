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
import { useLocalizeHref } from "@/i18n/client";
import { rich } from "@/i18n/format";
import { masterMessage, useAuthText } from "./auth-text";

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
  const { m: auth, locale } = useAuthText();
  const m = auth.verification;
  const localize = useLocalizeHref();

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
          message: err instanceof MasterApiError && err.code !== "unknown" ? masterMessage(err, auth, locale) : m.invalidLink,
        });
      });
  }, [email, token, auth, locale, m.invalidLink]);

  async function onResend() {
    setResend("sending");
    try {
      await master.resendVerification({ email });
      setResend("sent");
    } catch {
      setResend("failed");
    }
  }

  if (phase.kind === "verifying") return <AuthLoading>{auth.verifying}</AuthLoading>;

  if (phase.kind === "verified") {
    return (
      <AuthCard
        glyph={checkmarkBadge01}
        tone="blue"
        eyebrow={m.eyebrow}
        title={m.confirmedTitle}
        actions={
          <Button icon={arrowRight01} href="/account">
            {auth.panel.signIn}
          </Button>
        }
      >
        <Notice kind="success" title={m.confirmedNotice}>
          {m.confirmedBody}
        </Notice>
      </AuthCard>
    );
  }

  if (phase.kind === "bad-link") {
    return (
      <AuthCard
        glyph={mail01}
        tone="red"
        eyebrow={m.eyebrow}
        title={m.badLinkTitle}
        footer={<>{rich(m.badLinkFooter, { account: (chunk) => <a href={localize("/account")}>{chunk}</a> })}</>}
      >
        <Notice kind="danger">{m.badLinkBody}</Notice>
      </AuthCard>
    );
  }

  return (
    <AuthCard
      glyph={alert02}
      tone="red"
      eyebrow={m.eyebrow}
      title={m.failedTitle}
      actions={
        resend === "sent" ? null : (
          <>
            <Button key={resend === "sending" ? auth.sending : m.resend} icon={sent} busy={resend === "sending"} onClick={onResend}>
              {resend === "sending" ? auth.sending : m.resend}
            </Button>
            <Button lines="none" border color="neutral" size="sm" icon={arrowLeft01} iconPosition="left" href="/account">
              {auth.back}
            </Button>
          </>
        )
      }
    >
      <Notice kind="danger">{phase.message}</Notice>
      {resend === "sent" ? (
        <Notice kind="success" title={m.resentTitle}>
          {rich(m.resentBody, { strong: (chunk) => <strong>{chunk}</strong> }, { email })}
        </Notice>
      ) : null}
      {resend === "failed" ? <CardText>{m.resendFailed}</CardText> : null}
    </AuthCard>
  );
}
