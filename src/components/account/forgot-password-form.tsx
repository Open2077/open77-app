"use client";

import Link from "next/link";
import { type FormEvent, useState } from "react";

import { CheckIcon, InfoIcon } from "@/components/icons";
import * as master from "@/lib/account/api";
import { isOffline, MasterApiError } from "@/lib/account/api";

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
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setBusy(true);
    try {
      await master.forgotPassword({ email });
      setSent(true);
    } catch (err) {
      if (
        err instanceof MasterApiError &&
        (isOffline(err) || err.code === "rate_limited")
      ) {
        setError(err.message);
      } else {
        // Any other answer must look exactly like success.
        setSent(true);
      }
    } finally {
      setBusy(false);
    }
  }

  if (sent) {
    return (
      <div className="ac-card">
        <div className="ac-success" role="status">
          <CheckIcon size={17} />
          <span>
            If an account exists for <strong>{email}</strong>, we&apos;ve sent a reset link. Check
            your inbox — the link expires after a short while.
          </span>
        </div>
        <div className="ac-form-actions" style={{ marginTop: 16 }}>
          <Link className="btn btn-ghost" href="/account">
            Back to sign-in
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="ac-card">
      <h2 className="ac-card-title">Reset your password</h2>
      <p className="ac-lead" style={{ margin: "10px 0 18px" }}>
        Enter the e-mail address on your account and we&apos;ll send you a link to choose a new
        password.
      </p>
      {error ? (
        <p className="ac-error" role="alert" style={{ marginBottom: 14 }}>
          <InfoIcon />
          {error}
        </p>
      ) : null}
      <form className="ac-form" onSubmit={onSubmit}>
        <label className="ac-label">
          E-mail
          <input
            className="ac-input"
            type="email"
            name="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="you@example.net"
            autoComplete="email"
            required
          />
        </label>
        <div className="ac-form-actions">
          <button className="btn btn-primary" type="submit" disabled={busy}>
            {busy ? "Working…" : "Send reset link"}
          </button>
          <Link className="btn btn-ghost" href="/account">
            Back to sign-in
          </Link>
        </div>
      </form>
    </div>
  );
}
