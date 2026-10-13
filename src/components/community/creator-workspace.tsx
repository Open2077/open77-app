"use client";

import { useRouter } from "next/navigation";
import { Activity, useCallback, useEffect, useRef, useState, type ReactNode } from "react";

import { Button } from "@/components/ui/button";
import { cx } from "@/components/ui/cx";
import { DefinitionList } from "@/components/ui/data";
import { EmptyState, Notice } from "@/components/ui/feedback";
import { Checkbox, Field, Input, Select, Textarea } from "@/components/ui/field";
import { add01, arrowLeft01, arrowRight01, edit02, refresh, sent, tick02 } from "@/components/ui/icons";
import { Panel } from "@/components/ui/panel";
import { Eyebrow } from "@/components/ui/typography";
import { AuthPanel } from "@/components/account/auth-panel";
import { ArrowLink, Pager, Pending, Row, Rows, StateTag } from "@/components/account/kit";
import { useSession, type StoredSession } from "@/lib/account/session";
import { MasterApiError } from "@/lib/account/api";
import * as api from "@/lib/community/client-api";
import { categories, type CommunityContent, type CommunityPage, type CommunityProject } from "@/lib/community/types";
import { mergeDraft, type DraftField } from "@/lib/community/draft-merge";
import { CreateAttempt } from "@/lib/community/create-attempt";
import type { FieldErrors } from "@/lib/account/field-errors";
import { normalizeSlug } from "@/lib/community/slug";
import { SITE_URL } from "@/lib/site";
import { ActivityHistory } from "./activity-history";
import { CreatorClip } from "./creator-clip";
import { CreatorLimits } from "./creator-limits";
import { CreatorMedia } from "./creator-media";
import { FieldGrid, MonoBlock, Stack, Subhead, Text } from "./creator-parts";
import { CreatorReleases } from "./creator-releases";
import { DraftDeletion } from "./draft-deletion";
import { DraftPreview } from "./draft-preview";
import { ProjectLifecycle } from "./project-lifecycle";
import { ValidationIssues, fieldIssue } from "./validation-issues";

import styles from "./creator-workspace.module.css";

function message(error: unknown) { return error instanceof Error ? error.message : "Something went wrong. Please try again."; }
const emptyContent: CommunityContent = { title: "", summary: "", category: "scripts", description: "", installation: "", kind: "showcase", maturity: "experimental", tags: [] };

function CreatorGate({ children }: { children: (session: StoredSession) => ReactNode }) {
  const { session, ready } = useSession();
  if (!ready) return <Pending label="Account" />;
  if (!session) return <AuthPanel />;
  if (!session.emailVerified)
    return (
      <Notice kind="info" title="Verify your email before sharing a creation." action={<ArrowLink href="/account">Open your account</ArrowLink>}>
        Verification happens once, from your account overview.
      </Notice>
    );
  return <div key={session.accountId}>{children(session)}</div>;
}

