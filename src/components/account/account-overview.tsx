"use client";

import Link from "next/link";
import { type FormEvent, useEffect, useState } from "react";

import { CheckIcon, InfoIcon, KeyIcon, PeopleIcon, SignOutIcon } from "@/components/icons";
import * as master from "@/lib/account/api";
import { type Account, MasterApiError } from "@/lib/account/api";
import { type StoredSession, useSession } from "@/lib/account/session";

function formatDate(iso: string): string {
  const date = new Date(iso);
  return Number.isNaN(date.getTime())
    ? iso
    : date.toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" });
}

/**
 * The signed-in account page: profile facts, e-mail verification, linked
 * device identities, and the way out. `/me` is refetched on mount so the page
 * reflects the master rather than the cached login snapshot; a 401 means the
 * session died server-side and the stored copy is cleared to match.
 */
export function AccountOverview({ session }: { session: StoredSession }) {
  const { clear, update } = useSession();
  const [account, setAccount] = useState<Account | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
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
        else setError(err instanceof MasterApiError ? err.message : "Could not load your account.");
      });
    return () => {
      cancelled = true;
    };
    // Refetch only when the token itself changes; `update` writing the same
    // profile back must not loop this effect.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session.token]);

  async function onVerify(event: FormEvent) {
    event.preventDefault();
    if (!account) return;
    setError(null);
    setBusy(true);
    try {
      await master.verifyEmail({ email: account.email, token: verifyToken.trim() });
      setAccount({ ...account, emailVerified: true });
      update({ emailVerified: true });
      setVerifyOpen(false);
    } catch (err) {
      setError(err instanceof MasterApiError ? err.message : "Verification failed. Try again.");
    } finally {
      setBusy(false);
    }
  }

  async function onSignOut() {
    setBusy(true);
    try {
      await master.logout(session.token);
    } catch {
      // The local session is cleared regardless: a token the master already
      // forgot is not worth keeping around.
    } finally {
      clear();
    }
  }

  if (account === null && error === null) {
    return <p className="ac-loading">Loading account…</p>;
  }

  return (
    <>
      {error ? (
        <p className="ac-error" role="alert" style={{ marginBottom: 14 }}>
          <InfoIcon />
          {error}
        </p>
      ) : null}

      {account ? (
        <>
          <div className="ac-card">
            <div className="ac-card-head">
              <h2 className="ac-card-title">
                <PeopleIcon size={18} />
                Profile
              </h2>
              <button className="ac-iconbtn" type="button" onClick={onSignOut} disabled={busy}>
                <SignOutIcon />
                Sign out
              </button>
            </div>
            <dl className="ac-profile-grid">
              <div>
                <dt>Display name</dt>
                <dd>{account.displayName}</dd>
              </div>
              <div>
                <dt>E-mail</dt>
                <dd>{account.email}</dd>
              </div>
              <div>
                <dt>Status</dt>
                <dd>
                  {account.emailVerified ? (
                    <span className="ac-badge ac-badge-ok">
                      <CheckIcon size={11} />
                      Verified
                    </span>
                  ) : (
                    <span className="ac-badge ac-badge-warn">Unverified</span>
                  )}
                </dd>
              </div>
              <div>
                <dt>Role</dt>
                <dd>
                  <span className="ac-badge ac-badge-dim">{account.role}</span>
                </dd>
              </div>
            </dl>

            {!account.emailVerified ? (
              <div style={{ marginTop: 18 }}>
                {verifyOpen ? (
                  <form className="ac-form" onSubmit={onVerify}>
                    <label className="ac-label">
                      Verification code
                      <input
                        className="ac-input"
                        value={verifyToken}
                        onChange={(event) => setVerifyToken(event.target.value)}
                        placeholder="Code from your registration"
                        autoComplete="one-time-code"
                        spellCheck={false}
                        required
                      />
                      <span className="ac-hint">
                        The code was shown when you registered on this development master; in
                        production it arrives by e-mail.
                      </span>
                    </label>
                    <div className="ac-form-actions">
                      <button
                        className="btn btn-small btn-primary"
                        type="submit"
                        disabled={busy || verifyToken.trim().length === 0}
                      >
                        Verify
                      </button>
                      <button
                        className="btn btn-small btn-ghost"
                        type="button"
                        onClick={() => setVerifyOpen(false)}
                      >
                        Cancel
                      </button>
                    </div>
                  </form>
                ) : (
                  <p className="ac-notice">
                    <InfoIcon />
                    <span>
                      Your e-mail is not verified yet — verification is required before creating
                      server license keys.{" "}
                      <button
                        type="button"
                        className="ac-tab"
                        style={{ padding: 0, border: 0, margin: 0, color: "var(--accent)" }}
                        onClick={() => setVerifyOpen(true)}
                      >
                        Enter your code
                      </button>
                    </span>
                  </p>
                )}
              </div>
            ) : null}
          </div>

          <div className="ac-card">
            <div className="ac-card-head">
              <h2 className="ac-card-title">
                <KeyIcon size={17} />
                Server license keys
              </h2>
              <Link className="btn btn-small btn-ghost" href="/account/keys">
                Open the keymaster
              </Link>
            </div>
            <p className="ac-lead" style={{ fontSize: 14.5 }}>
              License keys let your dedicated servers register on the OPEN//77 platform. Create,
              inspect and revoke them in the keymaster.
            </p>
          </div>

          <div className="ac-card">
            <div className="ac-card-head">
              <h2 className="ac-card-title">
                <PeopleIcon size={18} />
                Linked game identities
              </h2>
            </div>
            {account.identities.length === 0 ? (
              <p className="ac-lead" style={{ fontSize: 14.5 }}>
                No game client is linked to this account yet. Linking happens from the game client
                and proves possession of its identity key — it ships in a later milestone.
              </p>
            ) : (
              <ul className="ac-keys">
                {account.identities.map((identity) => (
                  <li className="ac-key-row" key={identity.userId}>
                    <div className="ac-key-id">
                      <span className="ac-key-label">{identity.displayName}</span>
                      <span className="ac-key-hint">{identity.userId}</span>
                    </div>
                    <span className="ac-key-date">linked {formatDate(identity.linkedAtUtc)}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </>
      ) : null}
    </>
  );
}
