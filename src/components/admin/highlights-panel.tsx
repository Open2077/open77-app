"use client";

import { useRef, useState } from "react";
import { AdminPanel, Footnote, LoadingBlock, SuccessStrip } from "./admin-kit";
import { ErrorStrip, useAdminData } from "./use-admin-data";
import { Button } from "./admin-button";
import { useAdminActivity } from "./admin-activity";
import { Field, Input, Select, Textarea } from "@/components/ui/field";
import { listHighlights, saveHighlight, deleteHighlight, highlightStatus, type Highlight, type HighlightAction } from "@/lib/account/highlights-api";
import styles from "./highlights-panel.module.css";

function blank(): Highlight {
  const now = Date.now();
  return { id: "", revision: 0, name: "", title: null, text: null, imageUrl: null, imageAlt: null,
    startsAtUtc: new Date(now).toISOString(), expiresAtUtc: new Date(now + 86400000).toISOString(), published: false, priority: 0, actions: [] };
}
function localDate(value: string) {
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return "";
  return new Date(date.getTime() - date.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
}
function utcDate(value: string) { return value ? new Date(value).toISOString() : ""; }

export function HighlightsPanel() {
  const { token, data, setData, error, setError, loading, reload } = useAdminData(listHighlights);
  const [editing, setEditing] = useState<Highlight | null>(null);
  const [editorGeneration, setEditorGeneration] = useState(0);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState("");
  const [snapshot, setSnapshot] = useState(() => Date.now());
  const inFlight = useRef(false);
  const { begin } = useAdminActivity();

  async function write(value: Highlight, remove = false) {
    if (!token || inFlight.current) return;
    inFlight.current = true; setBusy(true); setError(null); setNotice("");
    const finish = begin();
    let success = false;
    try {
      if (remove) {
        await deleteHighlight(token, value);
        setData(current => current?.filter(row => row.id !== value.id) ?? []);
        setEditing(null); setNotice("Highlight removed from the launcher feed.");
      } else {
        const saved = await saveHighlight(token, value);
        setData(current => [saved, ...(current ?? []).filter(row => row.id !== saved.id)]);
        setEditing(saved); setNotice("Highlight saved. Players who already passed this ID will not see it again.");
      }
      setSnapshot(Date.now()); success = true;
    } catch (err) { setError(err instanceof Error ? err.message : "Could not save this highlight."); }
    finally { inFlight.current = false; setBusy(false); finish(success); }
  }

  return <AdminPanel title="Launcher highlights" brackets actions={<div className={styles.actions}>
    <Button size="sm" color="neutral" border lines="none" disabled={busy} onClick={() => { setSnapshot(Date.now()); reload(); }}>Refresh</Button>
    <Button size="sm" lines="none" disabled={busy} onClick={() => { setEditorGeneration(n => n + 1); setEditing(blank()); }}>New highlight</Button>
  </div>}>
    <Footnote>Promote a launch, event or community when players open the launcher. Each highlight appears once per player, during its scheduled window. Higher priority appears first.</Footnote>
    <ErrorStrip message={error} />
    {notice && <SuccessStrip message={notice} />}
    <div className={styles.layout}>
      <aside className={styles.list} aria-label="Highlights">
        {loading && <LoadingBlock label="Loading highlights" />}
        {!loading && !data?.length && <p>No highlights yet. Create a draft to get started.</p>}
        {data?.map(row => <button type="button" key={row.id} disabled={busy} aria-pressed={editing?.id === row.id} onClick={() => setEditing(row)}>
          <strong>{row.name}</strong><span>{highlightStatus(row, snapshot)} · Priority {row.priority}</span>
          <small>Ends {new Date(row.expiresAtUtc).toLocaleString()}</small>
        </button>)}
      </aside>
      {editing ? <HighlightEditor key={`${editing.id}:${editing.revision}:${editorGeneration}`} value={editing} busy={busy}
        onSave={value => write(value)} onClose={() => setEditing(null)}
        onDelete={() => { if (window.confirm(`Delete “${editing.name}”? It will stop appearing in the launcher.`)) void write(editing, true); }}
        onDuplicate={() => setEditing({ ...editing, id: "", revision: 0, name: `${editing.name} (copy)`.slice(0, 120), published: false })} />
        : <div className={styles.empty}>Select a highlight or create a new one to preview its launcher presentation.</div>}
    </div>
  </AdminPanel>;
}

function HighlightEditor({ value, busy, onSave, onDelete, onDuplicate, onClose }: {
  value: Highlight; busy: boolean; onSave: (value: Highlight) => void; onDelete: () => void; onDuplicate: () => void; onClose: () => void;
}) {
  const [draft, setDraft] = useState(value);
  const [failedImage, setFailedImage] = useState<string | null>(null);
  const update = (part: Partial<Highlight>) => setDraft(current => ({ ...current, ...part }));
  const updateAction = (index: number, part: Partial<HighlightAction>) => update({ actions: draft.actions.map((action, i) => i === index ? { ...action, ...part } : action) });
  const image = draft.imageUrl && /^https:\/\//i.test(draft.imageUrl) ? draft.imageUrl : null;
  return <div className={styles.editor}>
    <form onSubmit={event => { event.preventDefault(); onSave(draft); }}>
      <fieldset disabled={busy}>
        <legend>{value.id ? "Edit highlight" : "New highlight"}</legend>
        {value.id && <p className={styles.id}>ID: {value.id}</p>}
        <Field label="Internal name"><Input required maxLength={120} value={draft.name} onChange={e => update({ name: e.target.value })} placeholder="LightRP · Launch day" /></Field>
        <div className={styles.row}>
          <Field label="Starts (your local time)"><Input required type="datetime-local" value={localDate(draft.startsAtUtc)} onChange={e => update({ startsAtUtc: utcDate(e.target.value) })} /></Field>
          <Field label="Expires (your local time)"><Input required type="datetime-local" value={localDate(draft.expiresAtUtc)} onChange={e => update({ expiresAtUtc: utcDate(e.target.value) })} /></Field>
        </div>
        <Field label="Title (optional)"><Input maxLength={160} value={draft.title ?? ""} onChange={e => update({ title: e.target.value || null })} /></Field>
        <Field label="Text (optional)"><Textarea maxLength={4000} rows={4} value={draft.text ?? ""} onChange={e => update({ text: e.target.value || null })} /></Field>
        <Field label="Image URL (optional, HTTPS)"><Input type="url" maxLength={2048} value={draft.imageUrl ?? ""} onChange={e => update({ imageUrl: e.target.value || null })} placeholder="https://…/lightrp-launch.webp" /></Field>
        <Field label="Image description (for accessibility)"><Input maxLength={300} value={draft.imageAlt ?? ""} onChange={e => update({ imageAlt: e.target.value || null })} /></Field>
        <div className={styles.row}>
          <Field label="Visibility"><Select value={String(draft.published)} onChange={e => update({ published: e.target.value === "true" })}><option value="false">Draft</option><option value="true">Published during scheduled window</option></Select></Field>
          <Field label="Priority"><Input type="number" min={0} max={999} required value={draft.priority} onChange={e => update({ priority: Number(e.target.value) })} /></Field>
        </div>
        <h3>Buttons</h3>
        {draft.actions.map((action, index) => <div key={index} className={styles.actionEditor}>
          <Field label={`Button ${index + 1} label`}><Input required maxLength={60} value={action.label} onChange={e => updateAction(index, { label: e.target.value })} /></Field>
          <Field label="Action"><Select value={action.kind} onChange={e => updateAction(index, { kind: e.target.value as "web" | "connect", url: null, serverId: null })}><option value="web">Open website</option><option value="connect">Connect to server</option></Select></Field>
          {action.kind === "web" ? <Field label="Website URL"><Input required type="url" value={action.url ?? ""} onChange={e => updateAction(index, { url: e.target.value })} placeholder="https://…" /></Field>
            : <Field label="Server ID"><Input required value={action.serverId ?? ""} onChange={e => updateAction(index, { serverId: e.target.value })} placeholder="Stable server UUID from the Servers page" /></Field>}
          <Button type="button" size="sm" color="neutral" border lines="none" onClick={() => update({ actions: draft.actions.filter((_, i) => i !== index) })}>Remove button</Button>
        </div>)}
        {draft.actions.length < 3 && <Button type="button" size="sm" color="neutral" border lines="none" onClick={() => update({ actions: [...draft.actions, { label: "Learn more", kind: "web", url: null, serverId: null }] })}>Add button</Button>}
        <div className={styles.actions}>
          <Button type="submit" lines="none" busy={busy}>Save highlight</Button>
          <Button type="button" color="neutral" border lines="none" onClick={onClose}>Close</Button>
          {value.id && <><Button type="button" color="neutral" border lines="none" onClick={onDuplicate}>Duplicate as new</Button><Button type="button" color="red" border lines="none" onClick={onDelete}>Delete</Button></>}
        </div>
      </fieldset>
    </form>
    <section className={styles.preview} aria-label="Launcher preview">
      <p className={styles.previewLabel}>LAUNCHER PREVIEW</p>
      <article>
        {/* Remote artwork is previewed directly, without fetching arbitrary URLs through the image optimizer. */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        {image && failedImage !== image && <img src={image} alt={draft.imageAlt ?? ""} referrerPolicy="no-referrer" onError={() => setFailedImage(image)} />}
        {image && failedImage === image && <p role="status">Image could not be loaded. Check its URL before publishing.</p>}
        <div className={styles.previewCopy}>
          {draft.title && <h2>{draft.title}</h2>}{draft.text && <p>{draft.text}</p>}
          {!draft.title && !draft.text && !image && <p>Add an image or text to build your highlight.</p>}
          <div className={styles.actions}>{draft.actions.map((action, i) => <span key={i}>{action.label || "Button"}{action.kind === "connect" ? " →" : " ↗"}</span>)}</div>
          <small>Continue to launcher →</small>
        </div>
      </article>
      <Footnote>Preview only. Buttons here do not launch games or open websites. Edits preserve the ID; use Duplicate as new for a new announcement.</Footnote>
    </section>
  </div>;
}
