"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";

import { Button } from "@/components/ui/button";
import { Notice } from "@/components/ui/feedback";
import { Checkbox, Field, Input, Textarea } from "@/components/ui/field";
import { refresh as refreshGlyph, upload02 } from "@/components/ui/icons";
import type { StoredSession } from "@/lib/account/session";
import * as api from "@/lib/community/client-api";
import { transferUpload } from "@/lib/community/upload";
import type { CommunityPage, CommunityProject, CommunityRelease, CommunityUploadItem } from "@/lib/community/types";
import { validationHelp } from "@/lib/community/validation-help";
import { MasterApiError } from "@/lib/account/api";
import type { FieldErrors } from "@/lib/account/field-errors";
import { CreateAttempt } from "@/lib/community/create-attempt";
import { Actions, ArrowLink, Block, Disclosure, Fine, FileInput, Pager, Pending, Progress, StateTag } from "@/components/account/kit";
import { Card, Digest, FieldGrid, Meta, MonoBlock, Name, Stack, Subhead, Text } from "./creator-parts";
import { GitHubImportPicker, GitHubImportStatus } from "./github-import";
import { ReleaseFiles } from "./release-files";
import { useReleaseEditor } from "./use-release-editor";
import { ValidationIssues, fieldIssue } from "./validation-issues";

import styles from "./creator-releases.module.css";

const errorText = (error: unknown) => error instanceof Error ? error.message : "The request failed. Please try again.";
/** An upload still able to complete for this release: reserved, in flight or queued, and not yet expired. */
const activeUploadFor = (releaseId: string, checkedAt: number) => (item: CommunityUploadItem) =>
  item.upload.releaseId === releaseId && ["pending", "receiving", "uploaded", "processing", "importing"].includes(item.upload.state) && Date.parse(item.upload.expiresAtUtc) > checkedAt;
const lines = (value: string) => [...new Set(value.split(/\r?\n/).map(line => line.trim()).filter(Boolean))];

