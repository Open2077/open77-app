"use client";

import Image from "next/image";
import Link from "next/link";
import { type FormEvent, type ReactNode, useEffect, useState } from "react";
import { AuthIcon } from "@/components/account/auth-icon";
import { ArrowRightIcon, CheckIcon, CodeIcon, DownloadIcon, InfoIcon, KeyIcon, PeopleIcon, ServerRackIcon, ShieldIcon, SignOutIcon, WindowsIcon } from "@/components/icons";
import * as master from "@/lib/account/api";
import { type Account, MasterApiError } from "@/lib/account/api";
import { canDownloadServer } from "@/lib/account/host-access";
import { type StoredSession, useSession } from "@/lib/account/session";

function formatDate(iso: string): string {
  const date = new Date(iso);
  return Number.isNaN(date.getTime()) ? "Date unavailable" : date.toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" });
}

function Shortcut({ href, title, description, icon, label, className = "" }: {
  href: string; title: string; description: string; icon: ReactNode; label: string; className?: string;
}) {
  return <Link className={`account-tile account-shortcut ${className}`} href={href}>
    <span className="account-tile-top"><span className="account-tile-icon">{icon}</span><span className="account-tile-arrow"><ArrowRightIcon size={21} /></span></span>
    <span className="account-micro">{label}</span><h2>{title}</h2><p>{description}</p>
  </Link>;
}

