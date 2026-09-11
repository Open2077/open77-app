"use client";
import { useState, type FormEvent } from "react";
import { inspectComment, moderateComment } from "@/lib/community/client-api";
import type { CommunityComment } from "@/lib/community/types";

export function CommentModeration({ token, id, updated }: { token: string; id: string; updated?: () => void }) {
  const [comment, setComment] = useState<CommunityComment | null>(null);
  const [reason, setReason] = useState(""); const [busy, setBusy] = useState(false); const [error, setError] = useState("");
  async function inspect() { setBusy(true); setError(""); try { setComment(await inspectComment(token, id)); } catch (error) { setError(error instanceof Error ? error.message : "Inspection failed."); } finally { setBusy(false); } }
  async function submit(event: FormEvent) {
    event.preventDefault(); if (!comment) return; setBusy(true); setError("");
    try { await moderateComment(token, id, comment.revision, comment.state !== "hidden", reason); setComment(await inspectComment(token, id)); setReason(""); updated?.(); }
    catch (error) { setError(error instanceof Error ? error.message : "Moderation failed. Refresh before trying again."); } finally { setBusy(false); }
  }
  return <div className="hub-report-form"><button className="btn btn-ghost" disabled={busy} onClick={() => void inspect()}>Inspect comment for moderation</button>
    {error && <p role="alert">{error}</p>}{comment && <div><p>Private inspection · {comment.state} · revision {comment.revision}</p><pre className="hub-review-text">{comment.body ?? "Deleted content"}</pre>
      {comment.state !== "deleted" && <form className="hub-form" onSubmit={submit}><label>Reason shared with the comment author<textarea required maxLength={5000} value={reason} onChange={event => setReason(event.target.value)} /></label>
        <button className="btn btn-primary" disabled={busy || !reason.trim()}>{comment.state === "hidden" ? "Restore comment" : "Hide comment"}</button></form>}</div>}
  </div>;
}
