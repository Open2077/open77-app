"use client";

import { useEffect, useState } from "react";

import { AuthPanel } from "@/components/account/auth-panel";
import { ArrowLink, ConfirmDialog, Pager, Pending, Row, Rows, StateTag, formatDateTime } from "@/components/account/kit";
import { Button } from "@/components/ui/button";
import { EmptyState, Notice } from "@/components/ui/feedback";
import { arrowLeft01, arrowRight01, checkList, refresh, tick02 } from "@/components/ui/icons";
import { Tabs } from "@/components/ui/tabs";
import { useSession } from "@/lib/account/session";
import { notifications, readNotification, readNotificationsThrough } from "@/lib/community/client-api";
import type { CommunityNotification, CommunityPage } from "@/lib/community/types";

import styles from "./inbox.module.css";

/** Only links back into the account area or a Workshop page are followed. */
const SAFE_PATH = /^(?:\/account\/invitations|\/account\/creations\/[0-9a-f-]{36}\/edit|\/(?:workshop|resources)\/[a-z0-9]+(?:-[a-z0-9]+)*\/(?:versions|discussion\?thread=[0-9a-f-]{36}))$/i;

export function NotificationInbox() {
  const { session, ready } = useSession();
  if (!ready) return <Pending label="Account" />;
  if (!session) return <AuthPanel />;
  if (!session.emailVerified)
    return (
      <Notice kind="info" title="Verify your e-mail first">
        Verify your email to access your inbox. <ArrowLink href="/account">Open your account</ArrowLink>
      </Notice>
    );
  return <Inbox key={session.accountId} token={session.token} />;
}

function Inbox({ token }: { token: string }) {
  const [unread, setUnread] = useState(false);
  return (
    <div className={styles.inbox}>
      <Tabs
        label="Notification filter"
        value={unread ? "unread" : "all"}
        onChange={(value) => setUnread(value === "unread")}
        items={[
          { value: "all", label: "All notifications" },
          { value: "unread", label: "Unread" },
        ]}
      />
      <Entries key={`${token}-${unread}`} token={token} unread={unread} />
    </div>
  );
}

