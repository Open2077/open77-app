"use client";

import Link from "next/link";
import { useState, type FormEvent } from "react";

import { Button } from "@/components/ui/button";
import { Loader } from "@/components/ui/feedback";
import { Field, Textarea } from "@/components/ui/field";
import { Icon } from "@/components/ui/icon";
import { flag02 } from "@/components/ui/icons";
import { useSession } from "@/lib/account/session";
import { reportContent } from "@/lib/community/client-api";
import type { CommunityReport } from "@/lib/community/types";

import styles from "./report-form.module.css";

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
  return (
    <details className={styles.report} data-report-form>
      <summary><Icon glyph={flag02} />Report this {targetType === "project" ? "creation" : targetType}</summary>
      <div className={styles.body}>
        {session?.role === "admin" && targetType === "project" ? <p className={styles.text}><Link href={`/admin/resources/${targetId}`}>Open project moderation</Link></p> : null}
        {!ready ? <Loader label="Account" /> : !session || !session.emailVerified ? <p className={styles.text}><Link href="/account">Sign in with a verified account</Link> to submit a report.</p> :
          sent ? <p role="status" className={styles.sent}>Your report is in the moderation queue. Thank you for providing the details.</p> :
            <form className={styles.form} onSubmit={submit}>
              <Field label="What should moderators investigate?" hint="Your report is private to moderators. Do not include passwords, tokens or other secrets." error={error || undefined}>
                <Textarea required maxLength={5000} rows={4} value={reason} onChange={event => setReason(event.target.value)} />
              </Field>
              <Button color="red" border lines="none" size="sm" type="submit" busy={busy} disabled={!reason.trim()}>
                Submit report
              </Button>
            </form>}
      </div>
    </details>
  );
}
