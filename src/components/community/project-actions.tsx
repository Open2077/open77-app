"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { StarIcon } from "@/components/icons";
import { useSession } from "@/lib/account/session";
import { projectState, publicProject, setInteraction } from "@/lib/community/client-api";
import { formatCount } from "@/lib/community/format";
import type { CommunityProject, CommunityProjectState } from "@/lib/community/types";

const UpIcon = () => <svg viewBox="0 0 16 16" width="15" height="15" aria-hidden="true"><path d="M8 2.5 13.5 9H10v4.5H6V9H2.5z" fill="currentColor" /></svg>;
const BellIcon = () => <svg viewBox="0 0 16 16" width="14" height="14" aria-hidden="true"><path d="M8 1.5a4 4 0 0 0-4 4v3l-1.5 2.5h11L12 8.5v-3a4 4 0 0 0-4-4zM6.5 13a1.5 1.5 0 0 0 3 0" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" /></svg>;

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
  votes: number; state?: CommunityProjectState | null; busy?: boolean; disabled?: boolean; ownProject?: boolean; note?: React.ReactNode;
  onToggle?: (kind: "vote" | "save" | "subscription", enabled: boolean) => void;
}) {
  const off = disabled || busy || !state;
  return <div className="ws-actions" aria-label="Community actions">
    <div className="ws-action-row">
      <button type="button" className={`ws-action ws-action-vote${state?.voted ? " is-on" : ""}`} disabled={off || ownProject} aria-pressed={state?.voted ?? false}
        title={ownProject ? "Creators cannot upvote their own creation" : state?.voted ? "Remove your upvote" : "Upvote this creation"} onClick={() => onToggle?.("vote", !state?.voted)}>
        <UpIcon /><span className="ws-action-count">{formatCount(votes)}</span><span className="ws-action-label">{state?.voted ? "Upvoted" : "Upvote"}</span></button>
      <button type="button" className={`ws-action${state?.saved ? " is-on" : ""}`} disabled={off} aria-pressed={state?.saved ?? false} title={state?.saved ? "Remove from saved" : "Save for later"} onClick={() => onToggle?.("save", !state?.saved)}>
        <StarIcon size={14} filled={state?.saved ?? false} /><span className="ws-action-label">{state?.saved ? "Saved" : "Save"}</span></button>
      <button type="button" className={`ws-action${state?.subscribed ? " is-on" : ""}`} disabled={off} aria-pressed={state?.subscribed ?? false} title={state?.subscribed ? "Stop release notifications" : "Get notified about new releases"} onClick={() => onToggle?.("subscription", !state?.subscribed)}>
        <BellIcon /><span className="ws-action-label">{state?.subscribed ? "Following" : "Follow"}</span></button>
    </div>
    {note && <p className="ws-action-note">{note}</p>}
  </div>;
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
    note={error ? <>{error} <button type="button" className="ws-action-retry" disabled={busy} onClick={() => setRefresh(value => value + 1)}>Retry</button></> :
      !state ? "Loading your preferences…" : ownProject ? "This is your creation: you can save and follow it, not upvote it." : state.saved ? <Link href="/account/saved">In your saved creations →</Link> : null} />;
}