function Entries({ token, unread }: { token: string; unread: boolean }) {
  const [page, setPage] = useState<CommunityPage<CommunityNotification> | null>(null);
  const [cursor, setCursor] = useState<string>();
  const [refreshCount, setRefresh] = useState(0);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const [cutoff, setCutoff] = useState<string | null>(null);
  const [status, setStatus] = useState("");
  useEffect(() => {
    const controller = new AbortController();
    notifications(token, unread, cursor, AbortSignal.any([controller.signal, AbortSignal.timeout(10000)]))
      .then((value) => {
        if (!controller.signal.aborted) {
          setPage(value);
          setError("");
        }
      })
      .catch((error) => {
        if (!controller.signal.aborted) setError(error instanceof Error ? error.message : "Notifications could not be loaded.");
      });
    return () => controller.abort();
  }, [token, unread, cursor, refreshCount]);
  async function markRead(id: string) {
    setBusy(id);
    setError("");
    try {
      await readNotification(token, id, AbortSignal.timeout(10000));
      setPage(null);
      setRefresh((value) => value + 1);
    } catch (error) {
      setError(error instanceof Error ? error.message : "Read state could not be saved.");
    } finally {
      setBusy(null);
    }
  }
  async function readThrough() {
    if (!cutoff || busy) return;
    setBusy("all");
    setError("");
    try {
      const result = await readNotificationsThrough(token, cutoff);
      setStatus(
        `${result.updated} notifications marked as read.${result.hasMore ? " There are more older notifications; continue with the same cutoff below." : " Newer notifications stay unread."}`,
      );
      setCutoff(result.hasMore ? result.throughUtc : null);
      setPage(null);
      setRefresh((value) => value + 1);
    } catch (error) {
      setError(error instanceof Error ? error.message : "Read state could not be saved. You can safely retry with the same cutoff.");
    } finally {
      setBusy(null);
    }
  }
  function load(cursor?: string) {
    setPage(null);
    setError("");
    setCutoff(null);
    setCursor(cursor);
    setRefresh((value) => value + 1);
  }
  return (
    <section className={styles.section} aria-label="Your notifications">
      {error && !cutoff ? <Notice kind="danger">{error}</Notice> : null}
      {status && !cutoff ? <Notice kind="success">{status}</Notice> : null}
      {page && page.items.length > 0 ? (
        <div className={styles.toolbar}>
          <Button
            lines="none"
            border
            color="neutral"
            size="sm"
            icon={checkList}
            iconPosition="left"
            disabled={busy !== null}
            onClick={() => {
              setStatus("");
              setCutoff(page.items[0]?.createdAtUtc ?? null);
            }}
          >
            Mark this page and older notifications as read
          </Button>
        </div>
      ) : null}
      {!page && !error ? <Pending label="Loading notifications" /> : null}
      {page?.items.length === 0 ? (
        <EmptyState eyebrow={unread ? "Inbox zero" : "Inbox"} title={unread ? "You're all caught up" : "No notifications here yet"}>
          {cursor ? "Return to the newest notifications to check for updates." : "Updates will appear here when there's something to share."}
        </EmptyState>
      ) : null}
      {page && page.items.length > 0 ? (
        <Rows label="Notifications">
          {page.items.map((item) => (
            <Row
              key={item.notificationId}
              marker={!item.readAtUtc}
              meta={
                <>
                  <StateTag state={item.readAtUtc ? "read" : "unread"} />
                  <time dateTime={item.createdAtUtc}>{formatDateTime(item.createdAtUtc)}</time>
                </>
              }
              title={item.content.title}
              description={<p className={styles.message}>{item.content.message}</p>}
              aside={
                <>
                  {item.content.path && SAFE_PATH.test(item.content.path) ? (
                    <ArrowLink href={item.content.path.replace(/^\/resources\//, "/workshop/")}>Open update</ArrowLink>
                  ) : null}
                  {!item.readAtUtc ? (
                    <Button key={busy === item.notificationId ? "Saving…" : "Mark as read"}
                      lines="none"
                      border
                      color="neutral"
                      size="sm"
                      icon={tick02}
                      iconPosition="left"
                      busy={busy === item.notificationId}
                      disabled={busy !== null}
                      onClick={() => void markRead(item.notificationId)}
                    >
                      {busy === item.notificationId ? "Saving…" : "Mark as read"}
                    </Button>
                  ) : null}
                </>
              }
            />
          ))}
        </Rows>
      ) : null}
      <Pager label="Notification pages">
        <Button lines="none" border color="neutral" size="sm" icon={refresh} iconPosition="left" disabled={busy !== null} onClick={() => load(cursor)}>
          Refresh
        </Button>
        {cursor ? (
          <Button lines="none" border color="neutral" size="sm" icon={arrowLeft01} iconPosition="left" disabled={busy !== null} onClick={() => load()}>
            Newest notifications
          </Button>
        ) : null}
        {page?.nextCursor ? (
          <Button lines="none" border color="neutral" size="sm" icon={arrowRight01} disabled={busy !== null} onClick={() => load(page.nextCursor ?? undefined)}>
            Older notifications
          </Button>
        ) : null}
      </Pager>
      <ConfirmDialog
        open={cutoff !== null}
        onClose={() => setCutoff(null)}
        eyebrow="Inbox"
        title="Mark as read?"
        confirmLabel="Mark through this cutoff"
        busyLabel="Saving…"
        busy={busy === "all"}
        onConfirm={() => void readThrough()}
        error={error || undefined}
      >
        {status ? <Notice kind="success">{status}</Notice> : null}
        <p>
          Mark unread notifications through <strong>{cutoff ? formatDateTime(cutoff) : ""}</strong> as read? This includes older pages. Each request
          handles up to 500 notifications.
        </p>
      </ConfirmDialog>
    </section>
  );
}
