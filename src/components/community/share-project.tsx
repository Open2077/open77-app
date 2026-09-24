"use client";

import { useRef, useState } from "react";

export function ShareProject({ url, title }: { url: string; title: string }) {
  const [status, setStatus] = useState(""); const input = useRef<HTMLInputElement>(null);
  function select() { input.current?.focus(); input.current?.select(); }
  async function copy() {
    try { await navigator.clipboard.writeText(url); setStatus("Project link copied."); }
    catch { select(); setStatus("Select and copy the project link below."); }
  }
  async function share() {
    if (!navigator.share) { select(); setStatus("Copy the project link below to share it."); return; }
    try { await navigator.share({ title, url }); setStatus("Share menu closed."); }
    catch (error) { if (!(error instanceof DOMException && error.name === "AbortError")) { select(); setStatus("Sharing is unavailable. Copy the link below instead."); } }
  }
  return <section className="hub-share" aria-label="Share this creation"><label>Public project link<input ref={input} readOnly value={url} onFocus={event => event.target.select()} /></label>
    <div className="hub-actions"><button className="btn btn-ghost" type="button" onClick={() => void copy()}>Copy link</button><button className="btn btn-ghost" type="button" onClick={() => void share()}>Share</button></div>
    {status && <p role="status">{status}</p>}</section>;
}
