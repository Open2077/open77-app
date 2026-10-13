"use client";

import NextLink from "next/link";
import { useEffect, useState } from "react";

import { AuthPanel } from "@/components/account/auth-panel";
import { ArrowLink, Pager, Pending, Row, Rows, StateTag } from "@/components/account/kit";
import { Button } from "@/components/ui/button";
import { EmptyState, Notice } from "@/components/ui/feedback";
import { arrowLeft01, arrowRight01, refresh } from "@/components/ui/icons";
import { useSession } from "@/lib/account/session";
import { savedProjects, setInteraction } from "@/lib/community/client-api";
import type { CommunityPage, CommunitySavedProject } from "@/lib/community/types";

import styles from "./saved-projects.module.css";

export function SavedProjects({ kind }: { kind: "save" | "subscription" }) {
  const { session, ready } = useSession();
  if (!ready) return <Pending label="Account" />;
  if (!session) return <AuthPanel />;
  if (!session.emailVerified)
    return (
      <Notice kind="info" title="Verify your e-mail first">
        <NextLink href="/account">Verify your email</NextLink> to access your private lists.
      </Notice>
    );
  return <Entries key={`${session.accountId}-${kind}`} token={session.token} kind={kind} />;
}

function Entries({ token, kind }: { token: string; kind: "save" | "subscription" }) {
  const [page, setPage] = useState<CommunityPage<CommunitySavedProject> | null>(null);
  const [cursor, setCursor] = useState<string>();
  const [refreshCount, setRefresh] = useState(0);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  useEffect(() => {
    const controller = new AbortController();
    savedProjects(token, kind, cursor, AbortSignal.any([controller.signal, AbortSignal.timeout(10000)]))
      .then((value) => {
        if (!controller.signal.aborted) {
          setPage(value);
          setError("");
        }
      })
      .catch((error) => {
        if (!controller.signal.aborted) setError(error instanceof Error ? error.message : "This list could not be loaded.");
      });
    return () => controller.abort();
  }, [token, kind, cursor, refreshCount]);
  async function remove(id: string) {
    setBusy(id);
    setError("");
    try {
      await setInteraction(token, id, kind, false, AbortSignal.timeout(10000));
      setPage((current) => (current ? { ...current, items: current.items.filter((item) => item.projectId !== id) } : current));
    } catch (error) {
      setError(error instanceof Error ? error.message : "Your preference could not be removed.");
    } finally {
      setBusy(null);
    }
  }
  function load(cursor?: string) {
    setPage(null);
    setCursor(cursor);
    setRefresh((value) => value + 1);
  }
  const label = kind === "save" ? "Saved creations" : "Release subscriptions";
  return (
    <section aria-label={label} className={styles.list}>
      {error ? (
        <Notice
          kind="danger"
          action={
            !page ? (
              <Button lines="none" border color="red" size="sm" onClick={() => load(cursor)}>
                Try again
              </Button>
            ) : undefined
          }
        >
          {error}
        </Notice>
      ) : null}
      {!page && !error ? <Pending label="Loading your list" /> : null}
      {page?.items.length === 0 ? (
        <EmptyState
          eyebrow={kind === "save" ? "Nothing saved" : "No subscription"}
          title={cursor ? "No creations on this page" : kind === "save" ? "No saved creations yet" : "You follow no creation yet"}
          action={
            <Button lines="none" icon={arrowRight01} href="/workshop/browse">
              Explore resources
            </Button>
          }
        >
          {kind === "save"
            ? "Save resources and showcases from the Workshop to find them here later. The list is private to you."
            : "Follow a creation from its Workshop page and its new releases land in your inbox."}
        </EmptyState>
      ) : null}
      {page && page.items.length > 0 ? (
        <Rows label={label}>
          {page.items.map((item) => (
            <Row
              key={item.projectId}
              muted={!item.project}
              meta={
                item.project ? (
                  <>
                    <span>{item.project.content.category}</span>
                    <span>{item.project.content.kind}</span>
                  </>
                ) : (
                  <StateTag state="removed" label="Unavailable" />
                )
              }
              title={item.project ? <NextLink href={`/workshop/${item.project.slug}`}>{item.project.content.title}</NextLink> : "Creation unavailable"}
              description={item.project?.content.summary ?? "This creation is no longer publicly available. You can still remove it from your list."}
              aside={
                <>
                  {item.project ? <ArrowLink href={`/workshop/${item.project.slug}`}>Open</ArrowLink> : null}
                  <Button key={busy === item.projectId ? "Removing…" : kind === "save" ? "Remove saved creation" : "Unfollow releases"} lines="none" border color="neutral" size="sm" busy={busy === item.projectId} disabled={busy !== null} onClick={() => void remove(item.projectId)}>
                    {busy === item.projectId ? "Removing…" : kind === "save" ? "Remove saved creation" : "Unfollow releases"}
                  </Button>
                </>
              }
            />
          ))}
        </Rows>
      ) : null}
      <Pager label="Private list pages">
        <Button lines="none" border color="neutral" size="sm" icon={refresh} iconPosition="left" disabled={busy !== null} onClick={() => load(cursor)}>
          Refresh
        </Button>
        {cursor ? (
          <Button lines="none" border color="neutral" size="sm" icon={arrowLeft01} iconPosition="left" disabled={busy !== null} onClick={() => load()}>
            Newest first
          </Button>
        ) : null}
        {page?.nextCursor ? (
          <Button lines="none" border color="neutral" size="sm" icon={arrowRight01} disabled={busy !== null} onClick={() => load(page.nextCursor ?? undefined)}>
            Next page
          </Button>
        ) : null}
      </Pager>
    </section>
  );
}
