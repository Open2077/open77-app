"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCallback, useEffect, useState, type ReactNode } from "react";
import { useSession } from "@/lib/account/session";
import { canVote, message, stateLabel, type Idea } from "@/lib/dev-tracker/types";
import * as api from "@/lib/dev-tracker/api";
import styles from "./tracker.module.css";

export function TrackerShell({ children }: { children: ReactNode }) {
  const path = usePathname();
  return <main id="main" className={styles.page}><header className={styles.hero}><div><p className={styles.eyebrow}>{"// BUILT WITH THE COMMUNITY"}</p><h1>Your ideas.<br /><em>Our next chapter.</em></h1><p>Help shape OPEN//77. Share what matters, talk it through, and follow the work from first idea to release.</p></div><Link className={styles.primary} href="/dev-tracker/new">＋ Suggest an idea</Link></header>
    <nav className={styles.tabs} aria-label="Dev Tracker">{[["/dev-tracker", "Community ideas"], ["/dev-tracker/approved", "Validated ideas"], ["/dev-tracker/roadmap", "Development board"], ["/dev-tracker/mine", "My ideas"]].map(([href, label]) => <Link key={href} href={href!} aria-current={path === href ? "page" : undefined}>{label}</Link>)}</nav>
    {children}<div className={styles.footerNote}>Votes help us understand demand. Validation is not a delivery-date promise. Bug reports belong in <Link href="/docs/launcher">launcher diagnostics</Link>.</div></main>;
}
export const Badge = ({ state }: { state: string }) => <span className={styles.badge} data-state={state}>{stateLabel(state)}</span>;
export function ErrorNotice({ error, retry }: { error: string; retry?: () => void }) { return error ? <div className={styles.error} role="alert">{error}{retry && <button type="button" onClick={retry}>Retry / refresh</button>}</div> : null; }
export const Busy = ({ label = "Loading…" }: { label?: string }) => <div className={styles.loading} role="status"><span className={styles.spinner} aria-hidden="true" />{label}</div>;
export function SignInNote() { return <p className={styles.notice}><Link href="/account">Sign in with a verified account</Link> to propose ideas, vote or join the discussion. Everyone can browse.</p>; }

/** Abort old reads and never briefly show another account's private view on a session switch. */
export function useTrackerRead<T>(key: string, load: (signal: AbortSignal) => Promise<T>, enabled = true) {
  const [result, setResult] = useState<{ key: string; data?: T; error?: string }>({ key: "" });
  const [version, setVersion] = useState(0);
  const reload = useCallback(() => setVersion(value => value + 1), []);
  const requestKey = `${key}:${version}`;
  useEffect(() => {
    if (!enabled) return;
    const controller = new AbortController();
    load(AbortSignal.any([controller.signal, AbortSignal.timeout(12000)]))
      .then(data => { if (!controller.signal.aborted) setResult({ key: requestKey, data }); })
      .catch(error => { if (!controller.signal.aborted) setResult({ key: requestKey, error: message(error) }); });
    return () => controller.abort();
  }, [requestKey, load, enabled]);
  return { data: enabled && result.key === requestKey ? result.data : undefined, error: enabled && result.key === requestKey ? result.error ?? "" : "", loading: enabled && result.key !== requestKey, reload };
}

export function VoteBox({ idea, onChanged }: { idea: Idea; onChanged?: (idea: Idea) => void }) {
  const { session } = useSession();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const allowed = !!session?.emailVerified && canVote(idea, session.accountId);
  async function choose(value: number) {
    if (!session || busy) return;
    setBusy(true); setError("");
    try { onChanged?.(await api.vote(session.token, idea.id, idea.myVote === value ? 0 : value)); }
    catch (error) { setError(message(error)); } finally { setBusy(false); }
  }
  return <div className={styles.voteWrap}><div className={styles.vote} aria-label="Community votes">
    <button type="button" disabled={busy || (!allowed && idea.myVote !== 1)} aria-label="Upvote" aria-pressed={idea.myVote === 1} onClick={() => void choose(1)}>▲</button>
    <strong title={`${idea.upvotes} upvotes · ${idea.downvotes} downvotes`}>{idea.upvotes - idea.downvotes}</strong>
    <button type="button" disabled={busy || (!allowed && idea.myVote !== -1)} aria-label="Downvote" aria-pressed={idea.myVote === -1} onClick={() => void choose(-1)}>▼</button>
  </div>{error && <p className={styles.voteError} role="alert">{error}</p>}</div>;
}
