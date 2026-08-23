"use client";

import Link from "next/link";
import { type FormEvent, useCallback, useEffect, useRef, useState } from "react";

import { ArrowLeftIcon, CheckIcon, CopyIcon, InfoIcon, KeyIcon, ServerRackIcon } from "@/components/icons";
import * as master from "@/lib/account/api";
import { type CreatedLicense, type License, MasterApiError } from "@/lib/account/api";
import { type StoredSession, useSession } from "@/lib/account/session";

function formatDate(iso: string): string {
  const date = new Date(iso);
  return Number.isNaN(date.getTime())
    ? iso
    : date.toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" });
}

/** Copy with a per-target "copied" flash; clipboard failures degrade to selecting nothing loudly. */
function useCopy() {
  const [copied, setCopied] = useState<string | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const copy = useCallback(async (id: string, text: string) => {
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      // Older engines / non-secure contexts: the legacy path still works.
      const area = document.createElement("textarea");
      area.value = text;
      area.style.position = "fixed";
      area.style.opacity = "0";
      document.body.append(area);
      area.select();
      document.execCommand("copy");
      area.remove();
    }
    setCopied(id);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => setCopied(null), 1800);
  }, []);

  useEffect(() => () => {
    if (timer.current) clearTimeout(timer.current);
  }, []);

  return { copied, copy };
}

function configSnippet(key: string): string {
  return [
    "{",
    '  "masterServer": {',
    `    "licenseKey": "${key}"`,
    "  }",
    "}",
  ].join("\n");
}

/**
 * The keymaster: every server license key of the account, FiveM-style.
 *
 * The one moment that matters here is creation: the raw op77_live_ key exists
 * in the browser exactly once, so the reveal block stays on screen until the
 * owner dismisses it deliberately, carries its own copy button, and shows the
 * exact `server.jsonc` lines the key goes into.
 */
