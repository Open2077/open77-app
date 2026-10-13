"use client";

import Link from "next/link";
import { useEffect, useState, type ReactNode } from "react";

import { Icon } from "@/components/ui/icon";
import { arrowUp01, notification03, star } from "@/components/ui/icons";
import { Eyebrow } from "@/components/ui/typography";
import { useSession } from "@/lib/account/session";
import { projectState, publicProject, setInteraction } from "@/lib/community/client-api";
import { formatCount } from "@/lib/community/format";
import type { CommunityProject, CommunityProjectState } from "@/lib/community/types";

import styles from "./project-actions.module.css";

/**
 * The three things a signed-in member can do with a creation, as buttons
 * that read at a glance: upvote with its count, save, follow releases.
 * Signed-out visitors see the same buttons, disabled, with the reason.
 */
export function ProjectActions({ project }: { project: CommunityProject }) {
  const { session, ready } = useSession();
  if (!ready) return <ActionRow votes={project.upvotes} disabled note="Loading…" />;
  if (!session?.emailVerified) return <ActionRow votes={project.upvotes} disabled note={<><Link href="/account">Sign in with a verified account</Link> to upvote, save or follow releases.</>} />;
  return <Actions key={`${session.accountId}-${project.projectId}`} token={session.token} ownProject={session.accountId === project.ownerAccountId} project={project} />;
}

function ActionRow({ votes, state, busy, disabled, ownProject, note, onToggle }: {
  votes: number; state?: CommunityProjectState | null; busy?: boolean; disabled?: boolean; ownProject?: boolean; note?: ReactNode;
  onToggle?: (kind: "vote" | "save" | "subscription", enabled: boolean) => void;
}) {
  const off = disabled || busy || !state;
  return (
    <div className={styles.actions} aria-label="Community actions" role="group" aria-busy={busy || undefined} data-project-actions>
      <Eyebrow>Back this creation</Eyebrow>
      <div className={styles.row}>
        <button type="button" className={styles.action} disabled={off || ownProject} aria-pressed={state?.voted ?? false}
          title={ownProject ? "Creators cannot upvote their own creation" : state?.voted ? "Remove your upvote" : "Upvote this creation"} onClick={() => onToggle?.("vote", !state?.voted)}>
          <span className={styles.top}><Icon glyph={arrowUp01} /><span className={styles.count}>{formatCount(votes)}</span></span>
          <span className={styles.label}>{state?.voted ? "Upvoted" : "Upvote"}</span>
        </button>
        <button type="button" className={styles.action} disabled={off} aria-pressed={state?.saved ?? false} title={state?.saved ? "Remove from saved" : "Save for later"} onClick={() => onToggle?.("save", !state?.saved)}>
          <Icon glyph={star} />
          <span className={styles.label}>{state?.saved ? "Saved" : "Save"}</span>
        </button>
        <button type="button" className={styles.action} disabled={off} aria-pressed={state?.subscribed ?? false} title={state?.subscribed ? "Stop release notifications" : "Get notified about new releases"} onClick={() => onToggle?.("subscription", !state?.subscribed)}>
          <Icon glyph={notification03} />
          <span className={styles.label}>{state?.subscribed ? "Following" : "Follow"}</span>
        </button>
      </div>
      {note ? <p className={styles.note}>{note}</p> : null}
    </div>
  );
}

function Actions({ token, ownProject, project }: { token: string; ownProject: boolean; project: CommunityProject }) {
  const [state, setState] = useState<CommunityProjectState | null>(null);
  const [votes, setVotes] = useState(project.upvotes);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [refresh, setRefresh] = useState(0);
  useEffect(() => {
    const controller = new AbortController();
    projectState(token, [project.projectId], AbortSignal.any([controller.signal, AbortSignal.timeout(10000)]))
      .then(items => { if (!controller.signal.aborted) { setState(items[0] ?? null); setError(items.length ? "" : "This creation is no longer available."); } })
      .catch(error => { if (!controller.signal.aborted) setError(error instanceof Error ? error.message : "Your project preferences could not be loaded."); });
    return () => controller.abort();
  }, [token, project.projectId, refresh]);
  async function toggle(kind: "vote" | "save" | "subscription", enabled: boolean) {
    setBusy(true); setError("");
    try {
      await setInteraction(token, project.projectId, kind, enabled, AbortSignal.timeout(10000));
      const [items, updated] = await Promise.all([projectState(token, [project.projectId], AbortSignal.timeout(10000)), publicProject(project.projectId, AbortSignal.timeout(10000))]);
      setState(items[0] ?? null); setVotes(updated.upvotes);
    } catch (error) { setState(null); setError(error instanceof Error ? error.message : "Your preference could not be updated. Refresh before retrying."); }
    finally { setBusy(false); }
  }
  return <ActionRow votes={votes} state={state} busy={busy} ownProject={ownProject} onToggle={(kind, enabled) => void toggle(kind, enabled)}
    note={error ? <>{error} <button type="button" className={styles.retry} disabled={busy} onClick={() => setRefresh(value => value + 1)}>Retry</button></> :
      !state ? "Loading your preferences…" : ownProject ? "This is your creation: you can save and follow it, not upvote it." : state.saved ? <Link href="/account/saved">In your saved creations →</Link> : null} />;
}
