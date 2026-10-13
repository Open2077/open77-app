"use client";

import { useCallback, useEffect, useRef, useState, type FormEvent } from "react";

import { DownloadButton } from "@/components/community/download-button";
import { PrivateMediaPreview } from "@/components/community/private-media-preview";
import { ReleaseFiles } from "@/components/community/release-files";
import { Button } from "@/components/admin/admin-button";
import { Chip, Tag } from "@/components/ui/chip";
import { DefinitionList } from "@/components/ui/data";
import { Notice } from "@/components/ui/feedback";
import { Checkbox, Field, Select, Textarea } from "@/components/ui/field";
import { arrowRight01, arrowUpRight01, refresh, store01 } from "@/components/ui/icons";
import { useSession } from "@/lib/account/session";
import * as api from "@/lib/community/client-api";
import type { CommunityPage, CommunityProject, CommunityRelease, CommunityReviewItem } from "@/lib/community/types";
import {
  AdminPanel,
  AdminTable,
  Disclosure,
  EmptyBlock,
  Filters,
  FormActions,
  FormPanel,
  LoadingBlock,
  Mono,
  Preformatted,
  Primary,
  Sub,
  SubHeading,
  Toolbar,
  cell,
} from "./admin-kit";
import { HashCell } from "./hash-cell";
import { useAdminData } from "./use-admin-data";

import styles from "./community-panels.module.css";

const message = (error: unknown) => error instanceof Error ? error.message : "The request failed. Please try again.";