export function Keymaster({
  session,
  serverLaunch,
}: {
  session: StoredSession;
  serverLaunch: boolean;
}) {
  const { clear } = useSession();
  const { copied, copy } = useCopy();
  const [licenses, setLicenses] = useState<License[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const [createOpen, setCreateOpen] = useState(serverLaunch);
  const [label, setLabel] = useState(serverLaunch ? "My server" : "");
  const [created, setCreated] = useState<CreatedLicense | null>(null);
  const [armedRevoke, setArmedRevoke] = useState<string | null>(null);

  const emailVerified = session.emailVerified;

  useEffect(() => {
    let cancelled = false;
    master
      .listLicenses(session.token)
      .then((result) => {
        if (!cancelled) setLicenses(result);
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        if (err instanceof MasterApiError && err.status === 401) clear();
        else setError(err instanceof MasterApiError ? err.message : "Could not load your keys.");
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session.token]);

  async function onCreate(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setBusy(true);
    try {
      const license = await master.createLicense(session.token, label.trim());
      setCreated(license);
      setCreateOpen(false);
      setLabel("");
      setLicenses((current) =>
        current
          ? [
              {
                licenseId: license.licenseId,
                label: license.label,
                keyHint: license.keyHint,
                createdAtUtc: license.createdAtUtc,
                revokedAtUtc: null,
              },
              ...current,
            ]
          : current,
      );
    } catch (err) {
      setError(err instanceof MasterApiError ? err.message : "Could not create the key.");
    } finally {
      setBusy(false);
    }
  }

  async function onRevoke(licenseId: string) {
    if (armedRevoke !== licenseId) {
      setArmedRevoke(licenseId);
      return;
    }
    setArmedRevoke(null);
    setError(null);
    setBusy(true);
    try {
      await master.revokeLicense(session.token, licenseId);
      const now = new Date().toISOString();
      setLicenses((current) =>
        current?.map((license) =>
          license.licenseId === licenseId ? { ...license, revokedAtUtc: now } : license,
        ) ?? null,
      );
      if (created?.licenseId === licenseId) setCreated(null);
    } catch (err) {
      setError(err instanceof MasterApiError ? err.message : "Could not revoke the key.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      {serverLaunch ? (
        <section className="ac-launch" aria-label="Server launch">
          <h2>
            <ServerRackIcon size={19} />
            Your server needs a license key
          </h2>
          <p>
            A dedicated server joins the OPEN//77 platform with a license key created here — that
            key is what ties the server to your account in the server browser.
          </p>
          <ol>
            <li>Create a key below and copy it — it is shown only once.</li>
            <li>
              Paste it into the <code>masterServer.licenseKey</code> field of your{" "}
              <code>server.jsonc</code>.
            </li>
            <li>Restart the server; it enrolls with the platform on boot.</li>
          </ol>
        </section>
      ) : null}

      {error ? (
        <p className="ac-error" role="alert" style={{ marginBottom: 14 }}>
          <InfoIcon />
          {error}
        </p>
      ) : null}

      {created ? (
        <section className="ac-reveal" aria-label="New license key">
          <h2 className="ac-reveal-title">
            <KeyIcon size={15} />
            {created.label} — key created
          </h2>
          <div className="ac-keybox">
            <code>{created.key}</code>
            <button
              className={`ac-iconbtn${copied === "key" ? " is-copied" : ""}`}
              type="button"
              onClick={() => copy("key", created.key)}
            >
              {copied === "key" ? <CheckIcon size={13} /> : <CopyIcon />}
              {copied === "key" ? "Copied" : "Copy"}
            </button>
          </div>
          <p className="ac-reveal-warning">
            <InfoIcon />
            <span>
              <strong>This key is shown only once.</strong> The platform stores a fingerprint, not
              the key — if you lose it, revoke it and create a new one.
            </span>
          </p>
          <div className="ac-snippet">
            <div className="ac-snippet-head">
              <p className="ac-snippet-title">server.jsonc</p>
              <button
                className={`ac-iconbtn${copied === "snippet" ? " is-copied" : ""}`}
                type="button"
                onClick={() => copy("snippet", configSnippet(created.key))}
              >
                {copied === "snippet" ? <CheckIcon size={13} /> : <CopyIcon />}
                {copied === "snippet" ? "Copied" : "Copy snippet"}
              </button>
            </div>
            <pre>
              <code>
                {"{\n"}
                {"  "}
                <span className="tok-key">&quot;masterServer&quot;</span>
                {": {\n"}
                {"    "}
                <span className="tok-key">&quot;licenseKey&quot;</span>
                {": "}
                <span className="tok-str">&quot;{created.key}&quot;</span>
                {"\n  }\n}"}
              </code>
            </pre>
          </div>
          <div className="ac-form-actions" style={{ marginTop: 14 }}>
            <button className="btn btn-small btn-ghost" type="button" onClick={() => setCreated(null)}>
              I saved my key
            </button>
          </div>
        </section>
      ) : null}

      <div className="ac-card">
        <div className="ac-card-head">
          <h2 className="ac-card-title">
            <KeyIcon size={17} />
            License keys
          </h2>
          {!createOpen ? (
            <button
              className="btn btn-small btn-primary"
              type="button"
              onClick={() => setCreateOpen(true)}
              disabled={!emailVerified}
            >
              New key
            </button>
          ) : null}
        </div>

        {!emailVerified ? (
          <p className="ac-notice" style={{ marginBottom: 14 }}>
            <InfoIcon />
            <span>
              Creating keys requires a verified e-mail address.{" "}
              <Link href="/account">Verify your account</Link> first.
            </span>
          </p>
        ) : null}

        {createOpen ? (
          <form className="ac-form" onSubmit={onCreate} style={{ marginBottom: 18 }}>
            <label className="ac-label">
              Key label
              <input
                className="ac-input"
                value={label}
                onChange={(event) => setLabel(event.target.value)}
                placeholder="What server is this for?"
                maxLength={96}
                autoFocus
                required
              />
              <span className="ac-hint">Only you see the label — name it after the server it runs.</span>
            </label>
            <div className="ac-form-actions">
              <button
                className="btn btn-small btn-primary"
                type="submit"
                disabled={busy || label.trim().length === 0 || !emailVerified}
              >
                {busy ? "Creating…" : "Create key"}
              </button>
              <button
                className="btn btn-small btn-ghost"
                type="button"
                onClick={() => setCreateOpen(false)}
              >
                Cancel
              </button>
            </div>
          </form>
        ) : null}

        {licenses === null ? (
          <p className="ac-loading">Loading keys…</p>
        ) : licenses.length === 0 ? (
          <p className="ac-key-empty">
            No license keys yet. Create one to bring your first server onto the platform.
          </p>
        ) : (
          <ul className="ac-keys">
            {licenses.map((license) => (
              <li
                className={`ac-key-row${license.revokedAtUtc ? " is-revoked" : ""}`}
                key={license.licenseId}
              >
                <div className="ac-key-id">
                  <span className="ac-key-label">{license.label}</span>
                  <span className="ac-key-hint">op77_live_····{license.keyHint}</span>
                </div>
                <div className="ac-key-meta">
                  <span className="ac-key-date">created {formatDate(license.createdAtUtc)}</span>
                  {license.revokedAtUtc ? (
                    <span className="ac-badge ac-badge-dim">Revoked</span>
                  ) : (
                    <button
                      className={`ac-iconbtn is-danger${armedRevoke === license.licenseId ? " is-armed" : ""}`}
                      type="button"
                      disabled={busy}
                      onClick={() => onRevoke(license.licenseId)}
                      onBlur={() => setArmedRevoke(null)}
                    >
                      {armedRevoke === license.licenseId ? "Confirm revoke?" : "Revoke"}
                    </button>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      <p className="ac-lead" style={{ marginTop: 18, fontSize: 14 }}>
        <Link href="/account">
          <ArrowLeftIcon /> Back to your account
        </Link>
      </p>
    </>
  );
}
