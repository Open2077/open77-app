"use client";

import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import { Notice } from "@/components/ui/feedback";
import { refresh as refreshGlyph } from "@/components/ui/icons";
import { activity } from "@/lib/community/client-api";
import type { CommunityActivity, CommunityPage } from "@/lib/community/types";
import { Disclosure, Fine, Pager, Pending, Row, Rows, formatDateTime } from "@/components/account/kit";
import { AppealForm } from "./appeal-form";
import { MonoBlock } from "./creator-parts";

import styles from "./activity-history.module.css";

export function ActivityHistory({ token, kind, id, title = "Moderation decisions", initiallyOpen = false, allowAppeals = false }: {
  token: string; kind: "project" | "report"; id: string; title?: string; initiallyOpen?: boolean; allowAppeals?: boolean;
}) {
  const [open, setOpen] = useState(initiallyOpen);
  const [visited, setVisited] = useState(initiallyOpen);
  return (
    <Disclosure summary={title} open={open} onToggle={event => { setOpen(event.currentTarget.open); if (event.currentTarget.open) setVisited(true); }}>
      {visited ? <HistoryEntries token={token} kind={kind} id={id} allowAppeals={allowAppeals} /> : null}
    </Disclosure>
  );
}

function HistoryEntries({ token, kind, id, allowAppeals }: { token: string; kind: "project" | "report"; id: string; allowAppeals: boolean }) {
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
  return (
    <div className={styles.history}>
      {error ? <Notice kind="danger">{error}</Notice> : null}
      {!page && !error ? <Pending label="Loading history" /> : null}
      {page?.items.length === 0 ? <Fine>No decisions have been recorded yet.</Fine> : null}
      {page?.items.length ? (
        <Rows label="Decision history">
          {page.items.map(item => (
            <Row
              as="li"
              key={item.activityId}
              marker
              meta={
                <>
                  <time dateTime={item.createdAtUtc}>{formatDateTime(item.createdAtUtc)}</time>
                  {item.actorDisplayName ? <span>{item.actorDisplayName}</span> : null}
                </>
              }
              title={<span className={styles.action}>{item.action.replaceAll("_", " ")}</span>}
              description={item.reason ? <span className={styles.reason}>{item.reason}</span> : undefined}
            >
              {kind === "project" && allowAppeals && ["project_rejected", "release_rejected", "release_revoked", "project_suspended"].includes(item.action) ? (
                <AppealForm token={token} decisionId={item.activityId} />
              ) : null}
              {item.actorDisplayName ? (
                <Disclosure summary="Audit details">
                  <MonoBlock>{JSON.stringify(item.details, null, 2)}</MonoBlock>
                </Disclosure>
              ) : null}
            </Row>
          ))}
        </Rows>
      ) : null}
      <Pager label="History pages">
        <Button lines="none" color="neutral" border size="sm" icon={refreshGlyph} iconPosition="left" onClick={() => setRefresh(value => value + 1)}>
          Refresh history
        </Button>
        {cursor ? (
          <Button lines="none" color="neutral" border size="sm" onClick={() => setCursor(undefined)}>
            Newest entries
          </Button>
        ) : null}
        {page?.nextCursor ? (
          <Button lines="none" color="neutral" border size="sm" onClick={() => setCursor(page.nextCursor ?? undefined)}>
            Older entries
          </Button>
        ) : null}
      </Pager>
    </div>
  );
}
