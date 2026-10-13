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

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    if (busy) return;
    setError(null);
    setErrorField(null);
    if (password.length < 8) {
      setError("The new password must be at least 8 characters.");
      setErrorField("password");
      return;
    }
    if (password !== confirm) {
      setError("The two passwords don't match.");
      setErrorField("confirm");
      return;
    }
    setBusy(true);
    try {
      await master.resetPassword({ email, token, newPassword: password });
      setDone(true);
    } catch (err) {
      if (err instanceof MasterApiError && err.code === "invalid_password") {
        setError(err.message);
        setErrorField("password");
      } else if (err instanceof MasterApiError && (err.status === 400 || err.status === 409)) {
        // invalid_reset / reset_rejected: the token, not the password.
        setLinkDead(true);
      } else {
        setError(err instanceof MasterApiError ? err.message : "Something went wrong. Try again.");
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
        eyebrow="Reset link"
        title="Link unavailable"
        actions={
          <>
            <Button icon={refresh} href="/forgot-password">
              Request a new link
            </Button>
            <Button lines="none" border color="neutral" size="sm" icon={arrowLeft01} iconPosition="left" href="/account">
              Back to sign-in
            </Button>
          </>
        }
      >
        <Notice kind="danger">
          {!email || !token
            ? "This reset link is incomplete. Open the link from your e-mail again, or copy it in full into the address bar."
            : "This reset link is invalid or has expired. Reset links are single-use and only live for a short while."}
        </Notice>
      </AuthCard>
    );
  }

  if (done) {
    return (
      <AuthCard
        glyph={checkmarkBadge01}
        tone="blue"
        eyebrow="Password reset"
        title="You're all set"
        actions={
          <Button icon={arrowRight01} href="/account">
            Sign in
          </Button>
        }
      >
        <Notice kind="success" title="Password changed.">
          Your new password is active. Sign in with it now.
        </Notice>
      </AuthCard>
    );
  }

  return (
    <AuthCard glyph={padlock} eyebrow="Password reset" title="Choose a new password">
      <CardText>
        Setting a new password for <strong>{email}</strong>.
      </CardText>
      {error && !errorField ? <Notice kind="danger">{error}</Notice> : null}
      <form className={styles.form} onSubmit={onSubmit} aria-busy={busy}>
        <PasswordField
          label="New password"
          name="new-password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          placeholder="Choose a strong password"
          autoComplete="new-password"
          minLength={8}
          maxLength={128}
          required
          disabled={busy}
          hint="8–128 characters. A unique passphrase works well."
          error={errorField === "password" ? error : undefined}
        />
        <PasswordField
          label="Confirm new password"
          name="confirm-password"
          value={confirm}
          onChange={(event) => setConfirm(event.target.value)}
          placeholder="Same password again"
          autoComplete="new-password"
          minLength={8}
          maxLength={128}
          required
          disabled={busy}
          error={errorField === "confirm" ? error : undefined}
        />
        <div className={styles.actions}>
          <Button key={busy ? "Updating…" : "Set new password"} type="submit" icon={arrowRight01} busy={busy}>
            {busy ? "Updating…" : "Set new password"}
          </Button>
        </div>
      </form>
    </AuthCard>
  );
}