function PackageTransfer({ token, projectId, releaseId, existing, checkedAt, changed }: {
  token: string; projectId: string; releaseId: string; existing?: CommunityUploadItem; checkedAt: number; changed: () => void;
}) {
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState(0);
  const [status, setStatus] = useState("");
  const [error, setError] = useState("");
  const controller = useRef<AbortController | null>(null);
  useEffect(() => () => controller.current?.abort(), []);
  useEffect(() => {
    if (!busy) return;
    const warn = (event: BeforeUnloadEvent) => event.preventDefault();
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [busy]);
  async function submit(event: FormEvent) {
    event.preventDefault();
    if (busy) return;
    setError("");
    const finalizeOnly = existing?.upload.state === "uploaded";
    if (!finalizeOnly && (!file || !file.name.toLowerCase().endsWith(".zip") || !file.size || file.size > 100 * 1024 * 1024)) {
      setError("Choose a non-empty ZIP file up to 100 MiB."); return;
    }
    if (!finalizeOnly && existing && file && (file.name !== existing.originalName || file.size > existing.upload.maximumBytes)) {
      setError("Choose the original filename within its reserved size to restart this transfer."); return;
    }
    const operation = new AbortController(); controller.current = operation;
    setBusy(true); setProgress(0); setStatus(finalizeOnly ? "Submitting for validation…" : "Reserving your upload…");
    try {
      let id = existing?.upload.uploadId;
      if (!finalizeOnly && file) {
        const grant = existing ? await api.restartUpload(token, existing.upload.uploadId, operation.signal) :
          await api.reserveUpload(token, projectId, releaseId, "package", file, operation.signal);
        id = grant.uploadId; setStatus("Uploading ZIP…");
        await transferUpload(grant, file, operation.signal, setProgress);
      }
      if (!id) throw new Error("No upload was reserved.");
      setStatus("Submitting for validation…");
      await api.completeUpload(token, id, operation.signal);
      setStatus("Queued for package validation. Review begins after validation succeeds.");
      setFile(null);
    } catch (error) {
      setStatus("");
      setError(operation.signal.aborted ? "Transfer stopped. Refresh status before restarting; completed bytes may already be stored." : errorText(error));
    } finally {
      if (controller.current === operation) controller.current = null;
      setBusy(false); changed();
    }
  }
  if (!busy && existing && (!["pending", "uploaded"].includes(existing.upload.state) || Date.parse(existing.upload.expiresAtUtc) <= checkedAt)) return null;
  return (
    <form className={styles.transfer} onSubmit={submit}>
      {existing?.upload.state !== "uploaded" ? (
        <Field label={existing ? "Select your ZIP again to restart" : "Release ZIP"} hint="Protocol ceiling: 100 MiB. Your publishing limits may be lower. Include open77.lua and the declared resource files.">
          <FileInput accept=".zip,application/zip" disabled={busy} onChange={event => { setFile(event.target.files?.[0] ?? null); setError(""); }} />
        </Field>
      ) : null}
      <Actions>
        <Button key={existing?.upload.state ?? "new"} type="submit" lines="none" size="sm" icon={upload02} iconPosition="left" disabled={busy || (!file && existing?.upload.state !== "uploaded")}>
          {existing?.upload.state === "uploaded" ? "Submit stored file for validation" : existing ? "Restart upload" : "Upload ZIP"}
        </Button>
        {busy ? (
          <Button lines="none" color="neutral" border size="sm" onClick={() => controller.current?.abort()}>
            Stop transfer
          </Button>
        ) : null}
      </Actions>
      {busy ? <Progress value={progress} label="ZIP upload progress" /> : null}
      {status ? <Text role="status">{status}</Text> : null}
      {error ? <Notice kind="danger">{error}</Notice> : null}
    </form>
  );
}

export function CreatorReleases({ session, project, readOnly = false, onUnsavedChange }: { session: StoredSession; project: CommunityProject; readOnly?: boolean; onUnsavedChange?: (dirty: boolean) => void }) {
  const [releases, setReleases] = useState<CommunityPage<CommunityRelease> | null>(null);
  const [uploads, setUploads] = useState<CommunityPage<CommunityUploadItem> | null>(null);
  const [releaseCursor, setReleaseCursor] = useState<string>();
  const [uploadCursor, setUploadCursor] = useState<string>();
  const [refresh, setRefresh] = useState(0);
  const [error, setError] = useState("");
  const [pollPaused, setPollPaused] = useState(false);
  const [checkedAt, setCheckedAt] = useState(0);
  const draft = useReleaseEditor(session.token, project.projectId, { version: "", changelog: "", license: project.content.license ?? "",
    installation: project.content.installation, testedBuilds: "", requiredResources: "" });
  const { version, changelog, license, installation, testedBuilds, requiredResources } = draft.content;
  const [creating, setCreating] = useState(false);
  const createAttempt = useRef(new CreateAttempt<{ version: string; metadata: CommunityRelease["metadata"]; distributionRightsConfirmed: boolean }>());
  const [pendingCreate, setPendingCreate] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [createError, setCreateError] = useState("");
  const [createStatus, setCreateStatus] = useState("");
  const [rightsContent, setRightsContent] = useState<typeof draft.content | null>(null);
  const rights = rightsContent === draft.content;
  useEffect(() => { onUnsavedChange?.(draft.dirty || pendingCreate); }, [draft.dirty, pendingCreate, onUnsavedChange]);
  function reload() { setRefresh(value => value + 1); }
  useEffect(() => {
    const controller = new AbortController();
    let timer: ReturnType<typeof setTimeout> | undefined;
    let polls = 0;
    async function load() {
      try {
        const signal = AbortSignal.any([controller.signal, AbortSignal.timeout(15000)]);
        const [nextReleases, nextUploads] = await Promise.all([
          api.myReleases(session.token, project.projectId, releaseCursor, signal),
          api.myUploads(session.token, project.projectId, uploadCursor, signal),
        ]);
        if (controller.signal.aborted) return;
        setReleases(nextReleases); setUploads(nextUploads); setError(""); setPollPaused(false); setCheckedAt(Date.now());
        if (nextUploads.items.some(item => ["processing", "receiving", "importing"].includes(item.upload.state))) {
          if (polls++ < 20) timer = setTimeout(load, Math.min(30000, 3000 * 1.3 ** polls));
          else setPollPaused(true);
        }
      } catch (error) { if (!controller.signal.aborted) { setError(errorText(error)); setPollPaused(true); } }
    }
    void load();
    return () => { controller.abort(); clearTimeout(timer); };
  }, [session.token, project.projectId, releaseCursor, uploadCursor, refresh]);
  async function create(event: FormEvent) {
    event.preventDefault(); if (creating || (!createAttempt.current.pending && (!draft.loaded || draft.busy || draft.conflict || !rights))) return;
    setCreating(true); setCreateError(""); setCreateStatus(""); setFieldErrors({});
    try {
      if (!createAttempt.current.pending && !await draft.save()) return;
      const request = createAttempt.current.begin({ version: version.trim(), metadata: { changelog, license, installation,
        testedBuilds: lines(testedBuilds), requiredResources: lines(requiredResources) }, distributionRightsConfirmed: rights });
      setPendingCreate(true);
      await api.createRelease(session.token, project.projectId, request.body.version, request.body.metadata, request.body.distributionRightsConfirmed, request.requestId);
      createAttempt.current.resolved(); setPendingCreate(false);
      const currentDetails = { version: version.trim(), metadata: { changelog, license, installation, testedBuilds: lines(testedBuilds), requiredResources: lines(requiredResources) } };
      if (JSON.stringify(currentDetails) === JSON.stringify({ version: request.body.version, metadata: request.body.metadata })) {
        draft.change("version", ""); draft.change("changelog", "");
      }
      setCreateStatus(`Version ${request.body.version} is created. Find it in the release list below.`); setReleaseCursor(undefined); reload();
    } catch (error) { if (error instanceof MasterApiError) { createAttempt.current.rejected(error.status); setPendingCreate(createAttempt.current.pending); setFieldErrors(error.fieldErrors); } setCreateError(errorText(error)); }
    finally { setCreating(false); }
  }
  return (
    <section id="hub-releases" className={styles.releases} aria-label="Manage releases">
      <Block
        eyebrow="Package publishing"
        title="Releases and uploads"
        headingLevel={3}
        actions={
          <Button lines="none" color="neutral" border size="sm" icon={refreshGlyph} iconPosition="left" onClick={reload}>
            Refresh status
          </Button>
        }
      >
        <Stack>
          {error ? <Notice kind="danger">{error}</Notice> : null}
          {createError ? (
            <Notice kind="danger">
              {createError} <a href="/account" target="_blank" rel="noopener noreferrer">Sign in again in another tab</a> with the same account if your session expired. Your details remain here.
            </Notice>
          ) : null}
          {createStatus ? <Notice kind="success">{createStatus}</Notice> : null}
          <ValidationIssues errors={fieldErrors} />
          {pendingCreate && !creating ? <Notice kind="warning">The version may already have been created. Retry the same request to recover it before editing these details. Keep this tab open until it finishes.</Notice> : null}
          {pollPaused ? <Notice kind="info">Automatic status checks have paused. Use Refresh status to check again.</Notice> : null}

          <Disclosure tone="framed" summary="Create a version" hidden={readOnly}>
            <Notice kind="info">Release versions and their details cannot be reused or edited after creation. Check these details before continuing. Your ZIP is validated and reviewed before publication.</Notice>
            <Meta>
              <span role="status">{!draft.loaded ? "Loading your private release draft…" : draft.busy ? "Saving release details…" : draft.dirty ? "Unsaved release details" : "Release details saved"}</span>
              <span>This unfinished form is private to your account.</span>
            </Meta>
            {draft.error ? (
              <Notice
                kind="danger"
                action={
                  <Button lines="none" color="red" border size="sm" disabled={draft.busy || draft.conflict} onClick={() => { if (draft.loaded) void draft.save(); else draft.retryLoad(); }}>
                    Retry
                  </Button>
                }
              >
                {draft.error} Your text is retained; autosave is paused.
              </Notice>
            ) : null}
            {draft.conflict ? (
              <Notice kind="warning" title="Another tab changed your release draft. Compare before resuming.">
                <Stack tight>
                  <div>
                    <Button lines="none" color="neutral" border size="sm" disabled={draft.busy} onClick={draft.compare}>
                      Compare saved details
                    </Button>
                  </div>
                  {draft.remote ? (
                    <>
                      <FieldGrid>
                        <MonoBlock label={<Subhead as="h4">Your details</Subhead>}>{JSON.stringify(draft.content, null, 2)}</MonoBlock>
                        <MonoBlock label={<Subhead as="h4">Saved details</Subhead>}>{JSON.stringify(draft.remote.content, null, 2)}</MonoBlock>
                      </FieldGrid>
                      <Actions>
                        <Button lines="none" color="neutral" border size="sm" onClick={() => draft.recover("remote")}>Discard mine and use saved details</Button>
                        <Button lines="none" size="sm" onClick={() => draft.recover("local")}>Replace saved details with mine</Button>
                      </Actions>
                    </>
                  ) : null}
                </Stack>
              </Notice>
            ) : null}
            <form className={styles.form} onSubmit={create}>
              <fieldset className={styles.fields} disabled={!draft.loaded || draft.conflict || creating || pendingCreate}>
                <Field label="Version" error={fieldIssue(fieldErrors, "version")}>
                  <Input required maxLength={100} placeholder="1.0.0 or 1.0.0-beta.1" value={version} onChange={event => draft.change("version", event.target.value)} />
                </Field>
                <Field label="Changelog" error={fieldIssue(fieldErrors, "changelog")}>
                  <Textarea required maxLength={50000} value={changelog} onChange={event => draft.change("changelog", event.target.value)} />
                </Field>
                <Field label="Installation and configuration" error={fieldIssue(fieldErrors, "installation")}>
                  <Textarea required maxLength={50000} value={installation} onChange={event => draft.change("installation", event.target.value)} />
                </Field>
                <Field label="License and attribution" error={fieldIssue(fieldErrors, "license")}>
                  <Textarea required maxLength={10000} value={license} onChange={event => draft.change("license", event.target.value)} />
                </Field>
                <FieldGrid>
                  <Field label="Tested Open77 builds, one per line" error={fieldIssue(fieldErrors, "testedBuilds")}>
                    <Textarea maxLength={10000} rows={4} value={testedBuilds} onChange={event => draft.change("testedBuilds", event.target.value)} />
                  </Field>
                  <Field label="Required resources, one per line" error={fieldIssue(fieldErrors, "requiredResources")}>
                    <Textarea maxLength={10000} rows={4} value={requiredResources} onChange={event => draft.change("requiredResources", event.target.value)} />
                  </Field>
                </FieldGrid>
              </fieldset>
              <Checkbox checked={rights} disabled={creating || pendingCreate || !draft.loaded} onChange={event => setRightsContent(event.target.checked ? draft.content : null)}>
                I have permission to share this creation, its images and all included files under the stated license.
              </Checkbox>
              <Actions>
                <Button lines="none" color="neutral" border size="sm" disabled={!draft.loaded || draft.busy || draft.conflict || creating} onClick={() => { void draft.save(); }}>
                  Save release draft
                </Button>
                <Button key={creating ? "creating" : pendingCreate ? "recover" : "create"} type="submit" lines="none" size="sm" busy={creating} disabled={!pendingCreate && (!draft.loaded || draft.busy || draft.conflict || !rights)}>
                  {creating ? "Creating…" : pendingCreate ? "Recover created version" : "Create immutable version"}
                </Button>
              </Actions>
            </form>
          </Disclosure>

          {!releases && !error ? <Pending label="Loading releases" /> : null}
          {releases?.items.length ? (
            <div className={styles.list}>
              {releases.items.map(release => (
                <Card key={release.releaseId} className={styles.release}>
                  <div className={styles.releaseHead}>
                    <Subhead as="h4">Version {release.version}</Subhead>
                    <StateTag state={release.state} />
                  </div>
                  {release.state === "uploading" ? (
                    <div hidden={readOnly} className={styles.uploadArea}>
                      <PackageTransfer token={session.token} projectId={project.projectId} releaseId={release.releaseId} checkedAt={checkedAt} changed={reload}
                        existing={uploads?.items.find(activeUploadFor(release.releaseId, checkedAt))} />
                      {!uploads?.items.some(activeUploadFor(release.releaseId, checkedAt)) ? (
                        <GitHubImportPicker key={`${session.token}:${release.releaseId}`} session={session} projectId={project.projectId} releaseId={release.releaseId} sourceUrl={project.content.sourceUrl} changed={reload} />
                      ) : null}
                    </div>
                  ) : null}
                  {readOnly ? (
                    <Stack tight>
                      <MonoBlock label="Changelog">{release.metadata.changelog}</MonoBlock>
                      <Text>Tested builds: {release.metadata.testedBuilds.join(", ") || "None declared"}</Text>
                      <Text>Required resources: {release.metadata.requiredResources.join(", ") || "None declared"}</Text>
                      <MonoBlock label="License">{release.metadata.license}</MonoBlock>
                      <MonoBlock label="Installation">{release.metadata.installation}</MonoBlock>
                    </Stack>
                  ) : null}
                  {release.sha256 ? <Digest label="SHA-256">{release.sha256}</Digest> : null}
                  {release.resources.length > 0 ? <ReleaseFiles key={`${session.accountId}:${release.releaseId}`} releaseId={release.releaseId} token={session.token} /> : null}
                  {release.resources.length > 0 ? (
                    <Disclosure summary="Inspected resources and requirements">
                      {release.resources.map(resource => (
                        <div className={styles.resource} key={resource.name}>
                          <Name as="h5">{resource.name}</Name>
                          <Text>Root: <code>{resource.relativeRoot || "."}</code> · Manifest version: {resource.manifest.version}</Text>
                          <Text>Open77: {resource.manifest.open77Version}</Text>
                          <Text>Dependencies: {resource.manifest.dependencies.join(", ") || "None declared"}</Text>
                          <Text>Permissions: {resource.manifest.permissions.join(", ") || "None declared"}</Text>
                          <Text>Preloads: {resource.manifest.preloadMods.join(", ") || "None declared"}</Text>
                        </div>
                      ))}
                    </Disclosure>
                  ) : null}
                </Card>
              ))}
            </div>
          ) : null}
          <Pager label="Your release pages">
            {releaseCursor ? <Button lines="none" color="neutral" border size="sm" onClick={() => setReleaseCursor(undefined)}>Newest releases</Button> : null}
            {releases?.nextCursor ? <Button lines="none" color="neutral" border size="sm" onClick={() => setReleaseCursor(releases.nextCursor ?? undefined)}>Older releases</Button> : null}
          </Pager>
        </Stack>
      </Block>

      <div hidden={readOnly}>
        <Block eyebrow="Transfers" title="Your upload history" headingLevel={3} lead="Interrupted transfers restart from the beginning. Pending reservations expire after 30 minutes; stored files can be submitted for validation without uploading again.">
          <Stack>
            {uploads?.items.length === 0 ? <Fine>No uploads yet.</Fine> : null}
            {uploads?.items.length ? (
              <div className={styles.list}>
                {uploads.items.map(item => (
                  <Card key={item.upload.uploadId} className={styles.release}>
                    <div className={styles.releaseHead}>
                      <Name>{item.originalName}</Name>
                      <StateTag state={item.upload.state} />
                    </div>
                    {item.importId ? <GitHubImportStatus key={`${session.token}:${item.importId}`} token={session.token} id={item.importId} checkedAt={checkedAt} /> : null}
                    {item.upload.inspectionCode ? (
                      <Notice kind="danger" title={<>Validation result: <code>{item.upload.inspectionCode}</code></>}>
                        {validationHelp(item.upload.inspectionCode)}{" "}
                        <ArrowLink href="/docs/server-resources" external>Resource documentation</ArrowLink>
                      </Notice>
                    ) : null}
                    {item.upload.state === "accepted" ? <Text>Technical validation passed. Publication still requires moderation approval.</Text> : null}
                    {["pending", "uploaded"].includes(item.upload.state) && Date.parse(item.upload.expiresAtUtc) <= checkedAt ? <Fine>This reservation expired. Select a ZIP from the release above to start a new reservation.</Fine> : null}
                    {item.upload.releaseId ? (
                      <PackageTransfer token={session.token} projectId={project.projectId} releaseId={item.upload.releaseId} existing={item} checkedAt={checkedAt} changed={reload} />
                    ) : null}
                  </Card>
                ))}
              </div>
            ) : null}
            <Pager label="Your upload pages">
              {uploadCursor ? <Button lines="none" color="neutral" border size="sm" onClick={() => setUploadCursor(undefined)}>Newest uploads</Button> : null}
              {uploads?.nextCursor ? <Button lines="none" color="neutral" border size="sm" onClick={() => setUploadCursor(uploads.nextCursor ?? undefined)}>Older uploads</Button> : null}
            </Pager>
          </Stack>
        </Block>
      </div>
    </section>
  );
}
