"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, type FormEvent, type ReactNode } from "react";
import { AuthPanel } from "@/components/account/auth-panel";
import { useSession, type StoredSession } from "@/lib/account/session";
import { MasterApiError } from "@/lib/account/api";
import * as api from "@/lib/community/client-api";
import { categories, type CommunityContent, type CommunityProject } from "@/lib/community/types";
import { CreatorReleases } from "./creator-releases";
import { CreatorMedia } from "./creator-media";
import { ActivityHistory } from "./activity-history";

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

export function CreatorEditor({ id }: { id?: string }) { return <CreatorGate>{session => <Editor key={id ?? "new"} session={session} id={id} />}</CreatorGate>; }
function Editor({ session, id }: { session: StoredSession; id?: string }) {
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
  const editSequence = useRef(0);
  useEffect(() => {
    if (!id) return;
    const controller = new AbortController();
    api.myProject(session.token, id, controller.signal).then(project => {
      if (controller.signal.aborted) return;
      setProject(project); setContent(project.content); setSlug(project.slug); setLoaded(true);
    }).catch(error => { if (!controller.signal.aborted) setError(message(error)); });
    return () => controller.abort();
  }, [id, session.token]);
  useEffect(() => {
    if (!dirty) return;
    const warn = (event: BeforeUnloadEvent) => { event.preventDefault(); };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);
  function change<K extends keyof CommunityContent>(key: K, value: CommunityContent[K]) {
    editSequence.current++;
    setContent(current => ({ ...current, [key]: value })); setDirty(true); setStatus("");
  }
  async function save(event: FormEvent) {
    event.preventDefault(); setBusy(true); setError(null); setStatus("");
    const savingSequence = editSequence.current;
    try {
      const saved = project ? await api.editProject(session.token, project.projectId, project.revision, content) : await api.createProject(session.token, slug, content);
      setProject(saved);
      const changedDuringSave = editSequence.current !== savingSequence;
      setDirty(changedDuringSave);
      setStatus(changedDuringSave ? "Draft saved. Your newer edits still need saving." : "Draft saved. Only you and your project maintainers can see these changes.");
      if (!id && !changedDuringSave) router.replace(`/account/creations/${saved.projectId}/edit`);
    } catch (error) { setError(message(error)); if (error instanceof MasterApiError && error.code === "revision_conflict") setConflict(true); }
    finally { setBusy(false); }
  }
  async function submit() {
    if (!project || dirty) return;
    setBusy(true); setError(null);
    try {
      await api.submitProject(session.token, project.projectId, project.revision);
      setProject({ ...project, revisionStatus: "submitted" }); setStatus("Submitted for review. Your public page will change only after approval.");
    } catch (error) { setError(message(error)); }
    finally { setBusy(false); }
  }
  if (!loaded) return <div className="hub-notice" role={error ? "alert" : "status"}>{error ?? "Loading your draft…"}</div>;
  return <>
    {error && <div className="hub-notice" role="alert">{error}{conflict && <p>Your text is still here. Copy any unsaved changes before reloading the newer draft.</p>}</div>}
    {status && <div className="hub-notice" role="status">{status}</div>}
    {project && <p className="hub-notice">Revision {project.revision} · {project.revisionStatus.replaceAll("_", " ")}{project.publishedAtUtc ? " · Earlier approved content remains public." : " · Not published yet."}</p>}
    {project && <ActivityHistory key={`${project.projectId}-${project.revisionStatus}`} token={session.token} kind="project" id={project.projectId} initiallyOpen={project.revisionStatus === "rejected" || project.state === "suspended"} />}
    <form className="hub-form" onSubmit={save}>
      <label>Project title<input required maxLength={80} value={content.title} onChange={event => change("title", event.target.value)} /></label>
      <label>Resource address<input required maxLength={80} pattern="[a-z0-9]+(-[a-z0-9]+)*" minLength={3} readOnly={!!project || busy} value={slug} onChange={event => { editSequence.current++; setSlug(event.target.value); setDirty(true); }} placeholder="auto-taxi" /><small>open2077.net/resources/{slug || "your-project"}</small></label>
      <label>Short description<input required maxLength={200} value={content.summary} onChange={event => change("summary", event.target.value)} /></label>
      <div className="hub-form-row"><label>Category<select value={content.category} onChange={event => change("category", event.target.value)}>{categories.map(item => <option key={item.id} value={item.id}>{item.label}</option>)}</select></label>
        <label>Project type<select value={content.kind} onChange={event => change("kind", event.target.value as CommunityContent["kind"])}><option value="showcase">Showcase — share your work</option><option value="resource">Resource — downloadable package</option></select></label></div>
      <label>About your creation<textarea required maxLength={50000} rows={10} value={content.description} onChange={event => change("description", event.target.value)} /></label>
      <label>Installation and configuration<textarea maxLength={50000} value={content.installation} onChange={event => change("installation", event.target.value)} /></label>
      <div className="hub-form-row"><label>Source repository<input type="url" value={content.sourceUrl ?? ""} onChange={event => change("sourceUrl", event.target.value || null)} placeholder="https://github.com/…" /></label>
        <label>Issue tracker<input type="url" value={content.issueUrl ?? ""} onChange={event => change("issueUrl", event.target.value || null)} placeholder="https://…" /></label></div>
      <label>License<textarea maxLength={10000} value={content.license ?? ""} onChange={event => change("license", event.target.value || null)} placeholder="Name your license and any third-party notices." /></label>
      <label>Development status<select value={content.maturity} onChange={event => change("maturity", event.target.value as CommunityContent["maturity"])}><option value="experimental">Experimental</option><option value="stable">Stable</option></select></label>
      <div className="hub-actions"><button type="submit" className="btn btn-primary" disabled={busy || conflict}>{busy ? "Saving…" : "Save draft"}</button>
        {project && <button type="button" className="btn btn-ghost" disabled={busy || dirty || conflict || project.revisionStatus !== "draft"} onClick={submit}>Submit for review</button>}
        <span role="status">{dirty ? "Unsaved changes" : ""}</span></div>
    </form>
    {project && <CreatorMedia token={session.token} projectId={project.projectId} media={content.media ?? []} onChange={value => change("media", value)} />}
    {project && content.kind === "resource" && <CreatorReleases session={session} project={project} />}
  </>;
}