export function CreatorDashboard() { return <CreatorGate>{session => <Dashboard session={session} />}</CreatorGate>; }
function Dashboard({ session }: { session: StoredSession }) {
  const [page, setPage] = useState<{ cursor?: string; data: CommunityPage<CommunityProject> } | null>(null);
  const [cursor, setCursor] = useState<string>();
  const [trail, setTrail] = useState<(string | undefined)[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    const controller = new AbortController();
    api.myProjects(session.token, AbortSignal.any([controller.signal, AbortSignal.timeout(15000)]), cursor).then(data => { if (!controller.signal.aborted) { setPage({ cursor, data }); setError(null); } })
      .catch(error => { if (!controller.signal.aborted) setError(message(error)); });
    return () => controller.abort();
  }, [session.token, attempt, cursor]);
  if (error)
    return (
      <Notice
        kind="danger"
        title="Your creations could not be loaded."
        action={<Button lines="none" color="red" border size="sm" icon={refresh} iconPosition="left" onClick={() => setAttempt(attempt + 1)}>Try again</Button>}
      >
        {error}
      </Notice>
    );
  if (!page || page.cursor !== cursor) return <Pending label="Loading your creations" />;
  const projects = page.data.items;
  if (!projects.length && !cursor)
    return (
      <div data-empty="creations">
        <EmptyState
          eyebrow="Creator workspace"
          title="Your first creation starts here."
          action={<Button href="/account/creations/new" icon={add01} lines="none">Create a project</Button>}
        >
          Give your work a home. Start with a showcase or prepare a resource for other server owners.
        </EmptyState>
      </div>
    );
  return (
    <div className={styles.dashboard}>
      <Rows label="Your creations">
        {projects.map(project => (
          <Row
            key={project.projectId}
            marker={project.revisionStatus === "draft" || project.revisionStatus === "rejected"}
            meta={
              <>
                <StateTag state={project.state} />
                {project.revisionStatus !== project.state ? <StateTag state={project.revisionStatus} /> : null}
                <span>Revision {project.revision}</span>
              </>
            }
            title={project.content.title || "Untitled creation"}
            titleAs="h2"
            description={project.content.summary || "Add a short description to introduce your creation."}
            aside={
              <>
                <Button lines="none" color="neutral" border size="sm" icon={edit02} iconPosition="left" href={`/account/creations/${project.projectId}/edit`}>
                  Edit project
                </Button>
                {project.publishedAtUtc && project.state !== "suspended" ? <ArrowLink href={`/workshop/${project.slug}`}>View public page</ArrowLink> : null}
                <DraftDeletion token={session.token} accountId={session.accountId} project={project} deleted={() => { setPage(null); setAttempt(value => value + 1); }} />
              </>
            }
          />
        ))}
      </Rows>
      {!projects.length ? <Notice kind="info">No creations remain on this page. Return to the previous page.</Notice> : null}
      <Pager label="Your creation pages">
        {trail.length > 0 ? (
          <Button lines="none" color="neutral" border size="sm" icon={arrowLeft01} iconPosition="left" onClick={() => { setCursor(trail[trail.length - 1]); setTrail(value => value.slice(0, -1)); }}>
            Previous creations
          </Button>
        ) : null}
        {page.data.nextCursor ? (
          <Button lines="none" color="neutral" border size="sm" icon={arrowRight01} onClick={() => { setTrail(value => [...value, cursor]); setCursor(page.data.nextCursor ?? undefined); }}>
            More creations
          </Button>
        ) : null}
      </Pager>
    </div>
  );
}

