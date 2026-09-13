"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import * as api from "@/lib/community/client-api";
import { transferUpload } from "@/lib/community/upload";
import type { CommunityPage, CommunityUploadItem } from "@/lib/community/types";
import { PrivateMediaPreview } from "./private-media-preview";

const CLIP_BYTES = 8 * 1024 * 1024;

/**
 * The optional hover clip: one short muted video per creation, shown when
 * someone rests the pointer on its card. Upload, wait for processing, pick it.
 */
export function CreatorClip({ token, projectId, clipMediaId, onChange }: {
  token: string; projectId: string; clipMediaId: string | null | undefined; onChange: (value: string | null) => void;
}) {
  const [history, setHistory] = useState<CommunityPage<CommunityUploadItem> | null>(null);
  const [refresh, setRefresh] = useState(0);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState(0);
  const [disabled, setDisabled] = useState(false);
  const operation = useRef<AbortController | null>(null);
  useEffect(() => () => operation.current?.abort(), []);
  useEffect(() => {
    const controller = new AbortController();
    let timer: ReturnType<typeof setTimeout> | undefined;
    let count = 0;
    async function load() {
      try {
        const result = await api.myUploads(token, projectId, undefined, AbortSignal.any([controller.signal, AbortSignal.timeout(10000)]));
        if (controller.signal.aborted) return;
        setHistory(result);
        if (result.items.some(item => item.upload.kind === "clip" && ["processing", "receiving"].includes(item.upload.state)) && count++ < 20)
          timer = setTimeout(load, Math.min(30000, 3000 * 1.3 ** count));
      } catch (error) { if (!controller.signal.aborted) setError(error instanceof Error ? error.message : "Upload history could not be loaded."); }
    }
    void load();
    return () => { controller.abort(); clearTimeout(timer); };
  }, [token, projectId, refresh]);
  async function upload(event: FormEvent) {
    event.preventDefault();
    if (busy || !file) return;
    if (!file.size || file.size > CLIP_BYTES || !/\.(webm|mp4|gif)$/i.test(file.name)) { setError("Choose a WebM, MP4 or GIF up to 8 MiB and 8 seconds."); return; }
    const controller = new AbortController(); operation.current = controller;
    setBusy(true); setError(""); setNotice("Uploading clip…"); setProgress(0);
    try {
      const grant = await api.reserveUpload(token, projectId, null, "clip", file, controller.signal);
      await transferUpload(grant, file, controller.signal, setProgress);
      await api.completeUpload(token, grant.uploadId, controller.signal);
      setNotice("Clip queued for processing. It is re-encoded muted at up to 640 pixels; pick it below when processing finishes, then save your draft.");
      setFile(null);
    } catch (failure) {
      setNotice("");
      const message = failure instanceof Error ? failure.message : "Clip upload failed.";
      if (failure instanceof Error && "code" in failure && failure.code === "clips_disabled") setDisabled(true);
      setError(controller.signal.aborted ? "Transfer stopped." : message);
    } finally { operation.current = null; setBusy(false); setRefresh(value => value + 1); }
  }
  const clips = history?.items.filter(item => item.upload.kind === "clip") ?? [];
  return <section className="hub-section" aria-label="Hover clip">
    <div className="hub-section-head"><div><p className="hub-kicker">MOTION PREVIEW</p><h2>Hover clip</h2></div>
      <button type="button" className="btn btn-ghost btn-small" onClick={() => setRefresh(value => value + 1)}>Refresh clips</button></div>
    <p className="hub-notice">One short clip, up to 8 seconds and 8 MiB (WebM, MP4 or GIF), plays muted when someone hovers your creation in the library. Sound, subtitles and metadata are dropped during processing. Keep a cover image too: it is the poster everywhere else.</p>
    {disabled && <p className="hub-notice" role="alert">Hover clips are not enabled on this workshop yet.</p>}
    {error && <p className="hub-notice" role="alert">{error}</p>}{notice && <p className="hub-notice" role="status">{notice}</p>}
    {clipMediaId && <article className="hub-release"><p className="hub-kicker">SELECTED CLIP</p>
      <PrivateMediaPreview token={token} mediaId={clipMediaId} alt="Hover clip" variant="clip" />
      <div className="hub-actions"><button type="button" className="btn btn-ghost btn-small" onClick={() => onChange(null)}>Remove clip from draft</button></div></article>}
    {!disabled && <form className="hub-form hub-upload-form" onSubmit={upload}>
      <label>Upload a clip<input type="file" accept="video/webm,video/mp4,image/gif,.webm,.mp4,.gif" disabled={busy} onChange={event => setFile(event.target.files?.[0] ?? null)} /></label>
      <div className="hub-actions"><button className="btn btn-primary btn-small" disabled={busy || !file}>Upload clip</button>
        {busy && <button type="button" className="btn btn-ghost btn-small" onClick={() => operation.current?.abort()}>Stop transfer</button>}</div>
      {busy && <progress max={100} value={progress} aria-label="Clip upload progress" />}
    </form>}
    {clips.length > 0 && <div className="hub-media-editor">{clips.map(item => <article className="hub-release" key={item.upload.uploadId}>
      <h4>{item.originalName}</h4><p>{item.upload.state}{item.upload.inspectionCode ? ` · ${item.upload.inspectionCode.replaceAll("_", " ")}` : ""}</p>
      {item.upload.state === "accepted" && item.upload.mediaId && <button type="button" className="btn btn-ghost btn-small" disabled={clipMediaId === item.upload.mediaId} onClick={() => onChange(item.upload.mediaId!)}>
        {clipMediaId === item.upload.mediaId ? "Selected" : "Use as hover clip"}</button>}
    </article>)}</div>}
  </section>;
}
