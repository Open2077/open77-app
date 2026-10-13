"use client";

import { type FormEvent, useState } from "react";

import { Button } from "@/components/ui/button";
import { Notice } from "@/components/ui/feedback";
import { arrowLeft01, arrowRight01, mail01, sent } from "@/components/ui/icons";
import * as master from "@/lib/account/api";
import { isOffline, MasterApiError } from "@/lib/account/api";
import { AuthCard, CardText } from "./auth-card";
import { AuthField } from "./auth-fields";
import { padlock } from "./kit";

import styles from "./auth-forms.module.css";

/**
 * Requests a password-reset e-mail. The confirmation is deliberately identical
 * whether or not the address maps to an account — the master answers 202
 * either way, and this form must not become an oracle for which e-mails are
 * registered. Only failures that say nothing about the address (master
 * unreachable, rate limit) surface as errors.
 */
export function ForgotPasswordForm() {
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [sent_, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    if (busy) return;
    setError(null);
    setBusy(true);
    try {
      await master.forgotPassword({ email });
      setSent(true);
    } catch (err) {
      if (err instanceof MasterApiError && (isOffline(err) || err.code === "rate_limited")) {
        setError(err.message);
      } else {
        // Any other answer must look exactly like success.
        setSent(true);
      }
    } finally {
      setBusy(false);
    }
  }

  if (sent_) {
    return (
      <AuthCard
        glyph={sent}
        tone="blue"
        eyebrow="Link requested"
        title="Check your inbox"
        actions={
          <Button lines="none" border color="neutral" icon={arrowLeft01} iconPosition="left" href="/account">
            Back to sign-in
          </Button>
        }
      >
        <Notice kind="success">
          If an account exists for <strong>{email}</strong>, we&apos;ve sent a reset link. Check your inbox. The link expires after a short
          while.
        </Notice>
      </AuthCard>
    );
  }

  return (
    <AuthCard glyph={padlock} eyebrow="Password reset" title="Reset your password">
      <CardText>Enter the e-mail address on your account and we&apos;ll send you a link to choose a new password.</CardText>
      {error ? <Notice kind="danger">{error}</Notice> : null}
      <form className={styles.form} onSubmit={onSubmit} aria-busy={busy}>
        <AuthField
          label="E-mail"
          type="email"
          name="email"
          icon={mail01}
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          placeholder="you@example.net"
          autoComplete="email"
          autoCapitalize="none"
          spellCheck={false}
          disabled={busy}
          required
        />
        <div className={styles.actions}>
          <Button key={busy ? "Sending…" : "Send reset link"} type="submit" icon={arrowRight01} busy={busy}>
            {busy ? "Sending…" : "Send reset link"}
          </Button>
        </div>
        <div className={styles.secondary}>
          <Button lines="none" border color="neutral" size="sm" icon={arrowLeft01} iconPosition="left" href="/account">
            Back to sign-in
          </Button>
        </div>
      </form>
    </AuthCard>
  );
}
