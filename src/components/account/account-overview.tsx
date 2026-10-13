"use client";

import NextLink from "next/link";
import { type FormEvent, type ReactNode, useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import { Tag } from "@/components/ui/chip";
import { cx } from "@/components/ui/cx";
import { DefinitionList } from "@/components/ui/data";
import { Notice } from "@/components/ui/feedback";
import { Field, Input } from "@/components/ui/field";
import { Icon } from "@/components/ui/icon";
import {
  arrowRight01,
  download02,
  gameController03,
  github,
  key01,
  link01,
  mail01,
  serverStack01,
  shield01,
  user,
  userGroup,
} from "@/components/ui/icons";
import { Panel } from "@/components/ui/panel";
import { Display, Eyebrow } from "@/components/ui/typography";
import * as master from "@/lib/account/api";
import { type Account, MasterApiError } from "@/lib/account/api";
import { canDownloadServer } from "@/lib/account/host-access";
import { type StoredSession, useSession } from "@/lib/account/session";
import { ArrowLink, Block, Fine, Glyph, Pending, Row, Rows, formatDay, padlock } from "./kit";

import styles from "./account-overview.module.css";

/** A dashboard shortcut: the slanted card of the home page, as a link. */
function Shortcut({
  href,
  title,
  description,
  glyph,
  label,
  id,
}: {
  href: string;
  title: string;
  description: string;
  glyph: string;
  label: string;
  id?: string;
}) {
  const body = (
    <>
      <span className={styles.cardTop}>
        <Glyph glyph={glyph} />
        <Icon glyph={arrowRight01} className={styles.cardArrow} />
      </span>
      <span className={styles.cardLabel}>{label}</span>
      <span className={styles.cardTitle}>{title}</span>
      <span className={styles.cardText}>{description}</span>
    </>
  );
  // In-page anchors stay plain anchors so the browser scrolls and focuses them.
  if (href.startsWith("#"))
    return (
      <a className={styles.card} href={href} data-shortcut={id}>
        {body}
      </a>
    );
  return (
    <NextLink className={styles.card} href={href} data-shortcut={id}>
      {body}
    </NextLink>
  );
}

function SettingLink({ href, glyph, title, detail }: { href: string; glyph: string; title: string; detail: ReactNode }) {
  return (
    <li>
      <NextLink href={href} className={styles.setting}>
        <Icon glyph={glyph} className={styles.settingGlyph} />
        <span className={styles.settingCopy}>
          <strong>{title}</strong>
          <small>{detail}</small>
        </span>
        <Icon glyph={arrowRight01} className={styles.settingArrow} />
      </NextLink>
    </li>
  );
}

/** Live master data only; the cached session must never imply Alpha entitlement. */
export function AccountOverview({ session }: { session: StoredSession }) {
  const { clear, update } = useSession();
  const [account, setAccount] = useState<Account | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [retry, setRetry] = useState(0);
  const [busy, setBusy] = useState<"verify" | "resend" | null>(null);
  const [verifyToken, setVerifyToken] = useState("");
  const [verifyOpen, setVerifyOpen] = useState(false);

  useEffect(() => {
    let cancelled = false;
    master
      .me(session.token)
      .then((result) => {
        if (cancelled) return;
        setAccount(result);
        update({ emailVerified: result.emailVerified, displayName: result.displayName, email: result.email });
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        if (err instanceof MasterApiError && err.status === 401) clear();
        else setLoadError(err instanceof MasterApiError ? err.message : "Could not load your account.");
      });
    return () => {
      cancelled = true;
    };
    // Updating the cached profile must not refetch /me in a loop.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session.token, retry]);

  async function onVerify(event: FormEvent) {
    event.preventDefault();
    if (!account || busy || !verifyToken.trim()) return;
    setError(null);
    setNotice(null);
    setBusy("verify");
    try {
      await master.verifyEmail({ email: account.email, token: verifyToken.trim() });
      setAccount({ ...account, emailVerified: true });
      update({ emailVerified: true });
      setVerifyOpen(false);
      setVerifyToken("");
      setNotice("Your e-mail is verified. You're all set.");
    } catch (err) {
      setError(err instanceof MasterApiError ? err.message : "Verification failed. Try again.");
    } finally {
      setBusy(null);
    }
  }

  async function onResend() {
    if (!account || busy) return;
    setError(null);
    setNotice(null);
    setBusy("resend");
    try {
      await master.resendVerification({ email: account.email });
      setNotice("Verification requested. Check your inbox and spam folder for the latest e-mail.");
    } catch (err) {
      setError(err instanceof MasterApiError ? err.message : "Could not request a verification e-mail. Try again.");
    } finally {
      setBusy(null);
    }
  }

  if (!account)
    return loadError ? (
      <div data-account-load>
        <Notice
          kind="danger"
          title="Could not load your account."
          action={
            <Button
              lines="none"
              border
              size="sm"
              color="red"
              icon={arrowRight01}
              onClick={() => {
                setLoadError(null);
                setRetry((value) => value + 1);
              }}
            >
              Try again
            </Button>
          }
        >
          {loadError}
        </Notice>
      </div>
    ) : (
      <div data-account-load aria-live="polite">
        <Pending label="Loading your account" />
      </div>
    );

  const alpha = canDownloadServer(account);
  const identityCount = account.identities.length;

  return (
    <div className={styles.overview} data-account-overview>
      {error ? <Notice kind="danger">{error}</Notice> : null}
      {notice ? <Notice kind="success">{notice}</Notice> : null}

      {!account.emailVerified ? (
        <Panel as="section" variant="outline" padding="md" className={styles.verify} aria-labelledby="account-verify-title" data-account-verification>
          <div className={styles.verifyHead}>
            <Glyph glyph={mail01} />
            <div className={styles.verifyCopy}>
              <h2 id="account-verify-title" className={styles.verifyTitle}>
                Your e-mail is not verified yet.
              </h2>
              <p className={styles.verifyText}>
                Verification is required before you can create server license keys. Use the code from your inbox, or request a new e-mail.
              </p>
            </div>
            <div className={styles.verifyActions}>
              <Button key={busy === "resend" ? "Sending…" : "Resend e-mail"} lines="none" size="sm" busy={busy === "resend"} disabled={busy !== null} onClick={onResend}>
                {busy === "resend" ? "Sending…" : "Resend e-mail"}
              </Button>
              <button
                type="button"
                className={styles.toggle}
                aria-expanded={verifyOpen}
                aria-controls="account-verification-form"
                disabled={busy !== null}
                onClick={() => setVerifyOpen((value) => !value)}
              >
                {verifyOpen ? "Cancel" : "Enter a code"}
              </button>
            </div>
          </div>
          {verifyOpen ? (
            <form className={styles.verifyForm} id="account-verification-form" onSubmit={onVerify} data-account-verification-form>
              <Field label="Verification code">
                <Input
                  icon={shield01}
                  name="verification-code"
                  value={verifyToken}
                  onChange={(event) => setVerifyToken(event.target.value)}
                  placeholder="Code from your verification e-mail"
                  autoComplete="one-time-code"
                  spellCheck={false}
                  required
                  disabled={busy !== null}
                />
              </Field>
              <Button key={busy === "verify" ? "Verifying…" : "Verify e-mail"} type="submit" lines="none" icon={arrowRight01} busy={busy === "verify"} disabled={busy !== null || !verifyToken.trim()}>
                {busy === "verify" ? "Verifying…" : "Verify e-mail"}
              </Button>
            </form>
          ) : null}
        </Panel>
      ) : null}

      <Panel as="section" brackets padding="lg" className={styles.pass} aria-labelledby="account-pass-title">
        <div className={styles.passMain}>
          <div className={styles.passStatus}>
            <Eyebrow>Profile</Eyebrow>
            <span data-account-status>
              {alpha ? (
                <Tag variant="solid" className={styles.status}>
                  Alpha access enabled
                </Tag>
              ) : (
                <Tag tone="neutral" className={styles.status}>
                  Platform account
                </Tag>
              )}
            </span>
          </div>
          <Display as="h2" size="sm" id="account-pass-title" className={styles.passTitle}>
            Signed in as <span className={styles.passName}>{account.displayName || account.email}</span>
          </Display>
          <p className={styles.passText}>
            {alpha
              ? "Your account can play on community servers and download the Windows and Linux dedicated server. No further application needed."
              : "Your account is ready. Joining servers and hosting need Alpha access. Request it with /alpha apply on our Discord."}
          </p>
        </div>
        <DefinitionList
          className={styles.facts}
          items={[
            {
              label: "E-mail",
              value: (
                <span className={styles.email}>
                  <span>{account.email}</span>
                  <span className={cx(styles.emailState, account.emailVerified && styles.verified)} data-email-state>
                    {account.emailVerified ? "Verified" : "Not verified"}
                  </span>
                </span>
              ),
            },
            { label: "Account role", value: account.role },
            { label: "Game identities", value: <span data-identity-count>{identityCount}</span> },
          ]}
        />
      </Panel>

      <section className={styles.cards} aria-label="Shortcuts">
        <Shortcut
          id="keys"
          href="/account/keys"
          label="Keymaster"
          title="Server license keys"
          glyph={key01}
          description="License keys let your dedicated servers register on the OPEN//77 platform. Create, inspect and revoke them here."
        />
        <Shortcut
          id="identities"
          href="#identities"
          label={`${identityCount} linked ${identityCount === 1 ? "identity" : "identities"}`}
          title="Linked game identities"
          glyph={userGroup}
          description="The game clients that signed in through the launcher with this account."
        />
        <Shortcut
          id="launcher"
          href="/download#get"
          label="Play"
          title="Get the launcher"
          glyph={gameController03}
          description="It signs you in, checks your game build, installs the mod and opens the server browser."
        />
        <div className={cx(styles.card, styles.static)} data-server-download={alpha ? "" : undefined}>
          <span className={styles.cardTop}>
            <Glyph glyph={serverStack01} />
            <span className={styles.os}>Win / Linux</span>
          </span>
          <span className={styles.cardLabel}>Host</span>
          <span className={styles.cardTitle}>Dedicated server</span>
          <span className={styles.cardText}>
            {alpha
              ? "Your account can download and run the Windows and Linux dedicated server. You do not need to apply again or have a staff role."
              : "Every Alpha account can download the dedicated server, with no separate developer application. This account does not have Alpha access yet."}
          </span>
          <span className={styles.cardAction}>
            <Button lines="none" size="sm" border icon={download02} href="/host">Download server</Button>
          </span>
        </div>
      </section>

      <div className={styles.details}>
        <Block
          id="identities"
          eyebrow="Linked by the launcher"
          title={
            <>
              Game identities <span className={styles.count}>{String(identityCount).padStart(2, "0")}</span>
            </>
          }
          lead="Game clients that proved possession of their identity key through the launcher."
        >
          {identityCount === 0 ? (
            <div className={styles.empty} data-account-empty>
              <Glyph glyph={gameController03} />
              <div className={styles.emptyCopy}>
                <h3 className={styles.emptyTitle}>No game client is linked yet.</h3>
                <p className={styles.emptyText}>
                  Sign into the launcher with this account and follow its game setup; linking proves possession of the client identity key.
                </p>
                <ArrowLink href="/download#get">Get the launcher</ArrowLink>
              </div>
            </div>
          ) : (
            <Rows label="Linked game identities">
              {account.identities.map((identity) => (
                <Row
                  key={identity.userId}
                  leading={<Glyph glyph={user} />}
                  title={identity.displayName}
                  description={<code className={styles.mono}>{identity.userId}</code>}
                  aside={
                    <span className={styles.date}>
                      Linked <time dateTime={identity.linkedAtUtc}>{formatDay(identity.linkedAtUtc)}</time>
                    </span>
                  }
                />
              ))}
            </Rows>
          )}
          <Fine className={styles.shield}>
            <Icon glyph={shield01} /> Linked by the launcher. Never share your identity key.
          </Fine>
        </Block>

        <Block eyebrow="Creator tools & settings" title="Connections" lead="Your Workshop presence and the services allowed to act for this account.">
          <ul className={styles.settings}>
            <SettingLink href="/account/profile" glyph={user} title="Creator profile" detail="Your public page on the Workshop" />
            <SettingLink href="/account/github" glyph={github} title="GitHub connection" detail="Import releases without granting write access" />
            <SettingLink href="/account/connections" glyph={link01} title="Warden connections" detail="Server consoles allowed to prepare Workshop drafts" />
            <SettingLink href="/forgot-password" glyph={padlock} title="Password & access" detail="Change it through a single-use reset link" />
          </ul>
        </Block>
      </div>

      <aside className={styles.explore} aria-label="Everything else on the platform">
        <p className={styles.exploreLabel}>
          <span className={styles.live} aria-hidden="true" />
          Everything else on the platform
        </p>
        <div className={styles.exploreLinks}>
          <ArrowLink href="/servers">Find a server</ArrowLink>
          <ArrowLink href="/workshop">Explore the Workshop</ArrowLink>
          <ArrowLink href="/docs">Documentation</ArrowLink>
          {!alpha ? <ArrowLink href="/docs/alpha-access">About Alpha access</ArrowLink> : null}
        </div>
      </aside>
    </div>
  );
}

