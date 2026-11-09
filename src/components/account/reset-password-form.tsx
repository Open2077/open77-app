"use client";

import { type FormEvent, useState } from "react";
import { useSearchParams } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Notice } from "@/components/ui/feedback";
import { alert02, arrowLeft01, arrowRight01, checkmarkBadge01, refresh } from "@/components/ui/icons";
import * as master from "@/lib/account/api";
import { MasterApiError } from "@/lib/account/api";
import { AuthCard, CardText } from "./auth-card";
import { PasswordField } from "./auth-fields";
import { rich } from "@/i18n/format";
import { masterMessage, useAuthText } from "./auth-text";
import { padlock } from "./kit";

import styles from "./auth-forms.module.css";

/**
 * Completes a password reset with the `?token=&email=` pair from the reset
 * e-mail. The token stays out of any request until the new password passes the
 * local checks; a stale or already-used link routes back to /forgot-password
 * for a fresh one.
 */
export function ResetPasswordForm() {
  const params = useSearchParams();
  const email = params.get("email") ?? "";
  const token = params.get("token") ?? "";

  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [linkDead, setLinkDead] = useState(false);
  const [error, setError] = useState<string | null>(null);
  /** Which field the current error belongs to, so it shows under that field. */
  const [errorField, setErrorField] = useState<"password" | "confirm" | null>(null);
  const { m: auth, locale } = useAuthText();
  const m = auth.reset;

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    if (busy) return;
    setError(null);
    setErrorField(null);
    if (password.length < 8) {
      setError(m.tooShort);
      setErrorField("password");
      return;
    }
    if (password !== confirm) {
      setError(m.mismatch);
      setErrorField("confirm");
      return;
    }
    setBusy(true);
    try {
      await master.resetPassword({ email, token, newPassword: password });
      setDone(true);
    } catch (err) {
      if (err instanceof MasterApiError && err.code === "invalid_password") {
        setError(masterMessage(err, auth, locale));
        setErrorField("password");
      } else if (err instanceof MasterApiError && (err.status === 400 || err.status === 409)) {
        // invalid_reset / reset_rejected: the token, not the password.
        setLinkDead(true);
      } else {
        setError(masterMessage(err, auth, locale));
      }
    } finally {
      setBusy(false);
    }
  }

  if (!email || !token || linkDead) {
    return (
      <AuthCard
        glyph={alert02}
        tone="red"
        eyebrow={m.linkEyebrow}
        title={m.linkTitle}
        actions={
          <>
            <Button icon={refresh} href="/forgot-password">
              {m.requestNew}
            </Button>
            <Button lines="none" border color="neutral" size="sm" icon={arrowLeft01} iconPosition="left" href="/account">
              {auth.back}
            </Button>
          </>
        }
      >
        <Notice kind="danger">
          {!email || !token ? m.incomplete : m.expired}
        </Notice>
      </AuthCard>
    );
  }

  if (done) {
    return (
      <AuthCard
        glyph={checkmarkBadge01}
        tone="blue"
        eyebrow={m.eyebrow}
        title={m.doneTitle}
        actions={
          <Button icon={arrowRight01} href="/account">
            {auth.panel.signIn}
          </Button>
        }
      >
        <Notice kind="success" title={m.doneNotice}>
          {m.doneBody}
        </Notice>
      </AuthCard>
    );
  }

  return (
    <AuthCard glyph={padlock} eyebrow={m.eyebrow} title={m.title}>
      <CardText>{rich(m.lead, { strong: (chunk) => <strong>{chunk}</strong> }, { email })}</CardText>
      {error && !errorField ? <Notice kind="danger">{error}</Notice> : null}
      <form className={styles.form} onSubmit={onSubmit} aria-busy={busy}>
        <PasswordField
          label={m.newPassword}
          name="new-password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          placeholder={m.newPlaceholder}
          autoComplete="new-password"
          minLength={8}
          maxLength={128}
          required
          disabled={busy}
          hint={m.hint}
          error={errorField === "password" ? error : undefined}
        />
        <PasswordField
          label={m.confirm}
          name="confirm-password"
          value={confirm}
          onChange={(event) => setConfirm(event.target.value)}
          placeholder={m.confirmPlaceholder}
          autoComplete="new-password"
          minLength={8}
          maxLength={128}
          required
          disabled={busy}
          error={errorField === "confirm" ? error : undefined}
        />
        <div className={styles.actions}>
          <Button key={busy ? m.updating : m.submit} type="submit" icon={arrowRight01} busy={busy}>
            {busy ? m.updating : m.submit}
          </Button>
        </div>
      </form>
    </AuthCard>
  );
}
