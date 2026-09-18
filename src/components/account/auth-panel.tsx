"use client";

import Link from "next/link";
import { type FormEvent, useId, useState } from "react";
import { ArrowRightIcon, CheckIcon, InfoIcon } from "@/components/icons";
import { AuthField, PasswordField } from "@/components/account/auth-fields";
import { AuthIcon } from "@/components/account/auth-icon";
import * as master from "@/lib/account/api";
import { MasterApiError } from "@/lib/account/api";
import { useSession } from "@/lib/account/session";

type Mode = "login" | "register";

/** Shared sign-in card; credentials and verification codes stay in component memory. */
export function AuthPanel({ onError }: { onError?: (error: unknown) => void }) {
  const { start } = useSession();
  const id = useId();
  const [mode, setMode] = useState<Mode>("login");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [remember, setRemember] = useState(true);
  const [pendingVerify, setPendingVerify] = useState<{ email: string; password: string; tokenFromMaster: boolean } | null>(null);
  const [verifyToken, setVerifyToken] = useState("");
  const [resent, setResent] = useState(false);

  function fail(err: unknown) {
    setError(err instanceof MasterApiError ? err.message : "Something went wrong. Try again.");
    onError?.(err);
  }

  async function signIn(credentials: { email: string; password: string }) {
    const result = await master.login({ email: credentials.email, password: credentials.password, rememberMe: remember });
    start({ token: result.token, expiresAtUtc: result.expiresAtUtc, accountId: result.accountId,
      displayName: result.displayName, role: result.role, emailVerified: result.emailVerified, email: credentials.email });
  }

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    if (busy) return;
    setError(null); setBusy(true);
    try {
      if (mode === "login") await signIn({ email, password });
      else {
        const created = await master.register({ email, password, displayName });
        setPendingVerify({ email: created.email, password, tokenFromMaster: !!created.verificationToken });
        setVerifyToken(created.verificationToken ?? "");
        setPassword("");
      }
    } catch (err) { fail(err); }
    finally { setBusy(false); }
  }

  async function onVerify(event: FormEvent) {
    event.preventDefault();
    if (!pendingVerify || busy) return;
    setError(null); setBusy(true);
    try { await master.verifyEmail({ email: pendingVerify.email, token: verifyToken.trim() }); await signIn(pendingVerify); }
    catch (err) { fail(err); }
    finally { setBusy(false); }
  }

  async function onSkipVerify() {
    if (!pendingVerify || busy) return;
    setError(null); setBusy(true);
    try { await signIn(pendingVerify); }
    catch (err) { fail(err); }
    finally { setBusy(false); }
  }

  async function resend() {
    if (!pendingVerify || busy) return;
    setError(null); setBusy(true); setResent(false);
    try { await master.resendVerification({ email: pendingVerify.email }); setResent(true); }
    catch (err) { fail(err); }
    finally { setBusy(false); }
  }

  const feedback = error ? <p className="ac-error" role="alert"><InfoIcon /><span>{error}</span></p> : null;
  if (pendingVerify) return <div className="auth-panel ac-card">
    <span className="auth-state-icon"><AuthIcon name="mail" size={24} /></span>
    <div className="auth-panel-heading"><h2>Check your inbox.</h2><p>Account created for <strong>{pendingVerify.email}</strong>. {pendingVerify.tokenFromMaster ? "This development master has no mailer, so your code is prefilled below." : "Enter the verification code we sent you."}</p></div>
    {feedback}
    {resent && <p className="ac-success" role="status"><CheckIcon />A new verification e-mail has been requested. Use the latest code.</p>}
    <form className="ac-form" onSubmit={onVerify} aria-busy={busy}>
      <AuthField label="Verification code" icon="shield" name="verification-code" value={verifyToken} onChange={event => setVerifyToken(event.target.value)} placeholder="Paste your verification code" autoComplete="one-time-code" spellCheck={false} required disabled={busy} />
      <div className="ac-form-actions">
        <button className="btn btn-primary" type="submit" disabled={busy || !verifyToken.trim()}>{busy ? <><span className="auth-spinner" aria-hidden="true" />Working…</> : <>Verify & sign in <ArrowRightIcon /></>}</button>
        <button className="btn btn-ghost" type="button" disabled={busy} onClick={() => void resend()}>Resend verification e-mail</button>
        <button className="ac-forgot" type="button" disabled={busy} onClick={() => void onSkipVerify()}>Skip for now</button>
      </div>
    </form>
    <p className="auth-registration-note">You can verify later, but your e-mail must be verified before creating server license keys.</p>
  </div>;

  function selectMode(next: Mode) { setMode(next); setError(null); }
  return <div className="auth-panel ac-card">
    <div className="ac-tabs" role="tablist" aria-label="Sign in or create an account">
      {(["login", "register"] as const).map(value => <button key={value} className="ac-tab" role="tab" type="button"
        id={`${id}-${value}`} aria-controls={`${id}-panel`} aria-selected={mode === value} tabIndex={mode === value ? 0 : -1} disabled={busy}
        onClick={() => selectMode(value)} onKeyDown={event => {
          if (!["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)) return;
          event.preventDefault();
          const next = event.key === "Home" ? "login" : event.key === "End" ? "register" : mode === "login" ? "register" : "login";
          selectMode(next);
          document.getElementById(`${id}-${next}`)?.focus();
        }}>{value === "login" ? "Sign in" : "Create account"}</button>)}
    </div>
    <div role="tabpanel" id={`${id}-panel`} aria-labelledby={`${id}-${mode}`}>
      <div className="auth-panel-heading"><h2>{mode === "login" ? "Welcome back." : "Make yourself at home."}</h2><p>{mode === "login" ? "Sign in to your Open//77 account." : "Your next chapter starts with an account."}</p></div>
      {feedback}
      <form className="ac-form" onSubmit={onSubmit} aria-busy={busy}>
        {mode === "register" && <AuthField label="Display name" icon="user" name="display-name" value={displayName} onChange={event => setDisplayName(event.target.value)} placeholder="How other players see you" autoComplete="nickname" maxLength={32} required disabled={busy} />}
        <AuthField label="E-mail" type="email" name="email" value={email} onChange={event => setEmail(event.target.value)} placeholder="you@example.net" autoComplete="email" required disabled={busy} spellCheck={false} autoCapitalize="none" />
        <PasswordField key={mode} name="password" label="Password" value={password} onChange={event => setPassword(event.target.value)} placeholder={mode === "register" ? "Choose a strong password" : "Your password"} autoComplete={mode === "register" ? "new-password" : "current-password"} minLength={8} maxLength={128} required disabled={busy}
          hint={mode === "register" ? "8–128 characters. A unique passphrase works well." : undefined} />
        {mode === "login" && <label className="ac-remember"><input type="checkbox" name="remember" checked={remember} disabled={busy} onChange={event => setRemember(event.target.checked)} /><span>Keep me signed in</span></label>}
        <div className="ac-form-actions">
          <button className="btn btn-primary" type="submit" disabled={busy}>{busy ? <><span className="auth-spinner" aria-hidden="true" />{mode === "login" ? "Signing in…" : "Creating your account…"}</> : <>{mode === "login" ? "Sign in" : "Create account"}<ArrowRightIcon size={17} /></>}</button>
          {mode === "login" && <Link className="ac-forgot" href="/forgot-password">Forgot your password?</Link>}
        </div>
      </form>
      {mode === "register" && <p className="auth-registration-note">Creating an account is free. <Link href="/docs/alpha-access">Alpha access</Link> is a separate step to play and host.</p>}
    </div>
  </div>;
}
