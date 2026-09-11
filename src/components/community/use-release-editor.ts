"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { MasterApiError } from "@/lib/account/api";
import * as api from "@/lib/community/client-api";
import type { CommunityReleaseEditor, CommunityReleaseEditorContent } from "@/lib/community/types";

export function useReleaseEditor(token: string, projectId: string, initial: CommunityReleaseEditorContent) {
  const [content, setContent] = useState(initial);
  const [revision, setRevision] = useState(0);
  const [loaded, setLoaded] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [conflict, setConflict] = useState(false);
  const [remote, setRemote] = useState<CommunityReleaseEditor | null>(null);
  const [attempt, setAttempt] = useState(0);
  const initialized = useRef(false), writing = useRef(false), sequence = useRef(0);
  useEffect(() => {
    if (initialized.current) return;
    const controller = new AbortController();
    api.releaseEditor(token, projectId, AbortSignal.any([controller.signal, AbortSignal.timeout(15000)]))
      .then(({ draft }) => { if (!controller.signal.aborted) {
        if (draft) { setContent(draft.content); setRevision(draft.revision); }
        initialized.current = true; setLoaded(true); setError("");
      } }).catch(error => { if (!controller.signal.aborted) setError(error instanceof Error ? error.message : "Release draft could not be loaded."); });
    return () => controller.abort();
  }, [token, projectId, attempt]);
  const save = useCallback(async () => {
    if (!loaded || writing.current || conflict) return false;
    if (!dirty) return true;
    writing.current = true; setBusy(true); setError("");
    const snapshot = sequence.current;
    try {
      const saved = await api.saveReleaseEditor(token, projectId, revision, content);
      setRevision(saved.revision); setDirty(sequence.current !== snapshot); return true;
    } catch (error) {
      setError(error instanceof Error ? error.message : "Release draft could not be saved.");
      if (error instanceof MasterApiError && error.code === "revision_conflict") setConflict(true);
      return false;
    } finally { writing.current = false; setBusy(false); }
  }, [loaded, dirty, conflict, token, projectId, revision, content]);
  useEffect(() => {
    if (!loaded || !dirty || busy || error || conflict) return;
    const timer = setTimeout(() => { void save(); }, 1500);
    return () => clearTimeout(timer);
  }, [loaded, dirty, busy, error, conflict, save]);
  useEffect(() => {
    if (!dirty) return;
    const warn = (event: BeforeUnloadEvent) => event.preventDefault();
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);
  function change(key: keyof CommunityReleaseEditorContent, value: string) {
    sequence.current++; setContent(current => ({ ...current, [key]: value })); setDirty(true);
  }
  async function compare() {
    if (writing.current) return;
    setBusy(true);
    try { const result = await api.releaseEditor(token, projectId, AbortSignal.timeout(15000)); setRemote(result.draft); }
    catch (error) { setError(error instanceof Error ? error.message : "Comparison could not be loaded."); }
    finally { setBusy(false); }
  }
  function recover(keep: "local" | "remote") {
    if (!remote) return;
    sequence.current++;
    if (keep === "remote") setContent(remote.content);
    setRevision(remote.revision); setDirty(keep === "local"); setConflict(false); setRemote(null); setError("");
  }
  return { content, change, loaded, dirty, busy, error, conflict, remote, save, compare, recover, retryLoad: () => setAttempt(value => value + 1) };
}
