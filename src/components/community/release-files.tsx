"use client";

import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import { Table } from "@/components/ui/data";
import { Loader } from "@/components/ui/feedback";
import { Icon } from "@/components/ui/icon";
import { arrowLeft01, arrowRight01, folderOpen, refresh } from "@/components/ui/icons";
import { releaseFiles } from "@/lib/community/client-api";
import type { CommunityReleaseFiles } from "@/lib/community/types";

import styles from "./release-files.module.css";

/** The files inside a release ZIP, loaded only when opened (it never counts as a download). */
export function ReleaseFiles({ releaseId, token }: { releaseId: string; token?: string }) {
  const [opened, setOpened] = useState(false);
  const [cursor, setCursor] = useState<string>();
  const [history, setHistory] = useState<(string | undefined)[]>([]);
  const [refreshCount, setRefresh] = useState(0);
  const [result, setResult] = useState<{ data?: CommunityReleaseFiles; error?: string; token?: string; id: string; cursor?: string; refresh: number } | null>(null);
  useEffect(() => {
    if (!opened) return;
    const controller = new AbortController();
    releaseFiles(releaseId, token, cursor, AbortSignal.any([controller.signal, AbortSignal.timeout(15000)]))
      .then(data => { if (!controller.signal.aborted) setResult({ data, token, id: releaseId, cursor, refresh: refreshCount }); })
      .catch(error => { if (!controller.signal.aborted) setResult({ error: error instanceof Error ? error.message : "File inventory could not be loaded.", token, id: releaseId, cursor, refresh: refreshCount }); });
    return () => controller.abort();
  }, [opened, releaseId, token, cursor, refreshCount]);
  const current = result?.id === releaseId && result.token === token && result.cursor === cursor && result.refresh === refreshCount ? result : null;
  return (
    <details className={styles.files} onToggle={event => setOpened(event.currentTarget.open)} data-release-files>
      <summary><Icon glyph={folderOpen} />Package file inventory</summary>
      <div className={styles.body}>
        <p className={styles.text}>Files inside the downloadable ZIP, including documentation and preload archives. Nested archive contents are validated separately. Opening this list does not count as a download.</p>
        {!current && opened ? <Loader label="File inventory" /> : null}
        {current?.error ? (
          <p role="alert" className={styles.error}>
            <span className={styles.text}>{current.error}</span>
            <Button color="neutral" border lines="none" size="sm" icon={refresh} iconPosition="left" onClick={() => setRefresh(value => value + 1)}>Retry</Button>
          </p>
        ) : null}
        {current?.data ? <>
          <p className={styles.count}>{current.data.totalFiles.toLocaleString()} files · Page {history.length + 1}</p>
          <Table caption="Inspected ZIP files" dense className={styles.table}>
            <thead><tr><th scope="col">Path</th><th scope="col" data-numeric>Bytes</th><th scope="col">SHA-256</th></tr></thead>
            <tbody>{current.data.items.map(file => (
              <tr key={file.path}>
                <th scope="row"><code>{file.path}</code></th>
                <td data-numeric>{file.sizeBytes.toLocaleString()}</td>
                <td className={styles.hash}><code>{file.sha256}</code></td>
              </tr>
            ))}</tbody>
          </Table>
          {history.length > 0 || current.data.nextCursor ? (
            <nav className={styles.pages} aria-label="Package file pages">
              {history.length > 0 ? (
                <Button color="neutral" border lines="none" size="sm" icon={arrowLeft01} iconPosition="left" onClick={() => { setCursor(history[history.length - 1]); setHistory(value => value.slice(0, -1)); }}>Previous files</Button>
              ) : null}
              {current.data.nextCursor ? (
                <Button color="neutral" border lines="none" size="sm" icon={arrowRight01} onClick={() => { setHistory(value => [...value, cursor]); setCursor(current.data!.nextCursor ?? undefined); }}>Next files</Button>
              ) : null}
            </nav>
          ) : null}
        </> : null}
      </div>
    </details>
  );
}
