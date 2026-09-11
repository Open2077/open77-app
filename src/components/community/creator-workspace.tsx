"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { AuthPanel } from "@/components/account/auth-panel";
import { useSession, type StoredSession } from "@/lib/account/session";
import { MasterApiError } from "@/lib/account/api";
import * as api from "@/lib/community/client-api";
import { categories, type CommunityContent, type CommunityProject } from "@/lib/community/types";
import { CreatorReleases } from "./creator-releases";
import { CreatorMedia } from "./creator-media";
import { ActivityHistory } from "./activity-history";
import { mergeDraft, type DraftField } from "@/lib/community/draft-merge";
import { DraftPreview } from "./draft-preview";

function message(error: unknown) { return error instanceof Error ? error.message : "Something went wrong. Please try again."; }
const emptyContent: CommunityContent = { title: "", summary: "", category: "scripts", description: "", installation: "", kind: "showcase", maturity: "experimental", tags: [] };

function CreatorGate({ children }: { children: (session: StoredSession) => ReactNode }) {
  const { session, ready } = useSession();
  if (!ready) return <p className="hub-notice" role="status">Loading your account…</p>;
  if (!session) return <AuthPanel />;
  if (!session.emailVerified) return <div className="hub-notice"><p>Verify your email before sharing a creation.</p><Link href="/account">Open your account →</Link></div>;
  return <div key={session.accountId}>{children(session)}</div>;
}

export function CreatorDashboard() { return <CreatorGate>{session => <Dashboard session={session} />}</CreatorGate>; }
function Dashboard({ session }: { session: StoredSession }) {
  const [projects, setProjects] = useState<CommunityProject[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    const controller = new AbortController();
    api.myProjects(session.token, controller.signal).then(page => { if (!controller.signal.aborted) { setProjects(page.items); setError(null); } })
      .catch(error => { if (!controller.signal.aborted) setError(message(error)); });
    return () => controller.abort();
  }, [session.token, attempt]);
  if (error) return <div className="hub-notice" role="alert"><p>{error}</p><button className="btn btn-ghost" onClick={() => setAttempt(attempt + 1)}>Try again</button></div>;
  if (!projects) return <p className="hub-notice" role="status">Loading your creations…</p>;
  if (!projects.length) return <div className="hub-empty"><h2>Your first creation starts here.</h2><p>Give your work a home. Start with a showcase or prepare a resource for other server owners.</p><Link className="btn btn-primary" href="/account/creations/new">Create a project</Link></div>;
  return <div>{projects.map(project => <article className="hub-draft-row" key={project.projectId}><div>
    <p className="hub-kicker">{project.revisionStatus.replaceAll("_", " ")}</p><h2>{project.content.title}</h2><p>{project.content.summary || "Add a short description to introduce your creation."}</p>
  </div><div className="hub-actions"><Link className="btn btn-ghost" href={`/account/creations/${project.projectId}/edit`}>Edit project</Link>
    {project.publishedAtUtc && <Link href={`/resources/${project.slug}`}>View public page ↗</Link>}</div></article>)}</div>;
}

