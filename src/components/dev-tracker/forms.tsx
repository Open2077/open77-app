"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useRef, useState, type FormEvent } from "react";
import { useSession } from "@/lib/account/session";
import * as api from "@/lib/dev-tracker/api";
import { categories, dateTime, message, reviewStates, type Idea } from "@/lib/dev-tracker/types";
import { Busy, ErrorNotice, SignInNote, useTrackerRead } from "./shared";
import styles from "./tracker.module.css";

export function useRequestId() {
  const current = useRef<{ payload: string; id: string } | null>(null);
  const requestId = (body: unknown) => {
    const payload = JSON.stringify(body);
    if (current.current?.payload !== payload) current.current = { payload, id: crypto.randomUUID() };
    return current.current.id;
  };
  return { requestId, reset: () => { current.current = null; } };
}

export function NewIdea() {
  const { session, ready } = useSession();
  return <section className={styles.composeLayout}><div className={styles.panel}><p className={styles.eyebrow}>START A CONVERSATION</p><h2>What would make OPEN//77 better?</h2>
    {!ready ? <Busy /> : !session?.emailVerified ? <SignInNote /> : <CreateForm key={session.accountId} token={session.token} />}</div>
    <aside className={styles.guide}><h3>A great idea starts with a real need.</h3><ol><li><strong>Check for an existing idea.</strong><p>Join its discussion and vote instead of splitting the conversation.</p><Link href="/dev-tracker">Browse community ideas ↗</Link></li><li><strong>Explain the problem.</strong><p>Who does it affect? What happens today, and what should happen instead?</p></li><li><strong>Keep it focused.</strong><p>One idea per proposal. No secrets, account information, harassment or spam.</p></li></ol><p>Ideas are public immediately, labelled “Community review”. Staff validation moves an idea onto the development board.</p></aside></section>;
}

function CreateForm({ token }: { token: string }) {
  const router = useRouter();
  const [title, setTitle] = useState(""); const [body, setBody] = useState(""); const [category, setCategory] = useState("quality_of_life");
  const [busy, setBusy] = useState(false); const [error, setError] = useState("");
  const { requestId } = useRequestId();
  const loadQuota = useCallback((signal: AbortSignal) => api.quota(token, signal), [token]);
  const quota = useTrackerRead(token, loadQuota);
  async function submit(event: FormEvent) {
    event.preventDefault(); if (busy) return;
    setBusy(true); setError("");
    const payload = { title: title.trim(), body: body.trim(), category };
    try { const idea = await api.create(token, { ...payload, requestId: requestId(payload) }); router.push(`/dev-tracker/${idea.id}`); }
    catch (error) { setError(message(error)); quota.reload(); setBusy(false); }
  }
  return <form className={styles.form} onSubmit={submit}>
    {quota.loading && <Busy label="Checking your submission allowance…" />}<ErrorNotice error={quota.error} retry={quota.reload} />
    {quota.data && <div className={styles.allowance}><strong>{quota.data.remaining} / {quota.data.ideasPerWeek} ideas available</strong><p>Rolling 7-day allowance · {quota.data.ideaCooldownMinutes} minutes between ideas.</p>{quota.data.nextSubmissionAtUtc && <p>Next submission: <b>{dateTime(quota.data.nextSubmissionAtUtc)}</b>. The server will check eligibility again when you submit.</p>}</div>}
    <label>Title<input required minLength={8} maxLength={120} value={title} onChange={event => setTitle(event.target.value)} placeholder="A short, specific summary of your idea" /></label>
    <label>Category<select value={category} onChange={event => setCategory(event.target.value)}>{categories.map(([id, label]) => <option value={id} key={id}>{label}</option>)}</select></label>
    <label>Your proposal<textarea required minLength={30} maxLength={8000} rows={10} value={body} onChange={event => setBody(event.target.value)} placeholder={"The problem\n\nYour suggested improvement\n\nAn example of how it would help players or developers"} /></label><span className={styles.counter}>{body.length} / 8,000</span>
    <ErrorNotice error={error} /><div className={styles.actions}><button className={styles.primary} disabled={busy || !quota.data} type="submit">{busy ? "Publishing…" : "Publish idea"}</button><Link href="/dev-tracker">Cancel</Link></div>
    <p className={styles.muted}>Your account name and proposal will be public. Retrying the same submission will not create a duplicate.</p>
  </form>;
}

export function StaffReview({ idea, token, updated }: { idea: Idea; token: string; updated: () => Promise<void> }) {
  const [state, setState] = useState(idea.state); const [hidden, setHidden] = useState(idea.hidden); const [locked, setLocked] = useState(idea.locked);
  const [note, setNote] = useState(""); const [error, setError] = useState(""); const [busy, setBusy] = useState(false);
  async function submit(event: FormEvent) {
    event.preventDefault(); if (busy) return; setBusy(true); setError("");
    try { await api.review(token, idea, { state, hidden, locked, message: note.trim() }); setNote(""); await updated(); }
    catch (error) { setError(message(error)); } finally { setBusy(false); }
  }
  return <details className={styles.staffPanel}><summary>Staff controls · validation, progress & moderation</summary><form className={styles.form} onSubmit={submit}>
    <label>Development status<select value={state} onChange={event => setState(event.target.value)}>{reviewStates(idea.state).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
    <p className={styles.muted}>Approve an idea first before moving it into a delivery stage. Status changes and progress notes appear in the public timeline.</p>
    <label>Public progress update / decision<textarea minLength={10} maxLength={2000} required value={note} rows={4} onChange={event => setNote(event.target.value)} placeholder="Explain the decision, next step, or what has shipped…" /></label>
    <label className={styles.checkbox}><input type="checkbox" checked={locked} onChange={event => setLocked(event.target.checked)} />Lock discussion and new votes</label>
    <label className={styles.checkbox}><input type="checkbox" checked={hidden} onChange={event => setHidden(event.target.checked)} />Hide this idea from the public (author and staff retain access)</label>
    <ErrorNotice error={error} retry={() => void updated()} /><button disabled={busy} className={styles.primary}>{busy ? "Saving…" : "Publish staff update"}</button>
  </form></details>;
}

export function OwnerEdit({ idea, token, updated }: { idea: Idea; token: string; updated: () => Promise<void> }) {
  const [title, setTitle] = useState(idea.title); const [body, setBody] = useState(idea.body); const [category, setCategory] = useState(idea.category);
  const [error, setError] = useState(""); const [busy, setBusy] = useState(false);
  async function submit(event: FormEvent) {
    event.preventDefault(); if (busy) return; setBusy(true); setError("");
    try { await api.edit(token, idea, { title, body, category }); await updated(); } catch (error) { setError(message(error)); } finally { setBusy(false); }
  }
  return <details className={styles.staffPanel}><summary>Edit your proposal</summary><form onSubmit={submit} className={styles.form}>
    <label>Title<input required minLength={8} maxLength={120} value={title} onChange={event => setTitle(event.target.value)} /></label>
    <label>Category<select value={category} onChange={event => setCategory(event.target.value)}>{categories.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
    <label>Description<textarea required minLength={30} maxLength={8000} rows={8} value={body} onChange={event => setBody(event.target.value)} /></label>
    <ErrorNotice error={error} retry={() => void updated()} /><button disabled={busy} className={styles.primary}>{busy ? "Saving…" : "Save changes"}</button><p className={styles.muted}>Once an idea receives votes or comments, add clarifications in the discussion instead of rewriting it.</p>
  </form></details>;
}
