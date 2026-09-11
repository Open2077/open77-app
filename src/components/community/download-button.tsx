"use client";

import { useState } from "react";
import { MasterApiError } from "@/lib/account/api";
import { requestDownload } from "@/lib/community/client-api";

export function DownloadButton({ releaseId, version }: { releaseId: string; version: string }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [ready, setReady] = useState<{ url: string; expires: number } | null>(null);
  async function prepare() {
    setBusy(true); setError(""); setReady(null);
    try {
      const delivery = await requestDownload(releaseId);
      const url = new URL(delivery.downloadUrl);
      if (url.username || url.password || !(url.protocol === "https:" ||
        url.protocol === "http:" && ["localhost", "127.0.0.1", "[::1]"].includes(url.hostname))) throw new Error("Invalid delivery URL");
      const expires = Date.parse(delivery.expiresAtUtc);
      if (!Number.isFinite(expires) || expires <= Date.now()) throw new Error("Expired delivery grant");
      setReady({ url: url.href, expires });
    } catch (failure) {
      setError(failure instanceof MasterApiError ? failure.message : "The download could not be prepared. Please try again.");
    } finally { setBusy(false); }
  }
  return <div className="hub-download-action">
    {ready ? <a className="btn btn-primary" href={ready.url} referrerPolicy="no-referrer" onClick={event => {
      if (Date.now() >= ready.expires) { event.preventDefault(); setReady(null); setError("This link expired. Prepare a new download."); }
    }}>Download ZIP · {version}</a> : <button className="btn btn-primary" type="button" disabled={busy} onClick={prepare}>
      {busy ? "Preparing…" : `Get ZIP · ${version}`}
    </button>}
    <span role="status" className="hub-download-status">{ready ? "Your download is ready." : busy ? "Checking release availability…" : ""}</span>
    {error && <p role="alert">{error}</p>}
  </div>;
}
