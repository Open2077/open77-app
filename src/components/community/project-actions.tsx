"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useSession } from "@/lib/account/session";
import { projectState, publicProject, setInteraction } from "@/lib/community/client-api";
import type { CommunityProject, CommunityProjectState } from "@/lib/community/types";

export function ProjectActions({ project }: { project: CommunityProject }) {
  const { session, ready } = useSession();
  if (!ready) return <p role="status">Loading community actions…</p>;
  if (!session?.emailVerified) return <div><p>{project.upvotes} upvotes</p><p><Link href="/account">Sign in with a verified account</Link> to vote, save or follow releases.</p></div>;
  return <Actions key={`${session.accountId}-${project.projectId}`} token={session.token} ownProject={session.accountId === project.ownerAccountId} project={project} />;
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
  return <div className="hub-project-actions"><p aria-live="polite">{votes} upvotes</p>
    <div className="hub-actions"><button className="btn btn-ghost" disabled={busy || !state || ownProject} aria-pressed={state?.voted ?? false} onClick={() => void toggle("vote", !state?.voted)}>{state?.voted ? "Upvoted" : "Upvote"}</button>
      <button className="btn btn-ghost" disabled={busy || !state} aria-pressed={state?.saved ?? false} onClick={() => void toggle("save", !state?.saved)}>{state?.saved ? "Saved" : "Save"}</button>
      <button className="btn btn-ghost" disabled={busy || !state} aria-pressed={state?.subscribed ?? false} onClick={() => void toggle("subscription", !state?.subscribed)}>{state?.subscribed ? "Following releases" : "Follow releases"}</button></div>
    {ownProject && <p>Creators can save and follow their own projects, but cannot upvote them.</p>}
    {state?.saved && <p><Link href="/account/saved">Your saved creations →</Link></p>}
    {error && <p className="hub-notice" role="alert">{error}</p>}
    {!state && !error && <p role="status">Loading your preferences…</p>}
    {error && <button className="btn btn-ghost" disabled={busy} onClick={() => setRefresh(value => value + 1)}>Refresh preferences</button>}
  </div>;
}
