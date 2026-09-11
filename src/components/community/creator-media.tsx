"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import * as api from "@/lib/community/client-api";
import { transferUpload } from "@/lib/community/upload";
import type { CommunityContent, CommunityPage, CommunityUploadItem } from "@/lib/community/types";
import { PrivateMediaPreview } from "./private-media-preview";

type References = NonNullable<CommunityContent["media"]>;
export function CreatorMedia({ token, projectId, media, onChange }: {
  token: string; projectId: string | null; media: References; onChange: (value: References) => void;
}) {
  const avatar = projectId === null;
  const [history, setHistory] = useState<CommunityPage<CommunityUploadItem> | null>(null);
  const [cursor, setCursor] = useState<string>();
  const [refresh, setRefresh] = useState(0);
  const [error, setError] = useState("");
  const [historyError, setHistoryError] = useState("");
  const [notice, setNotice] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState(0);
  const [restart, setRestart] = useState<CommunityUploadItem | null>(null);
  const operation = useRef<AbortController | null>(null);
  useEffect(() => () => operation.current?.abort(), []);
  useEffect(() => {
    if (!busy) return;
    const warn = (event: BeforeUnloadEvent) => event.preventDefault();
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [busy]);
  useEffect(() => {
    const controller = new AbortController();
    let timer: ReturnType<typeof setTimeout> | undefined;
    let count = 0;
    async function load() {
      try {
        const signal = AbortSignal.any([controller.signal, AbortSignal.timeout(10000)]);
        const result = await (projectId === null ? api.myAvatarUploads(token, cursor, signal) : api.myUploads(token, projectId, cursor, signal));
        if (controller.signal.aborted) return;
        setHistory(result); setHistoryError("");
        if (result.items.some(item => item.upload.kind === "image" && ["processing", "receiving"].includes(item.upload.state))) {
          if (count++ < 20) timer = setTimeout(load, Math.min(30000, 3000 * 1.3 ** count));
          else setNotice("Automatic image checks paused. Refresh to check again.");
        }
      } catch (error) { if (!controller.signal.aborted) setHistoryError(error instanceof Error ? error.message : "Image history could not be loaded."); }
    }
    void load();
    return () => { controller.abort(); clearTimeout(timer); };
  }, [token, projectId, cursor, refresh]);
  function reload() { setRefresh(value => value + 1); }
  async function upload(event: FormEvent) {
    event.preventDefault(); if (busy) return;
    const finalizeOnly = restart?.upload.state === "uploaded";
    if (!finalizeOnly && (!file || !file.size || file.size > 10 * 1024 * 1024 || !/\.(jpe?g|png|webp)$/i.test(file.name))) {
      setError("Choose a JPEG, PNG or WebP image up to 10 MiB."); return;
    }
    if (!finalizeOnly && restart && file && (restart.originalName !== file.name || file.size > restart.upload.maximumBytes)) {
      setError("Select the original filename within its reserved size to restart."); return;
    }
    const controller = new AbortController(); operation.current = controller;
    setBusy(true); setError(""); setNotice("Uploading image…"); setProgress(0);
    try {
      let id = restart?.upload.uploadId;
      if (!finalizeOnly && file) {
        const grant = restart ? await api.restartUpload(token, restart.upload.uploadId, controller.signal) :
          await (projectId === null ? api.reserveAvatarUpload(token, file, controller.signal) : api.reserveUpload(token, projectId, null, "image", file, controller.signal));
        id = grant.uploadId;
        await transferUpload(grant, file, controller.signal, setProgress);
      }
      if (!id) throw new Error("No image upload was reserved.");
      await api.completeUpload(token, id, controller.signal);
      setNotice(avatar ? "Avatar queued for processing. Select it below when processing finishes, then save your public profile." : "Image queued for processing. Attach it below when processing finishes, then save your draft.");
      setFile(null); setRestart(null); setCursor(undefined);
    } catch (error) {
      setNotice(""); setError(controller.signal.aborted ? "Transfer stopped. Refresh upload history before restarting." : error instanceof Error ? error.message : "Image upload failed.");
    } finally { operation.current = null; setBusy(false); reload(); }
  }
  function move(index: number, direction: number) {
    const current = media[index], target = media[index + direction];
    if (!current || !target) return;
    const next = [...media]; next[index] = target; next[index + direction] = current; onChange(next);
  }
  return <section className="hub-section" aria-label={avatar ? "Manage avatar" : "Manage screenshots"}>
    <div className="hub-section-head"><div><p className="hub-kicker">{avatar ? "YOUR CREATOR IDENTITY" : "SHOW YOUR CREATION"}</p><h2>{avatar ? "Profile avatar" : "Cover and screenshots"}</h2></div>
      <button type="button" className="btn btn-ghost" onClick={reload}>Refresh images</button></div>
    <p className="hub-notice">{avatar ? "Upload an image, select it after processing, then save your public profile to make it visible. Use an image you have permission to share." : "The first image is your cover. Add up to eight more screenshots, describe each image, and save your draft. New images become public after review."}</p>
    {error && <p className="hub-notice" role="alert">{error}</p>}{historyError && <p className="hub-notice" role="alert">{historyError}</p>}{notice && <p className="hub-notice" role="status">{notice}</p>}
    <div className="hub-media-editor">{media.map((reference, index) => <article className="hub-release" key={reference.mediaId}>
      <p className="hub-kicker">{avatar ? "SELECTED AVATAR" : index === 0 ? "COVER" : `SCREENSHOT ${index}`}</p>
      <PrivateMediaPreview token={token} mediaId={reference.mediaId} alt={reference.altText} />
      {!avatar && <div className="hub-form"><label>Image description<input required maxLength={500} value={reference.altText} onChange={event => onChange(media.map((item, i) => i === index ? { ...item, altText: event.target.value } : item))} /></label>
        <label>Caption<input maxLength={1000} value={reference.caption ?? ""} onChange={event => onChange(media.map((item, i) => i === index ? { ...item, caption: event.target.value } : item))} /></label></div>}
      <div className="hub-actions">{!avatar && <><button type="button" className="btn btn-ghost" disabled={index === 0} onClick={() => move(index, -1)}>Move earlier</button>
        <button type="button" className="btn btn-ghost" disabled={index === media.length - 1} onClick={() => move(index, 1)}>Move later</button></>}
        <button type="button" className="btn btn-ghost" onClick={() => onChange(media.filter((_, i) => i !== index))}>{avatar ? "Remove avatar selection" : "Remove from draft"}</button></div>
    </article>)}</div>
    <form className="hub-form hub-upload-form" onSubmit={upload}>
      {restart && <p>Recovering {restart.originalName}</p>}
      {restart?.upload.state !== "uploaded" && <label>{avatar ? "Upload an avatar" : "Upload a screenshot"}<input type="file" accept="image/jpeg,image/png,image/webp" disabled={busy} onChange={event => setFile(event.target.files?.[0] ?? null)} /></label>}
      <div className="hub-actions"><button className="btn btn-primary" disabled={busy || (!file && restart?.upload.state !== "uploaded")}>{restart?.upload.state === "uploaded" ? "Process stored image" : restart ? "Restart image upload" : "Upload image"}</button>
        {busy && <button type="button" className="btn btn-ghost" onClick={() => operation.current?.abort()}>Stop transfer</button>}
        {restart && !busy && <button type="button" className="btn btn-ghost" onClick={() => { setRestart(null); setFile(null); }}>Choose a new upload</button>}</div>
      {busy && <progress max={100} value={progress} aria-label="Image upload progress" />}
    </form>
    <h3 className="hub-library-title">Your uploaded images</h3>
    {!history && !historyError && <p role="status">Loading your image library…</p>}
    {history && !history.items.some(item => item.upload.kind === "image") && <p className="hub-notice">{cursor ? "No images on this upload-history page. Browse another page or return to the newest uploads." : "No images on this page yet. Upload a JPEG, PNG or WebP above to start your gallery."}</p>}
    <div className="hub-media-editor">{history?.items.filter(item => item.upload.kind === "image").map(item => <article className="hub-release" key={item.upload.uploadId}>
      <h4>{item.originalName}</h4><p>{item.upload.state}{item.upload.inspectionCode ? ` · ${item.upload.inspectionCode.replaceAll("_", " ")}` : ""}</p>
      {item.upload.state === "accepted" && item.upload.mediaId && <button type="button" className="btn btn-ghost" disabled={(!avatar && media.length >= 9) || media.some(reference => reference.mediaId === item.upload.mediaId)}
        onClick={() => onChange(avatar ? [{ mediaId: item.upload.mediaId!, altText: "Creator avatar" }] : [...media, { mediaId: item.upload.mediaId!, altText: "", caption: "" }])}>{avatar ? "Select avatar" : "Attach to draft"}</button>}
      {["pending", "uploaded"].includes(item.upload.state) && <button type="button" className="btn btn-ghost" disabled={busy} onClick={() => {
        if (Date.parse(item.upload.expiresAtUtc) <= Date.now()) { setError("This reservation expired. Start a new image upload."); return; }
        setRestart(item); setFile(null); setError(""); setNotice("Use the upload form above to recover this image.");
      }}>Recover upload</button>}
    </article>)}</div>
    <nav className="hub-actions" aria-label="Image upload pages">{cursor && <button type="button" className="btn btn-ghost" onClick={() => setCursor(undefined)}>Newest uploads</button>}
      {history?.nextCursor && <button type="button" className="btn btn-ghost" onClick={() => setCursor(history.nextCursor ?? undefined)}>Older uploads</button>}</nav>
  </section>;
}
