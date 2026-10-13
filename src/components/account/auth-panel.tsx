"use client";

import { type FormEvent, useId, useState } from "react";

import { Button } from "@/components/ui/button";
import { cx } from "@/components/ui/cx";
import { Notice } from "@/components/ui/feedback";
import { Checkbox } from "@/components/ui/field";
import { arrowRight01, mail01, shield01, user } from "@/components/ui/icons";
import { Panel } from "@/components/ui/panel";
import { SmartLink } from "@/components/ui/smart-link";
import { Display } from "@/components/ui/typography";
import * as master from "@/lib/account/api";
import { MasterApiError } from "@/lib/account/api";
import { useSession } from "@/lib/account/session";
import { AuthField, PasswordField } from "./auth-fields";
import { Glyph } from "./kit";

import styles from "./auth-panel.module.css";

type Mode = "login" | "register";
type FieldName = "email" | "password" | "displayName";

/** Master error codes that belong to one field; everything else is a form-level error. */
const FIELD_FOR_CODE: Record<string, FieldName> = {
  invalid_email: "email",
  email_taken: "email",
  invalid_password: "password",
  invalid_display_name: "displayName",
};

/** Shared sign-in card; credentials and verification codes stay in component memory. */
export function AuthPanel({ onError }: { onError?: (error: unknown) => void }) {
  const { start } = useSession();
  const id = useId();
  const [mode, setMode] = useState<Mode>("login");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldError, setFieldError] = useState<{ field: FieldName; message: string; code: string } | null>(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [remember, setRemember] = useState(true);
  const [pendingVerify, setPendingVerify] = useState<{ email: string; password: string; tokenFromMaster: boolean } | null>(null);
  const [verifyToken, setVerifyToken] = useState("");
  const [resent, setResent] = useState(false);

  function fail(err: unknown) {
    const field = err instanceof MasterApiError ? FIELD_FOR_CODE[err.code] : undefined;
    if (err instanceof MasterApiError && field && !pendingVerify) {
      setFieldError({ field, message: err.message, code: err.code });
    } else {
      setError(err instanceof MasterApiError ? err.message : "Something went wrong. Try again.");
    }
    onError?.(err);
  }

  function clearFieldError(field: FieldName) {
    if (fieldError?.field === field) setFieldError(null);
  }

  async function signIn(credentials: { email: string; password: string }) {
    const result = await master.login({ email: credentials.email, password: credentials.password, rememberMe: remember });
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
    if (busy) return;
    setError(null);
    setFieldError(null);
    setBusy(true);
    try {
      if (mode === "login") await signIn({ email, password });
      else {
        const created = await master.register({ email, password, displayName });
        setPendingVerify({ email: created.email, password, tokenFromMaster: !!created.verificationToken });
        setVerifyToken(created.verificationToken ?? "");
        setPassword("");
      }
    } catch (err) {
      fail(err);
    } finally {
      setBusy(false);
    }
  }

  async function onVerify(event: FormEvent) {
    event.preventDefault();
    if (!pendingVerify || busy) return;
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
    if (!pendingVerify || busy) return;
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

  async function resend() {
    if (!pendingVerify || busy) return;
    setError(null);
    setBusy(true);
    setResent(false);
    try {
      await master.resendVerification({ email: pendingVerify.email });
      setResent(true);
    } catch (err) {
      fail(err);
    } finally {
      setBusy(false);
    }
  }

  const feedback = error ? (
    <Notice kind="danger" title={mode === "login" && !pendingVerify ? "Sign-in failed" : undefined}>
      {error}
    </Notice>
  ) : null;

  if (pendingVerify)
    return (
      <Panel brackets padding="md" className={styles.panel} data-auth-panel>
        <div className={styles.head}>
          <Glyph glyph={mail01} />
          <Display as="h2" size="sm">
            Verify your e-mail
          </Display>
          <p className={styles.text}>
            Account created for <strong>{pendingVerify.email}</strong>.{" "}
            {pendingVerify.tokenFromMaster
              ? "This development master has no mailer, so your verification code is prefilled below."
              : "We sent a verification code to your inbox."}
          </p>
        </div>
        {feedback}
        {resent ? (
          <Notice kind="success" title="Verification e-mail requested">
            Use the code from the latest e-mail.
          </Notice>
        ) : null}
        <form className={styles.form} onSubmit={onVerify} aria-busy={busy}>
          <AuthField
            label="Verification code"
            icon={shield01}
            name="verification-code"
            value={verifyToken}
            onChange={(event) => setVerifyToken(event.target.value)}
            placeholder="Paste your verification code"
            autoComplete="one-time-code"
            spellCheck={false}
            required
            disabled={busy}
          />
          <div className={styles.actions}>
            <Button key={busy ? "Working…" : "Verify and sign in"} type="submit" icon={arrowRight01} busy={busy} disabled={!verifyToken.trim()}>
              {busy ? "Working…" : "Verify and sign in"}
            </Button>
          </div>
          <div className={styles.secondary}>
            <Button lines="none" color="neutral" border size="sm" disabled={busy} onClick={() => void resend()}>
              Resend verification e-mail
            </Button>
            <button className={styles.textButton} type="button" disabled={busy} onClick={() => void onSkipVerify()}>
              Skip for now
            </button>
          </div>
        </form>
        <p className={styles.note}>You can verify later; verification is required before you can create server license keys.</p>
      </Panel>
    );

  function selectMode(next: Mode) {
    setMode(next);
    setError(null);
    setFieldError(null);
  }
  const errorFor = (field: FieldName) => (fieldError?.field === field ? fieldError.message : undefined);
  const submitLabel = busy ? (mode === "login" ? "Signing in…" : "Creating your account…") : mode === "login" ? "Sign in" : "Create account";

  return (
    <Panel brackets padding="md" className={styles.panel} data-auth-panel>
      <div className={styles.tabs} role="tablist" aria-label="Sign in or create an account">
        {(["login", "register"] as const).map((value) => (
          <button
            key={value}
            className={styles.tab}
            role="tab"
            type="button"
            id={`${id}-${value}`}
            aria-controls={`${id}-panel`}
            aria-selected={mode === value}
            tabIndex={mode === value ? 0 : -1}
            disabled={busy}
            onClick={() => selectMode(value)}
            onKeyDown={(event) => {
              if (!["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)) return;
              event.preventDefault();
              const next = event.key === "Home" ? "login" : event.key === "End" ? "register" : mode === "login" ? "register" : "login";
              selectMode(next);
              document.getElementById(`${id}-${next}`)?.focus();
            }}
          >
            <span className={styles.tabIndex}>{value === "login" ? "01" : "02"}</span>
            {value === "login" ? "Sign in" : "Create account"}
          </button>
        ))}
      </div>
      <div role="tabpanel" id={`${id}-panel`} aria-labelledby={`${id}-${mode}`} className={styles.body}>
        <p className={styles.text}>
          {mode === "login"
            ? "Your OPEN//77 platform account, the same one the launcher uses."
            : "Free, and it takes a minute. Alpha access is a separate step."}
        </p>
        {feedback}
        <form className={styles.form} onSubmit={onSubmit} aria-busy={busy}>
          {mode === "register" ? (
            <AuthField
              label="Display name"
              icon={user}
              name="display-name"
              value={displayName}
              onChange={(event) => {
                setDisplayName(event.target.value);
                clearFieldError("displayName");
              }}
              placeholder="How other players see you"
              autoComplete="nickname"
              maxLength={32}
              required
              disabled={busy}
              error={errorFor("displayName")}
            />
          ) : null}
          <AuthField
            label="E-mail"
            type="email"
            name="email"
            value={email}
            onChange={(event) => {
              setEmail(event.target.value);
              clearFieldError("email");
            }}
            placeholder="you@example.net"
            autoComplete="email"
            required
            disabled={busy}
            spellCheck={false}
            autoCapitalize="none"
            error={
              fieldError?.field === "email" ? (
                <>
                  {fieldError.message}
                  {fieldError.code === "email_taken" && mode === "register" ? (
                    <>
                      {" "}
                      <button type="button" className={styles.inlineButton} onClick={() => selectMode("login")}>
                        Sign in instead
                      </button>
                    </>
                  ) : null}
                </>
              ) : undefined
            }
          />
          <PasswordField
            key={mode}
            name="password"
            label="Password"
            value={password}
            onChange={(event) => {
              setPassword(event.target.value);
              clearFieldError("password");
            }}
            placeholder={mode === "register" ? "Choose a strong password" : "Your password"}
            autoComplete={mode === "register" ? "new-password" : "current-password"}
            minLength={8}
            maxLength={128}
            required
            disabled={busy}
            hint={mode === "register" ? "At least 8 characters. A passphrase works best." : undefined}
            error={errorFor("password")}
          />
          {mode === "login" ? (
            <div className={styles.row}>
              <Checkbox name="remember" checked={remember} disabled={busy} onChange={(event) => setRemember(event.target.checked)}>
                Keep me signed in
              </Checkbox>
              <SmartLink href="/forgot-password" className={styles.forgot}>
                Forgot your password?
              </SmartLink>
            </div>
          ) : null}
          <div className={cx(styles.actions, styles.submit)}>
            <Button key={submitLabel} type="submit" icon={arrowRight01} busy={busy}>
              {submitLabel}
            </Button>
          </div>
        </form>
        {mode === "register" ? (
          <p className={styles.note}>
            Creating an account is free. <SmartLink href="/docs/alpha-access">Alpha access</SmartLink> is a separate step to play and host.
          </p>
        ) : null}
      </div>
    </Panel>
  );
}
