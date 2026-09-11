"use client";

import { useEffect, useState } from "react";
import { activity } from "@/lib/community/client-api";
import type { CommunityActivity, CommunityPage } from "@/lib/community/types";

export function ActivityHistory({ token, kind, id, title = "Moderation decisions", initiallyOpen = false }: {
  token: string; kind: "project" | "report"; id: string; title?: string; initiallyOpen?: boolean;
}) {
  const [open, setOpen] = useState(initiallyOpen);
  return <details className="hub-release hub-activity" open={open} onToggle={event => setOpen(event.currentTarget.open)}><summary>{title}</summary>
    {open && <HistoryEntries token={token} kind={kind} id={id} />}</details>;
}

function HistoryEntries({ token, kind, id }: { token: string; kind: "project" | "report"; id: string }) {
  const [page, setPage] = useState<CommunityPage<CommunityActivity> | null>(null);
  const [cursor, setCursor] = useState<string>();
  const [refresh, setRefresh] = useState(0);
  const [error, setError] = useState("");
  useEffect(() => {
    const controller = new AbortController();
    activity(token, kind, id, cursor, AbortSignal.any([controller.signal, AbortSignal.timeout(10000)]))
      .then(value => { if (!controller.signal.aborted) { setPage(value); setError(""); } })
      .catch(error => { if (!controller.signal.aborted) setError(error instanceof Error ? error.message : "History could not be loaded."); });
    return () => controller.abort();
  }, [token, kind, id, cursor, refresh]);
  return <div>{error && <p className="hub-notice" role="alert">{error}</p>}
    {!page && !error && <p role="status">Loading history…</p>}
    {page?.items.length === 0 && <p>No decisions have been recorded yet.</p>}
    {page?.items.map(item => <article className="hub-activity-entry" key={item.activityId}><h3>{item.action.replaceAll("_", " ")}</h3>
      <p className="hub-release-meta"><time dateTime={item.createdAtUtc}>{new Date(item.createdAtUtc).toLocaleString()}</time>{item.actorDisplayName ? ` · ${item.actorDisplayName}` : ""}</p>
      {item.reason && <p className="hub-activity-reason">{item.reason}</p>}
      {item.actorDisplayName && <details><summary>Audit details</summary><pre className="hub-review-text">{JSON.stringify(item.details, null, 2)}</pre></details>}
    </article>)}
    <nav className="hub-actions" aria-label="History pages"><button type="button" className="btn btn-ghost" onClick={() => setRefresh(value => value + 1)}>Refresh history</button>
      {cursor && <button type="button" className="btn btn-ghost" onClick={() => setCursor(undefined)}>Newest entries</button>}
      {page?.nextCursor && <button type="button" className="btn btn-ghost" onClick={() => setCursor(page.nextCursor ?? undefined)}>Older entries</button>}</nav>
  </div>;
}
