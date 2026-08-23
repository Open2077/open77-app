"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";

import { CheckIcon, InfoIcon } from "@/components/icons";
import * as master from "@/lib/account/api";
import { MasterApiError } from "@/lib/account/api";

type Phase =
  | { kind: "verifying" }
  | { kind: "verified" }
  | { kind: "bad-link" }
  | { kind: "failed"; message: string };

type Resend = "idle" | "sending" | "sent" | "failed";

/**
 * Consumes the `?token=&email=` pair from a verification e-mail. The token is
 * spent against the master exactly once on mount; a stale or already-used link
 * lands on an error card that can mint a fresh one via the resend endpoint.
 */
export function EmailVerifier() {
  const params = useSearchParams();
  const email = params.get("email") ?? "";
  const token = params.get("token") ?? "";

  const [phase, setPhase] = useState<Phase>(
    email && token ? { kind: "verifying" } : { kind: "bad-link" },
  );
  const [resend, setResend] = useState<Resend>("idle");

  // React 18+ mounts effects twice in development; the token is single-use,
  // so the second pass would burn it and report a false failure.
  const attempted = useRef(false);

  useEffect(() => {
    if (!email || !token || attempted.current) return;
    attempted.current = true;
    master
      .verifyEmail({ email, token })
      .then(() => setPhase({ kind: "verified" }))
      .catch((err: unknown) => {
        setPhase({
          kind: "failed",
          message:
            err instanceof MasterApiError && err.code !== "unknown"
              ? err.message
              : "This verification link is invalid or has expired.",
        });
      });
  }, [email, token]);

  async function onResend() {
    setResend("sending");
    try {
      await master.resendVerification({ email });
      setResend("sent");
    } catch {
      setResend("failed");
    }
  }

  if (phase.kind === "verifying") {
    return <p className="ac-loading">Verifying your e-mail…</p>;
  }

  if (phase.kind === "verified") {
    return (
      <div className="ac-card">
        <div className="ac-success" role="status">
          <CheckIcon size={17} />
          <span>
            <strong>E-mail verified.</strong> Your address is confirmed — you can now sign in and
            create server license keys.
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

  if (phase.kind === "bad-link") {
    return (
      <div className="ac-card">
        <p className="ac-error" role="alert">
          <InfoIcon />
          <span>
            This verification link is incomplete. Open the link from your e-mail again, or copy it
            in full into the address bar.
          </span>
        </p>
        <p className="ac-hint" style={{ marginTop: 12 }}>
          You can also verify from your{" "}
          <Link href="/account" style={{ color: "var(--accent)" }}>
            account page
          </Link>{" "}
          after signing in.
        </p>
      </div>
    );
  }

  return (
    <div className="ac-card">
      <p className="ac-error" role="alert">
        <InfoIcon />
        <span>{phase.message}</span>
      </p>
      {resend === "sent" ? (
        <p className="ac-success" role="status" style={{ marginTop: 12 }}>
          <CheckIcon size={15} />
          <span>
            A fresh verification e-mail is on its way to <strong>{email}</strong>. The newest link
            replaces this one.
          </span>
        </p>
      ) : (
        <>
          {resend === "failed" ? (
            <p className="ac-notice" style={{ marginTop: 12 }}>
              <InfoIcon />
              <span>The e-mail could not be requested. Wait a minute and try again.</span>
            </p>
          ) : null}
          <div className="ac-form-actions" style={{ marginTop: 16 }}>
            <button
              className="btn btn-primary"
              type="button"
              onClick={onResend}
              disabled={resend === "sending"}
            >
              {resend === "sending" ? "Sending…" : "Resend verification e-mail"}
            </button>
            <Link className="btn btn-ghost" href="/account">
              Back to sign-in
            </Link>
          </div>
        </>
      )}
    </div>
  );
}
