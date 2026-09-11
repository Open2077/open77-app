"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { AuthPanel } from "@/components/account/auth-panel";
import { useSession } from "@/lib/account/session";
import { notifications, readNotification } from "@/lib/community/client-api";
import type { CommunityNotification, CommunityPage } from "@/lib/community/types";

export function NotificationInbox() {
  const { session, ready } = useSession();
  if (!ready) return <p role="status">Loading your account…</p>;
  if (!session) return <AuthPanel />;
  if (!session.emailVerified) return <p className="hub-notice">Verify your email to access your inbox. <Link href="/account">Open your account →</Link></p>;
  return <Inbox key={session.accountId} token={session.token} />;
}

function Inbox({ token }: { token: string }) {
  const [unread, setUnread] = useState(false);
  return <><div className="hub-actions" role="group" aria-label="Notification filter">
    <button className="btn btn-ghost" aria-pressed={!unread} onClick={() => setUnread(false)}>All notifications</button>
    <button className="btn btn-ghost" aria-pressed={unread} onClick={() => setUnread(true)}>Unread</button>
  </div><Entries key={`${token}-${unread}`} token={token} unread={unread} /></>;
}

function Entries({ token, unread }: { token: string; unread: boolean }) {
  const [page, setPage] = useState<CommunityPage<CommunityNotification> | null>(null);
  const [cursor, setCursor] = useState<string>();
  const [refresh, setRefresh] = useState(0);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  useEffect(() => {
    const controller = new AbortController();
    notifications(token, unread, cursor, AbortSignal.any([controller.signal, AbortSignal.timeout(10000)]))
      .then(value => { if (!controller.signal.aborted) { setPage(value); setError(""); } })
      .catch(error => { if (!controller.signal.aborted) setError(error instanceof Error ? error.message : "Notifications could not be loaded."); });
    return () => controller.abort();
  }, [token, unread, cursor, refresh]);
  async function markRead(id: string) {
    setBusy(id); setError("");
    try {
      await readNotification(token, id, AbortSignal.timeout(10000));
      setPage(null); setRefresh(value => value + 1);
    } catch (error) { setError(error instanceof Error ? error.message : "Read state could not be saved."); }
    finally { setBusy(null); }
  }
  function load(cursor?: string) { setPage(null); setError(""); setCursor(cursor); setRefresh(value => value + 1); }
  return <section className="hub-inbox" aria-label="Your notifications">
    {error && <p className="hub-notice" role="alert">{error}</p>}
    {!page && !error && <p role="status">Loading notifications…</p>}
    {page?.items.length === 0 && <div className="hub-empty"><h2>{unread ? "You’re all caught up." : "No notifications here yet."}</h2>
      <p>{cursor ? "Return to the newest notifications to check for updates." : "Updates will appear here when there’s something to share."}</p></div>}
    {page?.items.map(item => <article className="hub-activity-entry" key={item.notificationId}>
      <p className="hub-kicker">{item.readAtUtc ? "Read" : "Unread"}</p><h2>{item.content.title}</h2>
      <p className="hub-release-meta"><time dateTime={item.createdAtUtc}>{new Date(item.createdAtUtc).toLocaleString()}</time></p>
      <p className="hub-activity-reason">{item.content.message}</p>
      <div className="hub-actions">{item.content.path && /^(?:\/account\/creations\/[0-9a-f-]{36}\/edit|\/resources\/[a-z0-9]+(?:-[a-z0-9]+)*\/versions)$/i.test(item.content.path) && <Link href={item.content.path}>Open creation →</Link>}
        {!item.readAtUtc && <button className="btn btn-ghost" disabled={busy !== null} onClick={() => void markRead(item.notificationId)}>{busy === item.notificationId ? "Saving…" : "Mark as read"}</button>}</div>
    </article>)}
    <nav className="hub-actions" aria-label="Notification pages"><button className="btn btn-ghost" disabled={busy !== null} onClick={() => load(cursor)}>Refresh</button>
      {cursor && <button className="btn btn-ghost" disabled={busy !== null} onClick={() => load()}>Newest notifications</button>}
      {page?.nextCursor && <button className="btn btn-ghost" disabled={busy !== null} onClick={() => load(page.nextCursor ?? undefined)}>Older notifications</button>}</nav>
  </section>;
}
