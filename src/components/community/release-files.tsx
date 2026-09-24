"use client";

import { useEffect, useState } from "react";
import { releaseFiles } from "@/lib/community/client-api";
import type { CommunityReleaseFiles } from "@/lib/community/types";

export function ReleaseFiles({ releaseId, token }: { releaseId: string; token?: string }) {
  const [opened, setOpened] = useState(false);
  const [cursor, setCursor] = useState<string>();
  const [history, setHistory] = useState<(string | undefined)[]>([]);
  const [refresh, setRefresh] = useState(0);
  const [result, setResult] = useState<{ data?: CommunityReleaseFiles; error?: string; token?: string; id: string; cursor?: string; refresh: number } | null>(null);
  useEffect(() => {
    if (!opened) return;
    const controller = new AbortController();
    releaseFiles(releaseId, token, cursor, AbortSignal.any([controller.signal, AbortSignal.timeout(15000)]))
      .then(data => { if (!controller.signal.aborted) setResult({ data, token, id: releaseId, cursor, refresh }); })
      .catch(error => { if (!controller.signal.aborted) setResult({ error: error instanceof Error ? error.message : "File inventory could not be loaded.", token, id: releaseId, cursor, refresh }); });
    return () => controller.abort();
  }, [opened, releaseId, token, cursor, refresh]);
  const current = result?.id === releaseId && result.token === token && result.cursor === cursor && result.refresh === refresh ? result : null;
  return <details onToggle={event => setOpened(event.currentTarget.open)}><summary>Package file inventory</summary>
    <p className="hub-notice">Files inside the downloadable ZIP, including documentation and preload archives. Nested archive contents are validated separately. Opening this list does not count as a download.</p>
    {!current && opened && <p role="status">Loading file inventory…</p>}
    {current?.error && <p role="alert">{current.error} <button type="button" className="btn btn-ghost" onClick={() => setRefresh(value => value + 1)}>Retry</button></p>}
    {current?.data && <><p>{current.data.totalFiles.toLocaleString()} files · Page {history.length + 1}</p>
      <div className="hub-file-table"><table><caption>Inspected ZIP files</caption><thead><tr><th scope="col">Path</th><th scope="col">Bytes</th><th scope="col">SHA-256</th></tr></thead>
        <tbody>{current.data.items.map(file => <tr key={file.path}><th scope="row"><code>{file.path}</code></th><td>{file.sizeBytes.toLocaleString()}</td><td><code>{file.sha256}</code></td></tr>)}</tbody></table></div>
      <nav className="hub-actions" aria-label="Package file pages">{history.length > 0 && <button type="button" className="btn btn-ghost" onClick={() => { setCursor(history[history.length - 1]); setHistory(value => value.slice(0, -1)); }}>Previous files</button>}
        {current.data.nextCursor && <button type="button" className="btn btn-ghost" onClick={() => { setHistory(value => [...value, cursor]); setCursor(current.data!.nextCursor ?? undefined); }}>Next files</button>}</nav>
    </>}
  </details>;
}
