"use client";

import { useRef, useState } from "react";
import { CopyIcon } from "@/components/icons";

/** The address a server owner pastes into Warden to install this creation. */
export function WardenLink({ url }: { url: string }) {
  const [status, setStatus] = useState("");
  const input = useRef<HTMLInputElement>(null);
  async function copy() {
    try { await navigator.clipboard.writeText(url); setStatus("Link copied. Paste it into Warden’s Workshop search."); }
    catch { input.current?.focus(); input.current?.select(); setStatus("Select and copy the link."); }
  }
  return <section className="hub-panel ws-warden" aria-label="Install with Warden"><p className="hub-kicker">INSTALL WITH WARDEN</p>
    <h2>Send it to your server</h2>
    <div className="ws-warden-link"><input ref={input} readOnly value={url} aria-label="Workshop link for Warden" onFocus={event => event.target.select()} />
      <button type="button" className="btn btn-primary btn-small" onClick={() => void copy()}><CopyIcon size={13} /> Copy link</button></div>
    <ol className="ws-warden-steps">
      <li>Open your server’s Warden and go to <b>Workshop</b>.</li>
      <li>Paste the link into the search field. Warden looks the creation up on the master.</li>
      <li>Review the install plan (files, permissions, load rules), then install. It starts with the server and reaches players like any resource.</li>
    </ol>
    {status && <p role="status" className="ws-action-note">{status}</p>}
  </section>;
}