export function CreatorEditor({ id }: { id?: string }) {
  const { session, ready } = useSession();
  const [owner, setOwner] = useState<StoredSession | null>(null);
  const [discard, setDiscard] = useState(false);
  if (!owner && session?.emailVerified) setOwner(session);
  if (!ready) return <p role="status">Loading your account…</p>;
  if (!owner) return <CreatorGate>{() => <p role="status">Opening your draft…</p>}</CreatorGate>;
  const active = session?.accountId === owner.accountId && session.emailVerified;
  return <>
    {!active && <div className="hub-notice"><p>Your draft remains in this tab. Sign in to the same account to resume.</p><AuthPanel />
      {session && session.accountId !== owner.accountId && <>{discard ? <><p>Discard unsaved text and switch to this account?</p><button className="btn btn-primary" onClick={() => { setOwner(session); setDiscard(false); }}>Discard and switch account</button><button className="btn btn-ghost" onClick={() => setDiscard(false)}>Keep my draft</button></> : <button className="btn btn-ghost" onClick={() => setDiscard(true)}>Switch editor account</button>}</>}
    </div>}
    <Editor key={`${owner.accountId}:${id ?? "new"}`} session={active ? session : owner} active={!!active} id={id} />
  </>;
}
function Editor({ session, active, id }: { session: StoredSession; active: boolean; id?: string }) {
  const router = useRouter();
  const [content, setContent] = useState<CommunityContent>(emptyContent);
  const [slug, setSlug] = useState("");
  const [project, setProject] = useState<CommunityProject | null>(null);
  const [loaded, setLoaded] = useState(!id);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState("");
  const [busy, setBusy] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [conflict, setConflict] = useState(false);
  const [recovery, setRecovery] = useState<{ remote: CommunityProject; merged: CommunityContent; fields: DraftField[] } | null>(null);
  const [choices, setChoices] = useState<Partial<Record<DraftField, "local" | "remote">>>({});
  const [paused, setPaused] = useState(false);
  const [step, setStep] = useState(0);
  const [rights, setRights] = useState(false);
  const heading = useRef<HTMLHeadingElement>(null);
  const steps = ["Basics", "Showcase", "Release", "Validation", "Preview and submit"];
  function navigateStep(next: number) { setStep(next); setTimeout(() => heading.current?.focus(), 0); }
  const saving = useRef(false);
  const initialized = useRef(false);
  const editSequence = useRef(0);
  useEffect(() => {
    if (!active || !id || initialized.current) return;
    const controller = new AbortController();
    api.myProject(session.token, id, controller.signal).then(project => {
      if (controller.signal.aborted) return;
      initialized.current = true;
      setProject(project); setContent(project.content); setSlug(project.slug); setLoaded(true);
    }).catch(error => { if (!controller.signal.aborted) setError(message(error)); });
    return () => controller.abort();
  }, [id, session.token, active]);
  useEffect(() => {
    if (!dirty) return;
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
  }, [dirty]);
  function change<K extends keyof CommunityContent>(key: K, value: CommunityContent[K]) {
    editSequence.current++;
    setRights(false);
    setContent(current => ({ ...current, [key]: value })); setDirty(true); setStatus("");
  }
  const save = useCallback(async () => {
    if (!active || saving.current || conflict) return;
    saving.current = true; setBusy(true); setError(null); setStatus("");
    const savingSequence = editSequence.current;
    try {
      const saved = project ? await api.editProject(session.token, project.projectId, project.revision, content) : await api.createProject(session.token, slug, content);
      setProject(saved);
      setPaused(false);
      const changedDuringSave = editSequence.current !== savingSequence;
      setDirty(changedDuringSave);
      setStatus(changedDuringSave ? "Draft saved. Your newer edits still need saving." : "Draft saved. Only you and your project maintainers can see these changes.");
      if (!id && !changedDuringSave) router.replace(`/account/creations/${saved.projectId}/edit`);
    } catch (error) { setError(message(error)); setPaused(true); if (error instanceof MasterApiError && error.code === "revision_conflict") setConflict(true); }
    finally { saving.current = false; setBusy(false); }
  }, [active, conflict, project, session.token, content, slug, id, router]);
  useEffect(() => {
    // Creating the first draft explicitly reserves its permanent public address.
    // Subsequent edits debounce and serialize, with no blind retry after failure.
    if (!active || !project || !dirty || busy || paused || conflict || !content.title.trim()) return;
    const timer = setTimeout(() => { void save(); }, 1500);
    return () => clearTimeout(timer);
  }, [active, project, dirty, busy, paused, conflict, content, save]);
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
      await api.submitProject(session.token, project.projectId, project.revision);
      setProject({ ...project, revisionStatus: "submitted" }); setStatus("Submitted for review. Your public page will change only after approval.");
    } catch (error) { setError(message(error)); }
    finally { saving.current = false; setBusy(false); }
  }
  if (!active) return null;
  if (!loaded) return <div className="hub-notice" role={error ? "alert" : "status"}>{error ?? "Loading your draft…"}</div>;
  return <>
    {error && <div className="hub-notice" role="alert">{error}</div>}
    {paused && !conflict && <p className="hub-notice">Autosave paused. Your text is still here. Correct the issue, then use Save draft to retry. <a href="/account" target="_blank" rel="noopener noreferrer">Sign in again in another tab</a> if your session expired.</p>}
    {conflict && <section className="hub-notice" aria-label="Recover concurrent edits"><h2>A newer draft was saved</h2><p>Your text is still here. Compare both versions before continuing.</p>
      <button type="button" className="btn btn-ghost" disabled={busy} onClick={compare}>Compare with current draft</button>
      {recovery && <><p>Comparing with revision {recovery.remote.revision}. Independent changes are combined; choose each overlapping field below.</p>
        {recovery.fields.map(field => <div className="hub-release" key={field}><h3>{field}</h3><div className="hub-form-row"><div><h4>Your version</h4><pre className="hub-merge-text">{typeof content[field] === "string" ? content[field] : JSON.stringify(content[field], null, 2)}</pre></div><div><h4>Current saved version</h4><pre className="hub-merge-text">{typeof recovery.remote.content[field] === "string" ? recovery.remote.content[field] : JSON.stringify(recovery.remote.content[field], null, 2)}</pre></div></div>
          <label>Keep<select value={choices[field] ?? ""} onChange={event => setChoices(current => ({ ...current, [field]: event.target.value as "local" | "remote" }))}><option value="" disabled>Choose a version</option><option value="local">Your version</option><option value="remote">Current saved version</option></select></label></div>)}
        <button type="button" className="btn btn-primary" disabled={busy || recovery.fields.some(field => !choices[field])} onClick={applyRecovery}>Apply choices and resume saving</button></>}
    </section>}
    {status && <div className="hub-notice" role="status">{status}</div>}
    {project && <p className="hub-notice">Revision {project.revision} · {project.revisionStatus.replaceAll("_", " ")}{project.publishedAtUtc ? " · Earlier approved content remains public." : " · Not published yet."}</p>}
    {project && <ActivityHistory key={`${project.projectId}-${project.revisionStatus}`} token={session.token} kind="project" id={project.projectId} allowAppeals initiallyOpen={project.revisionStatus === "rejected" || project.state === "suspended"} />}
    <nav aria-label="Publishing steps"><ol className="hub-wizard-steps">{steps.map((label, index) => <li key={label}><button type="button" className="btn btn-ghost" aria-current={step === index ? "step" : undefined} onClick={() => navigateStep(index)}>{index + 1}. {label}{index === 2 && content.kind === "showcase" ? " (no package)" : ""}</button></li>)}</ol></nav>
    <h2 ref={heading} tabIndex={-1}>Step {step + 1}: {steps[step]}</h2>
    <form className="hub-form" noValidate onSubmit={event => { event.preventDefault(); void save(); }}>
      <fieldset className="hub-editor-fields" disabled={conflict}>
      <div className="hub-editor-fields" hidden={step !== 0}>
      <label>Project title<input required maxLength={80} value={content.title} onChange={event => change("title", event.target.value)} /></label>
      <label>Resource address<input required maxLength={80} pattern="[a-z0-9]+(-[a-z0-9]+)*" minLength={3} readOnly={!!project || busy} value={slug} onChange={event => { editSequence.current++; setSlug(event.target.value); setDirty(true); }} placeholder="auto-taxi" /><small>open2077.net/resources/{slug || "your-project"}</small></label>
      <label>Short description<input required maxLength={200} value={content.summary} onChange={event => change("summary", event.target.value)} /></label>
      <div className="hub-form-row"><label>Category<select value={content.category} onChange={event => change("category", event.target.value)}>{categories.map(item => <option key={item.id} value={item.id}>{item.label}</option>)}</select></label>
        <label>Project type<select value={content.kind} onChange={event => change("kind", event.target.value as CommunityContent["kind"])}><option value="showcase">Showcase — share your work</option><option value="resource">Resource — downloadable package</option></select></label></div>
      <label>Tags, separated by commas<input maxLength={164} value={content.tags.join(",")} onChange={event => change("tags", event.target.value ? event.target.value.split(",") : [])} /><small>Up to five lowercase tags, using letters, digits and hyphens. Remove empty tags before saving.</small></label>
      <label>Development status<select value={content.maturity} onChange={event => change("maturity", event.target.value as CommunityContent["maturity"])}><option value="experimental">Experimental</option><option value="stable">Stable</option></select></label>
      <p>Creator account: {session.displayName}. <a href="/account/profile" target="_blank" rel="noopener noreferrer">Edit your public profile ↗</a></p>
      </div>
      <div className="hub-editor-fields" hidden={step !== 1}>
      <label>About your creation (Markdown)<textarea maxLength={50000} rows={10} value={content.description} onChange={event => change("description", event.target.value)} /></label>
      <div className="hub-form-row"><label>Source repository<input type="url" value={content.sourceUrl ?? ""} onChange={event => change("sourceUrl", event.target.value || null)} placeholder="https://github.com/…" /></label>
        <label>Issue tracker<input type="url" value={content.issueUrl ?? ""} onChange={event => change("issueUrl", event.target.value || null)} placeholder="https://…" /></label></div>
      <label>Video links, one per line<textarea maxLength={4097} value={(content.videoUrls ?? []).join("\n")} onChange={event => change("videoUrls", event.target.value ? event.target.value.split("\n") : [])} /><small>Up to two YouTube or Vimeo HTTPS links.</small></label>
      </div>
      <div className="hub-editor-fields" hidden={step !== 2}>
      {content.kind === "showcase" && <p className="hub-notice">Showcases do not need a downloadable release. State the rights for the work you are showing below.</p>}
      <label>Installation and configuration<textarea maxLength={50000} value={content.installation} onChange={event => change("installation", event.target.value)} /></label>
      <label>License<textarea maxLength={10000} value={content.license ?? ""} onChange={event => change("license", event.target.value || null)} placeholder="Name your license and any third-party notices." /></label>
      </div>
      </fieldset>
      <div className="hub-actions"><button type="submit" className="btn btn-primary" disabled={busy || conflict}>{busy ? "Saving…" : project ? "Save draft" : "Create draft"}</button>
        <span role="status">{dirty ? busy ? "Saving your changes…" : paused || conflict ? "Unsaved changes — autosave paused" : project ? "Unsaved changes — autosave pending" : "Create your draft to enable autosave" : project ? "All project changes saved" : ""}</span></div>
    </form>
    {project && <fieldset className="hub-editor-fields" hidden={step !== 1} disabled={conflict}><CreatorMedia token={session.token} projectId={project.projectId} media={content.media ?? []} onChange={value => change("media", value)} /></fieldset>}
    {step === 1 && <DraftPreview content={content} token={session.token} />}
    {!project && step > 0 && <p className="hub-notice">Create your draft from Basics to upload media and releases. Your text stays in this tab until saved.</p>}
    {project && content.kind === "resource" && <div hidden={step !== 2 && step !== 3}><CreatorReleases session={session} project={project} /></div>}
    {step === 3 && <section className="hub-notice"><h3>Project checks</h3><ul>
      <li>{content.title.trim() ? "Title entered." : "Add a title in Basics."}</li>
      <li>{content.summary.trim() ? "Summary entered." : "Add a summary in Basics."}</li>
      <li>{content.description.trim() ? "Description entered." : "Describe your creation in Showcase."}</li>
      <li>{(content.media ?? []).every(item => item.altText.trim()) ? "Attached images have descriptions." : "Describe each attached image in Showcase."}</li>
      <li>{dirty ? "Save outstanding changes before submitting." : "Project content is saved."}</li>
    </ul><p>The server rechecks your content and processed files when you submit. Technical validation does not replace moderation review.</p></section>}
    {step === 4 && <><DraftPreview content={content} token={session.token} /><label className="hub-rights"><input type="checkbox" checked={rights} onChange={event => setRights(event.target.checked)} />I have permission to share this creation, its images and all included files under the stated license.</label>
      <button type="button" className="btn btn-primary" disabled={!project || busy || dirty || conflict || !rights || project.revisionStatus !== "draft"} onClick={submit}>Submit for review</button></>}
    <nav className="hub-actions" aria-label="Continue publishing">{step > 0 && <button type="button" className="btn btn-ghost" onClick={() => navigateStep(step - 1)}>Previous</button>}{step < 4 && <button type="button" className="btn btn-primary" onClick={() => navigateStep(step + 1)}>Continue to {steps[step + 1]}</button>}</nav>
  </>;
}
