import type { Metadata } from "next";
import { Suspense } from "react";

import { AccountGate } from "@/components/account/account-gate";
import { AccountShell } from "@/components/account/account-shell";
import { AuthMessages } from "@/components/account/auth-messages";
import { AuthLoading, AuthScene } from "@/components/account/auth-scene";
import { EmailVerifier } from "@/components/account/email-verifier";
import { ForgotPasswordForm } from "@/components/account/forgot-password-form";
import { LauncherConsent } from "@/components/account/launcher-consent";
import { ResetPasswordForm } from "@/components/account/reset-password-form";
import type { Locale } from "@/i18n/config";
import { getMessages } from "@/i18n/messages";
import { pageMetadata } from "@/lib/seo";

/**
 * The sign-in funnel in every language: /account (sign-in and register tabs),
 * /verify-email, /forgot-password, /reset-password and /launcher. These are
 * application surfaces, never indexed; the pages reached from an e-mail or
 * from the launcher also send no referrer, so their tokens stay in the URL bar.
 */
type AuthPage = "account" | "verify" | "forgot" | "reset" | "launcher";

const PATHS: Record<AuthPage, string> = {
  account: "/account",
  verify: "/verify-email",
  forgot: "/forgot-password",
  reset: "/reset-password",
  launcher: "/launcher",
};

/** Reached through a link carrying a token or a code. */
const NO_REFERRER: ReadonlySet<AuthPage> = new Set(["verify", "reset", "launcher"]);

export function authMetadata(page: AuthPage, locale: Locale): Metadata {
  const m = getMessages(locale).auth.pages[page];
  return {
    ...pageMetadata({ title: m.metaTitle, description: m.metaDescription, path: PATHS[page], locale }),
    robots: { index: false, follow: false },
    ...(NO_REFERRER.has(page) ? { referrer: "no-referrer" as const } : {}),
  };
}

export function AccountView({ locale }: { locale: Locale }) {
  const scene = getMessages(locale).auth.scenes.account;
  return (
    <AuthMessages locale={locale}>
      <AccountShell eyebrow={scene.eyebrow} title={scene.title} lead={scene.lead}>
        <AccountGate />
      </AccountShell>
    </AuthMessages>
  );
}

export function VerifyEmailView({ locale }: { locale: Locale }) {
  const m = getMessages(locale).auth;
  return (
    <AuthMessages locale={locale}>
      <AuthScene kind="verify">
        <Suspense fallback={<AuthLoading>{`${m.verifying}…`}</AuthLoading>}>
          <EmailVerifier />
        </Suspense>
      </AuthScene>
    </AuthMessages>
  );
}

export function ForgotPasswordView({ locale }: { locale: Locale }) {
  return (
    <AuthMessages locale={locale}>
      <AuthScene kind="forgot">
        <ForgotPasswordForm />
      </AuthScene>
    </AuthMessages>
  );
}

export function ResetPasswordView({ locale }: { locale: Locale }) {
  return (
    <AuthMessages locale={locale}>
      <AuthScene kind="reset">
        <Suspense fallback={<AuthLoading />}>
          <ResetPasswordForm />
        </Suspense>
      </AuthScene>
    </AuthMessages>
  );
}

export function LauncherView({ locale }: { locale: Locale }) {
  return (
    <AuthMessages locale={locale}>
      <AuthScene kind="launcher">
        <Suspense fallback={<AuthLoading />}>
          <LauncherConsent />
        </Suspense>
      </AuthScene>
    </AuthMessages>
  );
}
