"use client";

import { type FormEvent, useState } from "react";

import { Button } from "@/components/ui/button";
import { Notice } from "@/components/ui/feedback";
import { arrowLeft01, arrowRight01, mail01, sent } from "@/components/ui/icons";
import * as master from "@/lib/account/api";
import { isOffline, MasterApiError } from "@/lib/account/api";
import { AuthCard, CardText } from "./auth-card";
import { AuthField } from "./auth-fields";
import { rich } from "@/i18n/format";
import { masterMessage, useAuthText } from "./auth-text";
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
  const { m: auth, locale } = useAuthText();
  const m = auth.forgot;

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
        setError(masterMessage(err, auth, locale));
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
        eyebrow={m.sentEyebrow}
        title={m.sentTitle}
        actions={
          <Button lines="none" border color="neutral" icon={arrowLeft01} iconPosition="left" href="/account">
            {auth.back}
          </Button>
        }
      >
        <Notice kind="success">{rich(m.sentBody, { strong: (chunk) => <strong>{chunk}</strong> }, { email })}</Notice>
      </AuthCard>
    );
  }

  return (
    <AuthCard glyph={padlock} eyebrow={m.eyebrow} title={m.title}>
      <CardText>{m.lead}</CardText>
      {error ? <Notice kind="danger">{error}</Notice> : null}
      <form className={styles.form} onSubmit={onSubmit} aria-busy={busy}>
        <AuthField
          label={auth.panel.email}
          type="email"
          name="email"
          icon={mail01}
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          placeholder={auth.panel.emailPlaceholder}
          autoComplete="email"
          autoCapitalize="none"
          spellCheck={false}
          disabled={busy}
          required
        />
        <div className={styles.actions}>
          <Button key={busy ? auth.sending : m.submit} type="submit" icon={arrowRight01} busy={busy}>
            {busy ? auth.sending : m.submit}
          </Button>
        </div>
        <div className={styles.secondary}>
          <Button lines="none" border color="neutral" size="sm" icon={arrowLeft01} iconPosition="left" href="/account">
            {auth.back}
          </Button>
        </div>
      </form>
    </AuthCard>
  );
}