export function CreatorEditor({ id }: { id?: string }) {
  const { session, ready } = useSession();
  const [owner, setOwner] = useState<StoredSession | null>(null);
  const [discard, setDiscard] = useState(false);
  const [unsaved, setUnsaved] = useState(false);
  const active = session?.accountId === owner?.accountId && session?.emailVerified;
  useEffect(() => {
    if (active || !unsaved) return;
    const warn = (event: BeforeUnloadEvent) => event.preventDefault();
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [active, unsaved]);
  if (!owner && session?.emailVerified) setOwner(session);
  if (!ready) return <Pending label="Account" />;
  if (!owner) return <CreatorGate>{() => <Pending label="Opening your draft" />}</CreatorGate>;
  return <>
    {!active ? (
      <div className={styles.resume}>
        <Notice kind="warning" title="Your draft remains in this tab.">Sign in to the same account to resume.</Notice>
        <AuthPanel />
        {session && session.accountId !== owner.accountId ? (
          discard ? (
            <div className={styles.switch}>
              <Text>Discard unsaved text and switch to this account?</Text>
              <div className={styles.switchActions}>
                <Button lines="none" color="red" size="sm" onClick={() => { setOwner(session); setDiscard(false); setUnsaved(false); }}>Discard and switch account</Button>
                <Button lines="none" color="neutral" border size="sm" onClick={() => setDiscard(false)}>Keep my draft</Button>
              </div>
            </div>
          ) : (
            <div>
              <Button lines="none" color="neutral" border size="sm" onClick={() => setDiscard(true)}>Switch editor account</Button>
            </div>
          )
        ) : null}
      </div>
    ) : null}
    <Activity mode={active ? "visible" : "hidden"}><Editor key={`${owner.accountId}:${id ?? "new"}`} session={active && session ? session : owner} active={!!active} id={id} onUnsavedChange={setUnsaved} /></Activity>
  </>;
}

const STEPS = ["Basics", "Showcase", "Release", "Validation", "Preview and submit"];

function Editor({ session, active, id, onUnsavedChange }: { session: StoredSession; active: boolean; id?: string; onUnsavedChange: (dirty: boolean) => void }) {
  const router = useRouter();
  const [content, setContent] = useState<CommunityContent>(emptyContent);
  const [slug, setSlug] = useState("");
  const [project, setProject] = useState<CommunityProject | null>(null);
  const [loaded, setLoaded] = useState(!id);
  const [loadAttempt, setLoadAttempt] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState("");
  const [busy, setBusy] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [releaseDirty, setReleaseDirty] = useState(false);
  const [conflict, setConflict] = useState(false);
  const [recovery, setRecovery] = useState<{ remote: CommunityProject; merged: CommunityContent; fields: DraftField[] } | null>(null);
  const [choices, setChoices] = useState<Partial<Record<DraftField, "local" | "remote">>>({});
  const [paused, setPaused] = useState(false);
  const [step, setStep] = useState(0);
  const [rights, setRights] = useState(false);
  const heading = useRef<HTMLHeadingElement>(null);
  const steps = STEPS;
  const locked = project?.state === "archived" || project?.state === "suspended";
  function navigateStep(next: number) { setStep(next); setTimeout(() => heading.current?.focus(), 0); }
  const saving = useRef(false);
  const createAttempt = useRef(new CreateAttempt<{ slug: string; content: CommunityContent }>());
  const [pendingCreate, setPendingCreate] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const initialized = useRef(false);
  const editSequence = useRef(0);
  useEffect(() => {
    const revealRelease = () => {
      if (window.location.hash === "#hub-releases") {
        setStep(2);
        requestAnimationFrame(() => heading.current?.focus());
      }
    };
    const frame = requestAnimationFrame(revealRelease);
    window.addEventListener("hashchange", revealRelease);
    return () => { cancelAnimationFrame(frame); window.removeEventListener("hashchange", revealRelease); };
  }, [id, loaded]);
  useEffect(() => { onUnsavedChange(dirty || releaseDirty); }, [dirty, releaseDirty, onUnsavedChange]);
  useEffect(() => {
    if (!active || !id || initialized.current) return;
    const controller = new AbortController();
    api.myProject(session.token, id, AbortSignal.any([controller.signal, AbortSignal.timeout(15000)])).then(project => {
      if (controller.signal.aborted) return;
      initialized.current = true;
      setProject(project); setContent(project.content); setSlug(project.slug); setLoaded(true);
    }).catch(error => { if (!controller.signal.aborted) setError(message(error)); });
    return () => controller.abort();
  }, [id, session.token, active, loadAttempt]);
  useEffect(() => {
    if (!dirty && !releaseDirty) return;
    const warn = (event: BeforeUnloadEvent) => { event.preventDefault(); };
    const navigation = (event: MouseEvent) => {
      if (event.defaultPrevented || event.button !== 0 || event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return;
      const link = event.target instanceof Element ? event.target.closest("a[href]") : null;
      if (!(link instanceof HTMLAnchorElement) || link.target === "_blank" || link.hasAttribute("download")) return;
      const destination = new URL(link.href);
      if (destination.origin === location.origin && destination.pathname === location.pathname && destination.search === location.search) return;
      if (!window.confirm("Leave this draft and discard changes that have not been saved?")) { event.preventDefault(); event.stopPropagation(); }
    };
    window.addEventListener("beforeunload", warn);
    document.addEventListener("click", navigation, true);
    return () => { window.removeEventListener("beforeunload", warn); document.removeEventListener("click", navigation, true); };
  }, [dirty, releaseDirty]);
  function change<K extends keyof CommunityContent>(key: K, value: CommunityContent[K]) {
    editSequence.current++;
    setRights(false);
    setFieldErrors({});
    setContent(current => ({ ...current, [key]: value })); setDirty(true); setStatus("");
  }
  const save = useCallback(async () => {
    if (!active || saving.current || conflict) return;
    saving.current = true; setBusy(true); setError(null); setFieldErrors({}); setStatus("");
    const savingSequence = editSequence.current;
    try {
      const request = project ? null : createAttempt.current.begin({ slug: normalizeSlug(slug, { final: true }), content });
      setPendingCreate(request !== null);
      const saved = project ? await api.editProject(session.token, project.projectId, project.revision, content) : await api.createProject(session.token, request!.body.slug, request!.body.content, request!.requestId);
      createAttempt.current.resolved(); setPendingCreate(false);
      setProject(saved);
      setSlug(saved.slug);
      setPaused(false);
      const editedDuringSave = editSequence.current !== savingSequence;
      const recovered = request && !editedDuringSave ? mergeDraft(request.body.content, content, saved.content) : null;
      if (recovered) {
        setContent(recovered.merged);
        if (recovered.conflicts.length) {
          setRecovery({ remote: saved, merged: recovered.merged, fields: recovered.conflicts });
          setChoices({}); setConflict(true); setPaused(true);
        }
      }
      const changedDuringSave = editedDuringSave || (request !== null && JSON.stringify(recovered?.merged ?? content) !== JSON.stringify(saved.content));
      setDirty(changedDuringSave);
      setStatus(changedDuringSave ? "Draft saved. Your newer edits still need saving." : "Draft saved. Only you and your project maintainers can see these changes.");
      if (!id && !changedDuringSave && !recovered?.conflicts.length) router.replace(`/account/creations/${saved.projectId}/edit`);
    } catch (error) { setError(message(error)); setPaused(true); if (error instanceof MasterApiError) { createAttempt.current.rejected(error.status); setPendingCreate(createAttempt.current.pending); setFieldErrors(error.fieldErrors); if (error.code === "revision_conflict") setConflict(true); } }
    finally { saving.current = false; setBusy(false); }
  }, [active, conflict, project, session.token, content, slug, id, router, setFieldErrors, setPendingCreate]);
  useEffect(() => {
    // Creating the first draft explicitly reserves its permanent public address.
    // Subsequent edits debounce and serialize, with no blind retry after failure.
    if (!active || locked || !project || !dirty || busy || paused || conflict || !content.title.trim()) return;
    const timer = setTimeout(() => { void save(); }, 1500);
    return () => clearTimeout(timer);
  }, [active, locked, project, dirty, busy, paused, conflict, content, save]);
  async function compare() {
    if (!active || !project || saving.current) return;
    saving.current = true; setBusy(true); setError(null);
    try {
      const remote = await api.myProject(session.token, project.projectId);
      const result = mergeDraft(project.content, content, remote.content);
      setRecovery({ remote, merged: result.merged, fields: result.conflicts }); setChoices({});
    } catch (error) { setError(message(error)); }
    finally { saving.current = false; setBusy(false); }
  }
  function applyRecovery() {
    if (!recovery || recovery.fields.some(field => !choices[field])) return;
    const merged = { ...recovery.merged };
    for (const field of recovery.fields) if (choices[field] === "remote") Object.assign(merged, { [field]: recovery.remote.content[field] });
    editSequence.current++;
    setContent(merged); setProject(recovery.remote); setConflict(false); setRecovery(null); setDirty(true); setPaused(false); setRights(false);
    setStatus("Your selected changes will be saved against the newer revision.");
  }
  async function submit() {
    if (!active || !project || dirty || !rights || saving.current) return;
    saving.current = true;
    setBusy(true); setError(null);
    try {
      await api.submitProject(session.token, project.projectId, project.revision, rights);
      setProject({ ...project, revisionStatus: "submitted" }); setStatus("Submitted for review. Your public page will change only after approval.");
    } catch (error) { setError(message(error)); }
    finally { saving.current = false; setBusy(false); }
  }
  if (!loaded)
    return error ? (
      <Notice
        kind="danger"
        title="Your draft could not be loaded."
        action={<Button lines="none" color="red" border size="sm" icon={refresh} iconPosition="left" onClick={() => { setError(null); setLoadAttempt(value => value + 1); }}>Retry loading draft</Button>}
      >
        {error}
      </Notice>
    ) : (
      <Pending label="Loading your draft" />
    );
  const issue = (name: string) => fieldIssue(fieldErrors, name);
  const saveState = dirty ? busy ? "Saving your changes…" : paused || conflict ? "Unsaved changes, autosave paused" : project ? "Unsaved changes, autosave pending" : "Create your draft to enable autosave" : project ? "All project changes saved" : "";
  const checks = [
    { done: !!content.title.trim(), text: content.title.trim() ? "Title entered." : "Add a title in Basics." },
    { done: !!content.summary.trim(), text: content.summary.trim() ? "Summary entered." : "Add a summary in Basics." },
    { done: !!content.description.trim(), text: content.description.trim() ? "Description entered." : "Describe your creation in Showcase." },
    { done: (content.media ?? []).every(item => item.altText.trim()), text: (content.media ?? []).every(item => item.altText.trim()) ? "Attached images have descriptions." : "Describe each attached image in Showcase." },
    { done: !dirty, text: dirty ? "Save outstanding changes before submitting." : "Project content is saved." },
  ];
  return (
    <div className={styles.editor}>
      <div className={styles.status} aria-label="Draft status">
        <div className={styles.statusFacts}>
          <Eyebrow>{project ? `Revision ${project.revision}` : "New draft"}</Eyebrow>
          {project ? <StateTag state={project.revisionStatus} /> : <StateTag state="draft" label="Not created yet" />}
          {project && project.state !== project.revisionStatus ? <StateTag state={project.state} /> : null}
          <span className={styles.statusNote}>{project ? (project.publishedAtUtc ? "Earlier approved content remains public." : "Not published yet.") : "Private until you submit it for review."}</span>
        </div>
        <span className={cx(styles.saveState, dirty && styles.unsaved)} role="status">{saveState}</span>
      </div>

      {error ? <Notice kind="danger">{error}</Notice> : null}
      <ValidationIssues errors={fieldErrors} />
      {!project && pendingCreate && !busy ? <Notice kind="warning">The previous create request may have completed. Save draft will recover that request first, then save any newer edits. Keep this tab open until it finishes.</Notice> : null}
      {paused && !conflict ? (
        <Notice kind="warning" title="Autosave paused.">
          Your text is still here. Correct the issue, then use Save draft to retry. <a href="/account" target="_blank" rel="noopener noreferrer">Sign in again in another tab</a> if your session expired.
        </Notice>
      ) : null}
      {conflict ? (
        <section className={styles.conflict} aria-label="Recover concurrent edits">
          <Notice kind="warning" title="A newer draft was saved">
            Your text is still here. Compare both versions before continuing.
          </Notice>
          <div>
            <Button lines="none" color="neutral" border size="sm" disabled={busy} onClick={compare}>Compare with current draft</Button>
          </div>
          {recovery ? (
            <>
              <Text>Comparing with revision {recovery.remote.revision}. Independent changes are combined; choose each overlapping field below.</Text>
              {recovery.fields.map(field => (
                <div className={styles.mergeField} key={field}>
                  <Subhead as="h3">{field}</Subhead>
                  <FieldGrid>
                    <MonoBlock label="Your version">{typeof content[field] === "string" ? content[field] : JSON.stringify(content[field], null, 2)}</MonoBlock>
                    <MonoBlock label="Current saved version">{typeof recovery.remote.content[field] === "string" ? recovery.remote.content[field] : JSON.stringify(recovery.remote.content[field], null, 2)}</MonoBlock>
                  </FieldGrid>
                  <Field label="Keep">
                    <Select value={choices[field] ?? ""} onChange={event => setChoices(current => ({ ...current, [field]: event.target.value as "local" | "remote" }))}>
                      <option value="" disabled>Choose a version</option>
                      <option value="local">Your version</option>
                      <option value="remote">Current saved version</option>
                    </Select>
                  </Field>
                </div>
              ))}
              <div>
                <Button lines="none" size="sm" disabled={busy || recovery.fields.some(field => !choices[field])} onClick={applyRecovery}>Apply choices and resume saving</Button>
              </div>
            </>
          ) : null}
        </section>
      ) : null}
      {status ? <Notice kind="success">{status}</Notice> : null}

      <nav aria-label="Publishing steps" className={styles.stepsNav}>
        <ol className={styles.steps}>
          {steps.map((label, index) => (
            <li key={label}>
              <button type="button" className={styles.step} aria-current={step === index ? "step" : undefined} onClick={() => navigateStep(index)}>
                <span className={styles.stepIndex}>{String(index + 1).padStart(2, "0")}</span>
                <span className={styles.stepLabel}>
                  <span className="sr-only">{index + 1}. </span>
                  {label}
                  {index === 2 && content.kind === "showcase" ? <span className={styles.stepNote}> (no package)</span> : null}
                </span>
              </button>
            </li>
          ))}
        </ol>
      </nav>

      <div className={styles.layout}>
        <div className={styles.main}>
          <Panel brackets padding="lg" className={styles.stage}>
            <header className={styles.stageHead}>
              <Eyebrow index={step + 1}>{`Step ${step + 1} of ${steps.length}`}</Eyebrow>
              <h2 ref={heading} tabIndex={-1} className={styles.stageTitle}>
                Step {step + 1}: {steps[step]}
              </h2>
            </header>
            <form id="creator-draft-form" className={styles.form} noValidate onSubmit={event => { event.preventDefault(); void save(); }}>
              <fieldset className={styles.fieldset} disabled={conflict || locked || (pendingCreate && busy)}>
                <div className={styles.fields} hidden={step !== 0}>
                  <Field label="Project title" error={issue("title")}>
                    <Input required maxLength={80} value={content.title} onChange={event => change("title", event.target.value)} />
                  </Field>
                  <Field label="Resource address" error={issue("slug")} hint={<>{SITE_URL.replace(/^https?:\/\//, "")}/resources/<strong className={styles.slug}>{slug || "your-project"}</strong></>}>
                    <Input required maxLength={80} pattern="[a-z0-9]+(-[a-z0-9]+)*" minLength={3} readOnly={!!project || busy || pendingCreate} value={slug} onChange={event => { editSequence.current++; setFieldErrors({}); setSlug(normalizeSlug(event.target.value)); setDirty(true); }} placeholder="auto-taxi" />
                  </Field>
                  <Field label="Short description" error={issue("summary")}>
                    <Input required maxLength={200} value={content.summary} onChange={event => change("summary", event.target.value)} />
                  </Field>
                  <FieldGrid>
                    <Field label="Category" error={issue("category")}>
                      <Select value={content.category} onChange={event => change("category", event.target.value)}>{categories.map(item => <option key={item.id} value={item.id}>{item.label}</option>)}</Select>
                    </Field>
                    <Field label="Project type" error={issue("kind")}>
                      <Select value={content.kind} onChange={event => change("kind", event.target.value as CommunityContent["kind"])}>
                        <option value="showcase">Showcase: share your work</option>
                        <option value="resource">Resource: downloadable package</option>
                      </Select>
                    </Field>
                  </FieldGrid>
                  <Field label="Tags, separated by commas" error={issue("tags")} hint="Up to five lowercase tags, using letters, digits and hyphens. Remove empty tags before saving.">
                    <Input maxLength={164} value={content.tags.join(",")} onChange={event => change("tags", event.target.value ? event.target.value.split(",") : [])} />
                  </Field>
                  <Field label="Development status" error={issue("maturity")}>
                    <Select value={content.maturity} onChange={event => change("maturity", event.target.value as CommunityContent["maturity"])}>
                      <option value="experimental">Experimental</option>
                      <option value="stable">Stable</option>
                    </Select>
                  </Field>
                  <p className={styles.creator}>
                    <span>Creator account: <strong>{session.displayName}</strong>.</span>{" "}
                    <ArrowLink href="/account/profile" external>Edit your public profile</ArrowLink>
                  </p>
                </div>
                <div className={styles.fields} hidden={step !== 1}>
                  <Field label="About your creation (Markdown)" error={issue("description")}>
                    <Textarea maxLength={50000} rows={10} value={content.description} onChange={event => change("description", event.target.value)} />
                  </Field>
                  <FieldGrid>
                    <Field label="Source repository" optional error={issue("sourceUrl")}>
                      <Input type="url" value={content.sourceUrl ?? ""} onChange={event => change("sourceUrl", event.target.value || null)} placeholder="https://github.com/…" />
                    </Field>
                    <Field label="Issue tracker" optional error={issue("issueUrl")}>
                      <Input type="url" value={content.issueUrl ?? ""} onChange={event => change("issueUrl", event.target.value || null)} placeholder="https://…" />
                    </Field>
                  </FieldGrid>
                  <Field label="Video links, one per line" optional error={issue("videoUrls")} hint="Up to two YouTube or Vimeo HTTPS links.">
                    <Textarea maxLength={4097} rows={3} value={(content.videoUrls ?? []).join("\n")} onChange={event => change("videoUrls", event.target.value ? event.target.value.split("\n") : [])} />
                  </Field>
                </div>
                <div className={styles.fields} hidden={step !== 2}>
                  {content.kind === "showcase" ? <Notice kind="info">Showcases do not need a downloadable release. State the rights for the work you are showing below.</Notice> : null}
                  <Field label="Installation and configuration" error={issue("installation")}>
                    <Textarea maxLength={50000} value={content.installation} onChange={event => change("installation", event.target.value)} />
                  </Field>
                  <Field label="License" error={issue("license")}>
                    <Textarea maxLength={10000} value={content.license ?? ""} onChange={event => change("license", event.target.value || null)} placeholder="Name your license and any third-party notices." />
                  </Field>
                </div>
              </fieldset>
              <div className={styles.saveBar}>
                <Button key={busy ? "saving" : project ? "save" : "create"} type="submit" lines="none" icon={tick02} iconPosition="left" busy={busy} disabled={conflict || locked}>
                  {busy ? "Saving…" : project ? "Save draft" : "Create draft"}
                </Button>
                <span className={styles.saveHint}>{project ? "Edits autosave a moment after you stop typing." : "Creating the draft reserves its permanent address."}</span>
              </div>
            </form>

            {project ? (
              <fieldset className={styles.fieldset} hidden={step !== 1} disabled={conflict || locked}>
                <div className={styles.media}>
                  <CreatorMedia token={session.token} projectId={project.projectId} media={content.media ?? []} onChange={value => change("media", value)} />
                  <CreatorClip token={session.token} projectId={project.projectId} clipMediaId={content.clipMediaId} onChange={value => change("clipMediaId", value)} />
                </div>
              </fieldset>
            ) : null}
            {step === 1 ? <DraftPreview content={content} token={session.token} /> : null}
            {!project && step > 0 ? <Notice kind="info">Create your draft from Basics to upload media and releases. Your text stays in this tab until saved.</Notice> : null}
            {project ? (
              <div hidden={content.kind !== "resource" || (step !== 2 && step !== 3 && step !== 4)}>
                <CreatorReleases session={session} project={project} readOnly={step === 4 || locked} onUnsavedChange={setReleaseDirty} />
              </div>
            ) : null}
            {step === 3 ? (
              <section className={styles.checks} aria-labelledby="creator-checks-title">
                <Subhead as="h3" id="creator-checks-title">Project checks</Subhead>
                <ul className={styles.checkList}>
                  {checks.map(check => (
                    <li key={check.text} className={check.done ? styles.done : styles.todo}>{check.text}</li>
                  ))}
                </ul>
                <Text>The server rechecks your content and processed files when you submit. Technical validation does not replace moderation review.</Text>
              </section>
            ) : null}
            {step === 4 ? (
              <Stack>
                <DraftPreview content={content} token={session.token} />
                <div className={styles.submit}>
                  <Checkbox checked={rights} onChange={event => setRights(event.target.checked)}>
                    I have permission to share this creation, its images and all included files under the stated license.
                  </Checkbox>
                  <div>
                    <Button icon={sent} disabled={!project || locked || busy || dirty || conflict || !rights || project.revisionStatus !== "draft"} onClick={submit}>
                      Submit for review
                    </Button>
                  </div>
                </div>
              </Stack>
            ) : null}
          </Panel>

          <nav className={styles.continue} aria-label="Continue publishing">
            {step > 0 ? (
              <Button lines="none" color="neutral" border icon={arrowLeft01} iconPosition="left" onClick={() => navigateStep(step - 1)}>Previous</Button>
            ) : <span />}
            {step < 4 ? (
              <Button key={step} lines="none" icon={arrowRight01} onClick={() => navigateStep(step + 1)}>{`Continue to ${steps[step + 1]}`}</Button>
            ) : null}
          </nav>
        </div>

        <aside className={styles.side} aria-label="Project details">
          {project ? (
            <>
              <section className={styles.sideBlock} aria-labelledby="creator-project-facts">
                <Subhead as="h2" id="creator-project-facts">This project</Subhead>
                <DefinitionList
                  items={[
                    { label: "Revision", value: project.revision },
                    { label: "Review", value: <StateTag state={project.revisionStatus} /> },
                    { label: "State", value: <StateTag state={project.state} /> },
                    { label: "Address", value: <span className={styles.address}>/resources/{project.slug}</span> },
                  ]}
                />
                <ArrowLink href={`/account/creations/${project.projectId}/members`}>Manage project members</ArrowLink>
                {project.publishedAtUtc && project.state !== "suspended" ? <ArrowLink href={`/workshop/${project.slug}`}>View public page</ArrowLink> : null}
              </section>
              <ActivityHistory key={`${project.projectId}-${project.revisionStatus}`} token={session.token} kind="project" id={project.projectId} allowAppeals initiallyOpen={project.revisionStatus === "rejected" || project.state === "suspended"} />
              <ProjectLifecycle session={session} project={project} disabled={busy} unsaved={dirty || releaseDirty || conflict} changed={state => { setProject(current => current ? { ...current, state } : current); setStatus(state === "archived" ? "Project archived. Its approved page and downloads remain available." : "Project reopened."); }} />
            </>
          ) : (
            <section className={styles.sideBlock} aria-labelledby="creator-new-facts">
              <Subhead as="h2" id="creator-new-facts">New draft</Subhead>
              <Text>Fill in the basics and create the draft. Media, releases, members and the review history appear here once it exists.</Text>
            </section>
          )}
          <CreatorLimits token={session.token} />
        </aside>
      </div>
    </div>
  );
}