/** Live master data only; the cached session must never imply Alpha entitlement. */
export function AccountOverview({ session }: { session: StoredSession }) {
  const { clear, update } = useSession();
  const [account, setAccount] = useState<Account | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [retry, setRetry] = useState(0);
  const [busy, setBusy] = useState<"verify" | "resend" | "logout" | null>(null);
  const [verifyToken, setVerifyToken] = useState("");
  const [verifyOpen, setVerifyOpen] = useState(false);

  useEffect(() => {
    let cancelled = false;
    master.me(session.token).then(result => {
      if (cancelled) return;
      setAccount(result);
      update({ emailVerified: result.emailVerified, displayName: result.displayName, email: result.email });
    }).catch((err: unknown) => {
      if (cancelled) return;
      if (err instanceof MasterApiError && err.status === 401) clear();
      else setLoadError(err instanceof MasterApiError ? err.message : "Could not load your account.");
    });
    return () => { cancelled = true; };
    // Updating the cached profile must not refetch /me in a loop.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session.token, retry]);

  async function onVerify(event: FormEvent) {
    event.preventDefault();
    if (!account || busy || !verifyToken.trim()) return;
    setError(null); setNotice(null); setBusy("verify");
    try {
      await master.verifyEmail({ email: account.email, token: verifyToken.trim() });
      setAccount({ ...account, emailVerified: true });
      update({ emailVerified: true });
      setVerifyOpen(false); setVerifyToken(""); setNotice("Your e-mail is verified. You're all set.");
    } catch (err) { setError(err instanceof MasterApiError ? err.message : "Verification failed. Try again."); }
    finally { setBusy(null); }
  }

  async function onResend() {
    if (!account || busy) return;
    setError(null); setNotice(null); setBusy("resend");
    try {
      await master.resendVerification({ email: account.email });
      setNotice("Verification requested. Check your inbox and spam folder for the latest e-mail.");
    } catch (err) { setError(err instanceof MasterApiError ? err.message : "Could not request a verification e-mail. Try again."); }
    finally { setBusy(null); }
  }

  async function onSignOut() {
    if (busy) return;
    setBusy("logout");
    try { await master.logout(session.token); }
    catch { /* A revoked or offline session is still cleared locally. */ }
    finally { clear(); }
  }

  return <>
    <header className="account-heading">
      <div><p className="account-kicker"><span aria-hidden="true">{"//"}</span> YOUR OPEN//77 SPACE</p><h1>My account<span>.</span></h1><p>Everything you need. One place to make it yours.</p></div>
      <button className="account-button account-signout" type="button" onClick={onSignOut} disabled={busy !== null}><SignOutIcon size={17} />{busy === "logout" ? "Signing out…" : "Sign out"}</button>
    </header>

    {!account ? <div className="account-tile account-load" aria-live="polite">
      {loadError ? <><InfoIcon size={24} /><h2>Let’s reconnect.</h2><p role="alert">{loadError}</p><button className="account-button" onClick={() => { setLoadError(null); setRetry(value => value + 1); }}>Try again <ArrowRightIcon /></button></> : <><span className="auth-spinner" aria-hidden="true" /><p role="status">Loading your account…</p></>}
    </div> : <>
      {error && <p className="ac-error account-feedback" role="alert"><InfoIcon />{error}</p>}
      {notice && <p className="ac-success account-feedback" role="status"><CheckIcon />{notice}</p>}
      {!account.emailVerified && <section className="account-verification" aria-labelledby="account-verify-title">
        <div className="account-verification-copy"><AuthIcon name="mail" /><div><h2 id="account-verify-title">One last thing: verify your e-mail.</h2><p>Check your inbox before creating server license keys.</p></div></div>
        <div className="account-inline-actions"><button className="account-button" onClick={onResend} disabled={busy !== null}>{busy === "resend" ? "Sending…" : "Resend e-mail"}</button><button className="account-text-link" aria-expanded={verifyOpen} aria-controls="account-verification-form" disabled={busy !== null} onClick={() => setVerifyOpen(value => !value)}>{verifyOpen ? "Cancel" : "Enter a code"}</button></div>
        {verifyOpen && <form className="account-verification-form" id="account-verification-form" onSubmit={onVerify}>
          <label htmlFor="account-verification-code">Verification code</label><div><input className="ac-input" id="account-verification-code" name="verification-code" value={verifyToken} onChange={event => setVerifyToken(event.target.value)} placeholder="Code from your verification e-mail" autoComplete="one-time-code" spellCheck={false} required disabled={busy !== null} /><button className="account-button account-button-primary" disabled={busy !== null || !verifyToken.trim()} type="submit">{busy === "verify" ? "Verifying…" : "Verify e-mail"}<ArrowRightIcon /></button></div>
        </form>}
      </section>}

      <section className="account-bento" aria-label="Your account and shortcuts">
        <article className="account-tile account-welcome">
          <Image className="account-welcome-art" src="/assets/auth/night-city-login-v2.webp" alt="" fill sizes="(max-width: 760px) 100vw, (max-width: 1100px) 90vw, 750px" preload />
          <div className="account-welcome-top"><span className="account-avatar" aria-hidden="true">{Array.from(account.displayName.trim())[0]?.toUpperCase() || "V"}</span><span className={`account-status ${canDownloadServer(account) ? "is-enabled" : ""}`}>{canDownloadServer(account) ? "Alpha access enabled" : "Platform account"}</span></div>
          <div className="account-welcome-copy"><p className="account-micro">NIGHT CITY IS BETTER TOGETHER</p><h2>Welcome back,<br /><span>{account.displayName || "choom"}.</span></h2><p>Your next session. Your next server.<br />It all starts here.</p></div>
          <dl className="ac-profile-grid account-profile-facts"><div><dt>E-mail</dt><dd>{account.email}<span className={`account-email-state ${account.emailVerified ? "is-verified" : ""}`}>{account.emailVerified ? <><CheckIcon size={12} /> Verified</> : "Not verified"}</span></dd></div><div><dt>Account role</dt><dd>{account.role}</dd></div></dl>
        </article>
        <Shortcut href="/account/keys" title="My licenses." label="HOST & MANAGE" description="Your servers start with a key. Create, inspect and manage your licenses." icon={<KeyIcon size={25} />} className="account-licenses" />
        <Shortcut href="#identities" title="My identities." label={`${account.identities.length} LINKED ${account.identities.length === 1 ? "IDENTITY" : "IDENTITIES"}`} description="Your game clients, linked to one account. See who's ready to play." icon={<PeopleIcon size={26} />} className="account-identities-shortcut" />
        <Shortcut href="/download#get" title="Get the launcher." label="PLAY TOGETHER" description="Install, update and jump into a different Night City." icon={<WindowsIcon size={25} />} className="account-launcher-shortcut" />
        <article className="account-tile account-server-shortcut" data-server-download={canDownloadServer(account) ? "" : undefined}>
          <span className="account-tile-top"><span className="account-tile-icon"><ServerRackIcon size={26} /></span><span className="account-os">WIN / LINUX</span></span><span className="account-micro">BUILD YOUR WORLD</span><h2>Run your server.</h2><p>{canDownloadServer(account) ? "Your Alpha access includes the dedicated server. Make it your own." : "Dedicated servers for Alpha members. Check access and get set up."}</p><Link className="account-text-link" href="/host">Download server <DownloadIcon size={17} /></Link>
        </article>
        <Shortcut href="/docs" title="Make something new." label="DOCUMENTATION" description="From your first resource to your own gamemode. Explore the guides and Lua APIs." icon={<CodeIcon size={26} />} className="account-docs-shortcut" />
      </section>

      <div className="account-section-heading"><h2>The details, connected.</h2><span className="account-micro">YOUR IDENTITY. YOUR CONTROL.</span></div>
      <div className="account-details-grid">
        <section className="account-tile account-identities" id="identities" aria-labelledby="identities-title" tabIndex={-1}>
          <header className="account-panel-heading"><span className="account-tile-icon"><PeopleIcon size={23} /></span><div><h2 id="identities-title">Linked game identities</h2><p>The clients connected to your account.</p></div><span className="account-count">{account.identities.length}</span></header>
          {account.identities.length === 0 ? <div className="account-empty"><AuthIcon name="game" size={34} /><h3>Your first connection starts here.</h3><p>Sign into the launcher and complete the game setup. Your linked identity will appear here.</p><Link className="account-text-link" href="/download#get">Get the launcher <ArrowRightIcon /></Link></div> : <ul className="account-identity-list">{account.identities.map(identity => <li key={identity.userId}><span className="account-identity-avatar" aria-hidden="true"><AuthIcon name="user" size={19} /></span><div><h3>{identity.displayName}</h3><code>{identity.userId}</code></div><span className="account-identity-date">Linked <time dateTime={identity.linkedAtUtc}>{formatDate(identity.linkedAtUtc)}</time></span></li>)}</ul>}
          <p className="account-panel-foot"><ShieldIcon size={14} />Linked by the launcher. Never share your identity key.</p>
        </section>
        <section className="account-tile account-connections" aria-labelledby="connections-title">
          <header className="account-panel-heading"><span className="account-tile-icon"><AuthIcon name="link" size={23} /></span><div><h2 id="connections-title">Make it yours</h2><p>Your creator tools and account settings.</p></div></header>
          <div className="account-connection-links">
            <Link href="/account/profile"><AuthIcon name="user" size={20} /><span><strong>Creator profile</strong><small>Your public presence on the Workshop</small></span><ArrowRightIcon /></Link>
            <Link href="/account/github"><CodeIcon size={20} /><span><strong>GitHub connection</strong><small>Connect your developer identity</small></span><ArrowRightIcon /></Link>
            <Link href="/account/connections"><ServerRackIcon size={20} /><span><strong>Warden connections</strong><small>Manage authorized server consoles</small></span><ArrowRightIcon /></Link>
            <Link href="/forgot-password"><AuthIcon name="lock" size={20} /><span><strong>Password & access</strong><small>Request a secure password reset</small></span><ArrowRightIcon /></Link>
          </div>
        </section>
      </div>
      <aside className="account-explore"><span><span className="account-live-dot" aria-hidden="true" />The city is yours to explore.</span><div><Link href="/servers">Find a server <ArrowRightIcon /></Link><Link href="/workshop">Explore the Workshop <ArrowRightIcon /></Link>{!canDownloadServer(account) && <Link href="/docs/alpha-access">About Alpha access <ArrowRightIcon /></Link>}</div></aside>
    </>}
  </>;
}
