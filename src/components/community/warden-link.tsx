"use client";

import { useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/field";
import { copy01, link01 } from "@/components/ui/icons";
import { Panel } from "@/components/ui/panel";
import { Display, Eyebrow } from "@/components/ui/typography";

import styles from "./warden-link.module.css";

/** The address a server owner pastes into Warden to install this creation. */
export function WardenLink({ url }: { url: string }) {
  const [status, setStatus] = useState("");
  const input = useRef<HTMLInputElement>(null);
  async function copy() {
    try { await navigator.clipboard.writeText(url); setStatus("Link copied. Paste it into Warden’s Workshop search."); }
    catch { input.current?.focus(); input.current?.select(); setStatus("Select and copy the link."); }
  }
  return (
    <Panel as="section" variant="outline" id="warden" className={styles.warden} aria-label="Install with Warden" data-warden-link>
      <Eyebrow>Install with Warden</Eyebrow>
      <Display as="h2" size="xs">
        Send it to your server
      </Display>
      <div className={styles.copyRow}>
        <Input ref={input} readOnly value={url} icon={link01} aria-label="Workshop link for Warden" onFocus={event => event.target.select()} />
        <Button color="blue" lines="none" size="sm" icon={copy01} iconPosition="left" fullWidth onClick={() => void copy()}>
          Copy link
        </Button>
      </div>
      <ol className={styles.steps}>
        <li><span>Open your server’s Warden and go to <b>Workshop</b>.</span></li>
        <li><span>Paste the link into the search field. Warden looks the creation up on the master.</span></li>
        <li><span>Review the install plan (files, permissions, load rules), then install. It starts with the server and reaches players like any resource.</span></li>
      </ol>
      {status ? <p role="status" className={styles.status}>{status}</p> : null}
    </Panel>
  );
}
