"use client";

import { useState, type FormEvent } from "react";

import { Button } from "@/components/ui/button";
import { Field, Textarea } from "@/components/ui/field";
import { shield01 } from "@/components/ui/icons";
import { inspectComment, moderateComment } from "@/lib/community/client-api";
import type { CommunityComment } from "@/lib/community/types";

import styles from "./comment-moderation.module.css";

/** Staff only: read a comment privately, then hide or restore it with a reason the author sees. */
export function CommentModeration({ token, id, updated }: { token: string; id: string; updated?: () => void }) {
  const [comment, setComment] = useState<CommunityComment | null>(null);
  const [reason, setReason] = useState(""); const [busy, setBusy] = useState(false); const [error, setError] = useState("");
  async function inspect() { setBusy(true); setError(""); try { setComment(await inspectComment(token, id)); } catch (error) { setError(error instanceof Error ? error.message : "Inspection failed."); } finally { setBusy(false); } }
  async function submit(event: FormEvent) {
    event.preventDefault(); if (!comment) return; setBusy(true); setError("");
    try { await moderateComment(token, id, comment.revision, comment.state !== "hidden", reason); setComment(await inspectComment(token, id)); setReason(""); updated?.(); }
    catch (error) { setError(error instanceof Error ? error.message : "Moderation failed. Refresh before trying again."); } finally { setBusy(false); }
  }
  return (
    <div className={styles.moderation} data-comment-moderation>
      <Button color="neutral" border lines="none" size="sm" icon={shield01} iconPosition="left" busy={busy && !comment} disabled={busy} onClick={() => void inspect()}>
        Inspect comment for moderation
      </Button>
      {error ? <p role="alert" className={styles.error}>{error}</p> : null}
      {comment ? (
        <div className={styles.inspection}>
          <p className={styles.meta}>Private inspection · {comment.state} · revision {comment.revision}</p>
          <pre className={styles.body}>{comment.body ?? "Deleted content"}</pre>
          {comment.state !== "deleted" ? (
            <form className={styles.form} onSubmit={submit}>
              <Field label="Reason shared with the comment author">
                <Textarea required maxLength={5000} rows={3} value={reason} onChange={event => setReason(event.target.value)} />
              </Field>
              <Button key={comment.state} color={comment.state === "hidden" ? "neutral" : "red"} border={comment.state === "hidden"} lines="none" size="sm" type="submit" busy={busy} disabled={!reason.trim()}>
                {comment.state === "hidden" ? "Restore comment" : "Hide comment"}
              </Button>
            </form>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
