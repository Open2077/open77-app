"use client";

import Link from "next/link";
import { type FormEvent, useState } from "react";
import { useSearchParams } from "next/navigation";

import { ArrowRightIcon, CheckIcon, InfoIcon } from "@/components/icons";
import { PasswordField } from "@/components/account/auth-fields";
import { AuthIcon } from "@/components/account/auth-icon";
import * as master from "@/lib/account/api";
import { MasterApiError } from "@/lib/account/api";

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

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    if (busy) return;
    setError(null);
    if (password.length < 8) {
      setError("The new password must be at least 8 characters.");
      return;
    }
    if (password !== confirm) {
      setError("The two passwords don't match.");
      return;
    }
    setBusy(true);
    try {
      await master.resetPassword({ email, token, newPassword: password });
      setDone(true);
    } catch (err) {
      if (err instanceof MasterApiError && err.code === "invalid_password") {
        setError(err.message);
      } else if (err instanceof MasterApiError && (err.status === 400 || err.status === 409)) {
        // invalid_reset / reset_rejected: the token, not the password.
        setLinkDead(true);
      } else {
        setError(
          err instanceof MasterApiError ? err.message : "Something went wrong. Try again.",
        );
      }
    } finally {
      setBusy(false);
    }
  }

  if (!email || !token || linkDead) {
    return (
      <div className="auth-panel ac-card">
        <span className="auth-state-icon"><AuthIcon name="shield" size={24} /></span>
        <div className="auth-panel-heading"><h2>Link unavailable.</h2></div>
        <p className="ac-error" role="alert">
          <InfoIcon />
          <span>
            {!email || !token
              ? "This reset link is incomplete. Open the link from your e-mail again, or copy it in full into the address bar."
              : "This reset link is invalid or has expired. Reset links are single-use and only live for a short while."}
          </span>
        </p>
        <div className="ac-form-actions" style={{ marginTop: 16 }}>
          <Link className="btn btn-primary" href="/forgot-password">
            Request a new link
          </Link>
          <Link className="btn btn-ghost" href="/account">
            Back to sign-in
          </Link>
        </div>
      </div>
    );
  }

  if (done) {
    return (
      <div className="auth-panel ac-card">
        <span className="auth-state-icon"><AuthIcon name="shield" size={24} /></span>
        <div className="auth-panel-heading"><h2>You&apos;re all set.</h2></div>
        <div className="ac-success" role="status">
          <CheckIcon size={17} />
          <span>
            <strong>Password changed.</strong> Your new password is active. Sign in with it now.
          </span>
        </div>
        <div className="ac-form-actions" style={{ marginTop: 16 }}>
          <Link className="btn btn-primary" href="/account">
            Sign in
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="auth-panel ac-card">
      <span className="auth-state-icon"><AuthIcon name="lock" size={24} /></span>
      <h2 className="ac-card-title">Choose a new password</h2>
      <p className="ac-lead" style={{ margin: "10px 0 18px" }}>
        Setting a new password for <strong>{email}</strong>.
      </p>
      {error ? (
        <p className="ac-error" role="alert" style={{ marginBottom: 14 }}>
          <InfoIcon />
          {error}
        </p>
      ) : null}
      <form className="ac-form" onSubmit={onSubmit} aria-busy={busy}>
        <PasswordField label="New password" name="new-password" value={password} onChange={event => setPassword(event.target.value)} placeholder="Choose a strong password" autoComplete="new-password" minLength={8} maxLength={128} required disabled={busy} hint="8–128 characters. A unique passphrase works well." />
        <PasswordField label="Confirm new password" name="confirm-password" value={confirm} onChange={event => setConfirm(event.target.value)} placeholder="Same password again" autoComplete="new-password" minLength={8} maxLength={128} required disabled={busy} />
        <div className="ac-form-actions">
          <button className="btn btn-primary" type="submit" disabled={busy}>
            {busy ? <><span className="auth-spinner" aria-hidden="true" />Updating…</> : <>Set new password <ArrowRightIcon /></>}
          </button>
        </div>
      </form>
    </div>
  );
}