export function CommunityReviewPanel() {
  const { session } = useSession();
  const [kind, setKind] = useState<"projects" | "releases">("projects");
  const [cursor, setCursor] = useState<string>();
  const [selected, setSelected] = useState<CommunityReviewItem | null>(null);
  const load = useCallback((token: string) => api.reviewQueue(token, kind, cursor, AbortSignal.timeout(10000)), [kind, cursor]);
  const queue = useAdminData(load);
  const token = session?.token;
  const page: CommunityPage<CommunityReviewItem> | null = queue.loading ? null : queue.data;
  const error = queue.error ?? "";
  if (!token) return null;
  return (
    <>
      <AdminPanel
        title="Review queue"
        icon={store01}
        brackets
        actions={
          <>
            <Button href="/admin/resources/quotas" size="sm" color="neutral" border lines="none" icon={arrowRight01}>
              Creator allowances
            </Button>
            <Button size="sm" color="neutral" border lines="none" icon={refresh} iconPosition="left" onClick={queue.reload}>
              Refresh queue
            </Button>
          </>
        }
      >
        <Toolbar>
          <Filters label="Review queues">
            {(["projects", "releases"] as const).map(value => (
              <Chip key={value} pressed={value === kind} onClick={() => { setKind(value); setCursor(undefined); setSelected(null); }}>
                {value === "projects" ? "Project pages" : "Package releases"}
              </Chip>
            ))}
          </Filters>
        </Toolbar>
        {error ? <Notice kind="danger">{error}</Notice> : null}
        {!page && !error ? <LoadingBlock label="Loading review queue…" /> : null}
        {page?.items.length === 0 ? <EmptyBlock icon={store01}>Nothing is waiting in this queue.</EmptyBlock> : null}
        {page?.items.length ? (
          <AdminTable caption={kind === "projects" ? "Project pages waiting for review" : "Package releases waiting for review"} minWidth="44rem">
            <thead>
              <tr>
                <th>Submission</th>
                <th>Queued</th>
                <th className={cell.actions}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {page.items.map(item => (
                <tr key={item.id} className={selected?.id === item.id ? cell.active : undefined}>
                  <td>
                    <Primary>{item.title}</Primary>
                    <Sub>{item.version ? `Version ${item.version} · ` : ""}Revision {item.revision}</Sub>
                  </td>
                  <td className={cell.nowrap}>
                    <Mono tone="dim">{new Date(item.queuedAtUtc).toLocaleString()}</Mono>
                  </td>
                  <td className={cell.actions}>
                    <span className={styles.queueNav}>
                      <Button size="sm" color="red" lines="none" onClick={() => setSelected(item)}>Inspect submission</Button>
                      <Button href={`/admin/resources/${item.projectId}`} size="sm" color="neutral" border lines="none" icon={arrowUpRight01}>
                        Project moderation
                      </Button>
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </AdminTable>
        ) : null}
        <nav className={styles.queueNav} aria-label="Review queue pages">
          {cursor ? <Button size="sm" color="neutral" border lines="none" onClick={() => setCursor(undefined)}>Start of queue</Button> : null}
          {page?.nextCursor ? <Button size="sm" color="neutral" border lines="none" icon={arrowRight01} onClick={() => setCursor(page.nextCursor ?? undefined)}>Next page</Button> : null}
        </nav>
      </AdminPanel>
      {selected ? (
        <ReviewDetail key={`${selected.kind}-${selected.id}-${selected.revision}`} token={token} item={selected}
          completed={() => { setSelected(null); queue.reload(); }} />
      ) : null}
    </>
  );
}

function ReviewDetail({ token, item, completed }: { token: string; item: CommunityReviewItem; completed: () => void }) {
  const [project, setProject] = useState<CommunityProject | null>(null);
  const [release, setRelease] = useState<CommunityRelease | null>(null);
  const [error, setError] = useState("");
  const [reason, setReason] = useState("");
  const [approve, setApprove] = useState(false);
  const [checked, setChecked] = useState(false);
  const [busy, setBusy] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const heading = useRef<HTMLHeadingElement>(null);
  useEffect(() => { heading.current?.focus(); }, []);
  useEffect(() => {
    const controller = new AbortController();
    const signal = AbortSignal.any([controller.signal, AbortSignal.timeout(15000)]);
    Promise.all([api.myProject(token, item.projectId, signal), item.kind === "releases" ? api.reviewRelease(token, item.id, signal) : Promise.resolve(null)])
      .then(([project, release]) => { if (!controller.signal.aborted) { setProject(project); setRelease(release); setError(""); } })
      .catch(error => { if (!controller.signal.aborted) setError(message(error)); });
    return () => controller.abort();
  }, [token, item, attempt]);
  const revision = item.kind === "projects" ? project?.revision : release?.revision;
  const state = item.kind === "projects" ? project?.revisionStatus : release?.state;
  const current = revision === item.revision && state === (item.kind === "projects" ? "submitted" : "pending_review");
  async function decide(event: FormEvent) {
    event.preventDefault(); if (!current || !checked || busy) return;
    setBusy(true); setError("");
    try { await api.reviewDecision(token, item.kind, item.id, item.revision, approve, reason); completed(); }
    catch (error) { setError(message(error)); setChecked(false); }
    finally { setBusy(false); }
  }
  return (
    <AdminPanel
      as="section"
      label="Submission review"
      brackets
      titleRef={heading}
      title={<>Inspect {item.title}{item.version ? ` · ${item.version}` : ""}</>}
      meta={`revision ${item.revision}`}
    >
      <Notice kind="info">Reviewing revision {item.revision}. A resource project needs an approved release before its page can be approved.</Notice>
      {error ? (
        <Notice
          kind="danger"
          action={
            <Button size="sm" color="red" border lines="none" disabled={busy} onClick={() => { setChecked(false); setError(""); setAttempt(value => value + 1); }}>
              Reload this submission
            </Button>
          }
        >
          {error}
        </Notice>
      ) : null}
      {!project && !error ? <LoadingBlock label="Loading submission…" rows={3} /> : null}
      {project ? (
        <section className={styles.section} aria-label="Project page">
          <SubHeading>Project page</SubHeading>
          <p className={styles.summary}>{project.content.summary}</p>
          <div className={styles.tags}>
            <Tag tone="neutral">{project.content.category}</Tag>
            <Tag tone="neutral">{project.content.kind}</Tag>
            <Tag tone="neutral">{project.content.maturity}</Tag>
          </div>
          <Disclosure summary="Project description and installation" open>
            <Preformatted>{project.content.description}</Preformatted>
            <Preformatted>{project.content.installation}</Preformatted>
          </Disclosure>
          <DefinitionList
            items={[
              { label: "License", value: project.content.license || "Not provided" },
              { label: "Tags", value: project.content.tags.join(", ") || "None" },
            ]}
          />
          <div className={styles.links}>
            {[project.content.sourceUrl, project.content.issueUrl, ...(project.content.videoUrls ?? [])].filter(Boolean).map((url, index) => (
              <a key={index} href={url!} target="_blank" rel="noopener noreferrer nofollow ugc">{url}</a>
            ))}
          </div>
          <div className={styles.media}>
            {project.content.media?.map(media => (
              <figure key={media.mediaId}>
                <PrivateMediaPreview token={token} mediaId={media.mediaId} alt={media.altText} />
                <figcaption>{media.altText}{media.caption ? `: ${media.caption}` : ""}</figcaption>
              </figure>
            ))}
          </div>
        </section>
      ) : null}
      {release ? (
        <section className={styles.section} aria-label="Release details">
          <SubHeading>Release details</SubHeading>
          <Preformatted>{release.metadata.changelog}</Preformatted>
          <Preformatted>{release.metadata.installation}</Preformatted>
          <DefinitionList
            items={[
              { label: "License", value: release.metadata.license },
              { label: "Tested builds", value: release.metadata.testedBuilds.join(", ") || "None declared" },
              { label: "Required resources", value: release.metadata.requiredResources.join(", ") || "None declared" },
              { label: "Size", value: <Mono>{release.sizeBytes} bytes</Mono> },
            ]}
          />
          {release.sha256 ? <p className={styles.digest}><span>SHA-256</span> <HashCell sha256={release.sha256} /></p> : null}
          <div>
            <DownloadButton key={`${release.releaseId}-${release.revision}`} releaseId={release.releaseId} version={release.version} review={{ token, revision: release.revision }} color="red" />
          </div>
          <ReleaseFiles key={release.releaseId} releaseId={release.releaseId} token={token} />
          <Notice kind="info">This private ZIP is for review. Its link expires after five minutes or a release decision. Review downloads do not count toward public popularity.</Notice>
          <Disclosure summary="Immutable inspection snapshot and manifests" open>
            <Preformatted>{JSON.stringify(release.inspection, null, 2)}</Preformatted>
          </Disclosure>
        </section>
      ) : null}
      {project && !current ? (
        <Notice kind="warning">This submission changed or has already been reviewed. Refresh the queue and inspect the current revision.</Notice>
      ) : null}
      <FormPanel title="Record a decision" onSubmit={decide}>
        <Field label="Decision">
          <Select value={approve ? "approve" : "reject"} onChange={event => { setApprove(event.target.value === "approve"); setChecked(false); }}>
            <option value="reject">Request changes / reject</option>
            <option value="approve">Approve</option>
          </Select>
        </Field>
        <Field label="Reason for the creator and audit log">
          <Textarea required minLength={1} maxLength={5000} rows={4} value={reason} onChange={event => setReason(event.target.value)} />
        </Field>
        <Checkbox checked={checked} onChange={event => setChecked(event.target.checked)}>
          I reviewed this revision and its attached evidence.
        </Checkbox>
        <FormActions>
          <Button type="submit" size="sm" color="red" lines="none" busy={busy} disabled={!current || !checked || !reason.trim()}>
            {busy ? "Recording decision…" : "Record decision"}
          </Button>
          <Button size="sm" color="neutral" border lines="none" disabled={busy} onClick={completed}>
            Close review
          </Button>
        </FormActions>
      </FormPanel>
    </AdminPanel>
  );
}
