"use client";

import Link from "next/link";
import { useState, type FormEvent } from "react";
import { useSession } from "@/lib/account/session";
import { reportContent } from "@/lib/community/client-api";
import type { CommunityReport } from "@/lib/community/types";

export function ReportForm({ targetType, targetId }: { targetType: CommunityReport["targetType"]; targetId: string }) {
  const { session, ready } = useSession();
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");
  async function submit(event: FormEvent) {
    event.preventDefault(); if (!session || busy) return;
    setBusy(true); setError("");
    try { await reportContent(session.token, targetType, targetId, reason); setSent(true); setReason(""); }
    catch (error) { setError(error instanceof Error ? error.message : "The report could not be submitted."); }
    finally { setBusy(false); }
  }
  return <details className="hub-report-form"><summary>Report this {targetType === "project" ? "creation" : targetType}</summary>
    {session?.role === "admin" && targetType === "project" && <p><Link href={`/admin/resources/${targetId}`}>Open project moderation</Link></p>}
    {!ready ? <p role="status">Loading account…</p> : !session || !session.emailVerified ? <p><Link href="/account">Sign in with a verified account</Link> to submit a report.</p> :
      sent ? <p role="status">Your report is in the moderation queue. Thank you for providing the details.</p> :
        <form className="hub-form" onSubmit={submit}><label>What should moderators investigate?<textarea required maxLength={5000} value={reason} onChange={event => setReason(event.target.value)} /></label>
          <p>Your report is private to moderators. Do not include passwords, tokens or other secrets.</p>
          {error && <p role="alert">{error}</p>}<button className="btn btn-ghost" disabled={busy || !reason.trim()}>{busy ? "Submitting…" : "Submit report"}</button></form>}
  </details>;
}
