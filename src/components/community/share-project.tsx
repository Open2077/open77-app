"use client";

import { useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/field";
import { copy01, share08 } from "@/components/ui/icons";

import styles from "./share-project.module.css";

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
  return (
    <section className={styles.share} aria-label="Share this creation">
      <Field label="Public project link">
        <Input ref={input} readOnly value={url} onFocus={event => event.target.select()} />
      </Field>
      <div className={styles.actions}>
        <Button color="neutral" border lines="none" size="sm" icon={copy01} iconPosition="left" onClick={() => void copy()}>Copy link</Button>
        <Button color="neutral" border lines="none" size="sm" icon={share08} iconPosition="left" onClick={() => void share()}>Share</Button>
      </div>
      {status ? <p role="status" className={styles.status}>{status}</p> : null}
    </section>
  );
}
