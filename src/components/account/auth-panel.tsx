"use client";

import { type FormEvent, useState } from "react";

import { CheckIcon, InfoIcon } from "@/components/icons";
import * as master from "@/lib/account/api";
import { MasterApiError } from "@/lib/account/api";
import { useSession } from "@/lib/account/session";

type Mode = "login" | "register";

/**
 * Sign in / create account, as one card.
 *
 * Registration flows straight into e-mail verification: where the master runs
 * without a mailer (local development) it returns the verification token in
 * the register response and the field arrives prefilled; in production the
 * token comes from the inbox and the same field starts empty. Either way the
 * account is signed in automatically afterwards — the password is still in
 * hand, asking for it again would be ceremony.
 */
export function AuthPanel({ onError }: { onError?: (error: unknown) => void }) {
  const { start } = useSession();
  const [mode, setMode] = useState<Mode>("login");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");

  // Set after a successful register: the verify step replaces the form.
  const [pendingVerify, setPendingVerify] = useState<{
    email: string;
    password: string;
    token: string;
    tokenFromMaster: boolean;
  } | null>(null);
  const [verifyToken, setVerifyToken] = useState("");

  function fail(err: unknown) {
    setError(err instanceof MasterApiError ? err.message : "Something went wrong. Try again.");
    onError?.(err);
  }

  async function signIn(credentials: { email: string; password: string }) {
    const result = await master.login(credentials);
    start({
      token: result.token,
      expiresAtUtc: result.expiresAtUtc,
      accountId: result.accountId,
      displayName: result.displayName,
      role: result.role,
      emailVerified: result.emailVerified,
      email: credentials.email,
    });
  }

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setBusy(true);
    try {
      if (mode === "login") {
        await signIn({ email, password });
      } else {
        const created = await master.register({ email, password, displayName });
        setPendingVerify({
          email: created.email,
          password,
          token: created.verificationToken ?? "",
          tokenFromMaster: created.verificationToken !== null,
        });
        setVerifyToken(created.verificationToken ?? "");
      }
    } catch (err) {
      fail(err);
    } finally {
      setBusy(false);
    }
  }

  async function onVerify(event: FormEvent) {
    event.preventDefault();
    if (!pendingVerify) return;
    setError(null);
    setBusy(true);
    try {
      await master.verifyEmail({ email: pendingVerify.email, token: verifyToken.trim() });
      await signIn(pendingVerify);
    } catch (err) {
      fail(err);
    } finally {
      setBusy(false);
    }
  }

  async function onSkipVerify() {
    if (!pendingVerify) return;
    setError(null);
    setBusy(true);
    try {
      await signIn(pendingVerify);
    } catch (err) {
      fail(err);
    } finally {
      setBusy(false);
    }
  }

  if (pendingVerify) {
    return (
      <div className="ac-card">
        <h2 className="ac-card-title">Verify your e-mail</h2>
        <p className="ac-lead" style={{ margin: "10px 0 18px" }}>
          Account created for <strong>{pendingVerify.email}</strong>.{" "}
          {pendingVerify.tokenFromMaster
            ? "This development master has no mailer, so your verification code is prefilled below."
            : "We sent a verification code to your inbox."}{" "}
          Verification is required before you can create server license keys.
        </p>
        {error ? (
          <p className="ac-error" role="alert">
            <InfoIcon />
            {error}
          </p>
        ) : null}
        <form className="ac-form" onSubmit={onVerify}>
          <label className="ac-label">
            Verification code
            <input
              className="ac-input"
              name="verification-code"
              value={verifyToken}
              onChange={(event) => setVerifyToken(event.target.value)}
              placeholder="43-character code"
              autoComplete="one-time-code"
              spellCheck={false}
              required
            />
          </label>
          <div className="ac-form-actions">
            <button className="btn btn-primary" type="submit" disabled={busy || verifyToken.trim().length === 0}>
              <CheckIcon />
              {busy ? "Working…" : "Verify & sign in"}
            </button>
            <button className="btn btn-ghost" type="button" disabled={busy} onClick={onSkipVerify}>
              Skip for now
            </button>
          </div>
        </form>
      </div>
    );
  }

  return (
    <div className="ac-card">
      <div className="ac-tabs" role="tablist" aria-label="Sign in or create an account">
        <button
          className="ac-tab"
          role="tab"
          type="button"
          aria-selected={mode === "login"}
          onClick={() => {
            setMode("login");
            setError(null);
          }}
        >
          Sign in
        </button>
        <button
          className="ac-tab"
          role="tab"
          type="button"
          aria-selected={mode === "register"}
          onClick={() => {
            setMode("register");
            setError(null);
          }}
        >
          Create account
        </button>
      </div>

      {error ? (
        <p className="ac-error" role="alert">
          <InfoIcon />
          {error}
        </p>
      ) : null}

      <form className="ac-form" onSubmit={onSubmit} style={error ? { marginTop: 14 } : undefined}>
        {mode === "register" ? (
          <label className="ac-label">
            Display name
            <input
              className="ac-input"
              name="display-name"
              value={displayName}
              onChange={(event) => setDisplayName(event.target.value)}
              placeholder="How other players see you"
              autoComplete="nickname"
              maxLength={32}
              required
            />
          </label>
        ) : null}
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
        <label className="ac-label">
          Password
          <input
            className="ac-input"
            type="password"
            name="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            placeholder={mode === "register" ? "8–128 characters" : "Your password"}
            autoComplete={mode === "register" ? "new-password" : "current-password"}
            minLength={8}
            maxLength={128}
            required
          />
          {mode === "register" ? (
            <span className="ac-hint">At least 8 characters. A passphrase works best.</span>
          ) : null}
        </label>
        <div className="ac-form-actions">
          <button className="btn btn-primary" type="submit" disabled={busy}>
            {busy ? "Working…" : mode === "login" ? "Sign in" : "Create account"}
          </button>
        </div>
      </form>
    </div>
  );
}
