"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { AuthPanel } from "@/components/account/auth-panel";
import { useSession } from "@/lib/account/session";
import { savedProjects, setInteraction } from "@/lib/community/client-api";
import type { CommunityPage, CommunitySavedProject } from "@/lib/community/types";

export function SavedProjects({ kind }: { kind: "save" | "subscription" }) {
  const { session, ready } = useSession();
  if (!ready) return <p role="status">Loading your account…</p>;
  if (!session) return <AuthPanel />;
  if (!session.emailVerified) return <p className="hub-notice"><Link href="/account">Verify your email</Link> to access your private lists.</p>;
  return <Entries key={`${session.accountId}-${kind}`} token={session.token} kind={kind} />;
}

function Entries({ token, kind }: { token: string; kind: "save" | "subscription" }) {
  const [page, setPage] = useState<CommunityPage<CommunitySavedProject> | null>(null);
  const [cursor, setCursor] = useState<string>();
  const [refresh, setRefresh] = useState(0);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  useEffect(() => {
    const controller = new AbortController();
    savedProjects(token, kind, cursor, AbortSignal.any([controller.signal, AbortSignal.timeout(10000)]))
      .then(value => { if (!controller.signal.aborted) { setPage(value); setError(""); } })
      .catch(error => { if (!controller.signal.aborted) setError(error instanceof Error ? error.message : "This list could not be loaded."); });
    return () => controller.abort();
  }, [token, kind, cursor, refresh]);
  async function remove(id: string) {
    setBusy(id); setError("");
    try { await setInteraction(token, id, kind, false, AbortSignal.timeout(10000)); setPage(current => current ? { ...current, items: current.items.filter(item => item.projectId !== id) } : current); }
    catch (error) { setError(error instanceof Error ? error.message : "Your preference could not be removed."); }
    finally { setBusy(null); }
  }
  function load(cursor?: string) { setPage(null); setCursor(cursor); setRefresh(value => value + 1); }
  return <section aria-label={kind === "save" ? "Saved creations" : "Release subscriptions"}>
    {error && <p className="hub-notice" role="alert">{error}</p>}{!page && !error && <p role="status">Loading your list…</p>}
    {page?.items.length === 0 && <div className="hub-empty"><h2>No creations on this page yet.</h2><Link href="/resources">Explore resources →</Link></div>}
    {page?.items.map(item => <article className="hub-draft-row" key={item.projectId}><div><h2>{item.project ? <Link href={`/resources/${item.project.slug}`}>{item.project.content.title}</Link> : "Creation unavailable"}</h2>
      <p>{item.project?.content.summary ?? "This creation is no longer publicly available. You can still remove it from your list."}</p></div>
      <button className="btn btn-ghost" disabled={busy !== null} onClick={() => void remove(item.projectId)}>{busy === item.projectId ? "Removing…" : kind === "save" ? "Remove saved creation" : "Unfollow releases"}</button></article>)}
    <nav className="hub-actions" aria-label="Private list pages"><button className="btn btn-ghost" disabled={busy !== null} onClick={() => load(cursor)}>Refresh</button>
      {cursor && <button className="btn btn-ghost" disabled={busy !== null} onClick={() => load()}>Newest first</button>}
      {page?.nextCursor && <button className="btn btn-ghost" disabled={busy !== null} onClick={() => load(page.nextCursor ?? undefined)}>Next page</button>}</nav>
  </section>;
}
