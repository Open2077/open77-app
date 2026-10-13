"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";

import { Button } from "@/components/ui/button";
import { Notice } from "@/components/ui/feedback";
import { Checkbox, Field, Input } from "@/components/ui/field";
import { github as githubGlyph, search01 } from "@/components/ui/icons";
import * as github from "@/lib/community/github-api";
import type { StoredSession } from "@/lib/account/session";
import { Actions, ArrowLink, Disclosure, Fine, Pending, formatDateTime } from "@/components/account/kit";
import { Digest, FieldGrid, Meta, Stack, Subhead, Text } from "./creator-parts";
import { GitHubConnectionControl } from "./github-connection";

import styles from "./github-import.module.css";

const message = (error: unknown) => error instanceof Error ? error.message : "GitHub could not complete this request.";
const size = (bytes: number) => `${(bytes / 1024 / 1024).toFixed(2)} MiB`;
const eligible = (asset: github.GitHubAsset) => asset.name.toLowerCase().endsWith(".zip") && asset.sizeBytes > 0 && asset.sizeBytes <= 100 * 1024 * 1024 && !!asset.sha256;

function Provenance({ selection, verifiedAt }: { selection: github.GitHubSelection; verifiedAt?: string | null }) {
  return (
    <div className={styles.provenance}>
      <ArrowLink href={selection.sourceUrl} external>
        {selection.repository.fullName} · {selection.release.tag}
      </ArrowLink>
      <Text>
        <strong>{selection.asset.name}</strong> · {size(selection.asset.sizeBytes)} · Asset {selection.asset.assetId}
      </Text>
      <Digest label="SHA-256">{selection.asset.sha256}</Digest>
      {selection.release.commitSha ? <Digest label="Commit">{selection.release.commitSha}</Digest> : null}
      <Fine>{verifiedAt ? `Repository control was verified on ${new Date(verifiedAt).toLocaleString()}.` : "A source link does not establish repository control or permission to redistribute."}</Fine>
    </div>
  );
}

export function GitHubImportStatus({ token, id, checkedAt }: { token: string; id: string; checkedAt: number }) {
  const [value, setValue] = useState<github.GitHubImport | null>(null);
  const [error, setError] = useState("");
  useEffect(() => {
    const controller = new AbortController();
    void github.status(token, id, AbortSignal.any([controller.signal, AbortSignal.timeout(15000)]))
      .then(value => { if (!controller.signal.aborted) { setValue(value); setError(""); } })
      .catch(error => { if (!controller.signal.aborted) setError(message(error)); });
    return () => controller.abort();
  }, [token, id, checkedAt]);
  return (
    <Stack tight>
      {error ? <Notice kind="danger">Import status unavailable: {error} Use Refresh status to retry.</Notice> : null}
      {value ? (
        <>
          <Meta>
            <span role="status">GitHub import: {value.state.replaceAll("_", " ")}{value.state === "accepted" ? " · Technical validation passed; publication still requires review." : ""}</span>
          </Meta>
          {value.errorCode ? (
            <Notice kind={["rejected", "dead"].includes(value.state) ? "danger" : "warning"}>
              Import result: <code>{value.errorCode}</code>. {["rejected", "dead"].includes(value.state) ? "Create a new ZIP submission after checking this result." : "The same selected asset is queued for another attempt."}
            </Notice>
          ) : null}
          {value.state === "expired" ? <Fine>The import reservation expired. Start a new upload from the release above.</Fine> : null}
          <Disclosure summary="Imported source and integrity">
            <Provenance selection={value.selection} verifiedAt={value.controlVerifiedAtUtc} />
            {value.fetchedAtUtc ? <Fine>Fetched <time dateTime={value.fetchedAtUtc}>{formatDateTime(value.fetchedAtUtc)}</time></Fine> : null}
          </Disclosure>
        </>
      ) : null}
    </Stack>
  );
}

export function GitHubImportPicker(props: { session: StoredSession; projectId: string; releaseId: string; sourceUrl?: string | null; changed: () => void }) {
  const [open, setOpen] = useState(false);
  return (
    <Disclosure tone="framed" summary="Import a ZIP from a GitHub release" onToggle={event => { if (event.currentTarget.open) setOpen(true); }}>
      {open ? <Picker {...props} /> : null}
    </Disclosure>
  );
}

function Picker({ session, projectId, releaseId, sourceUrl, changed }: { session: StoredSession; projectId: string; releaseId: string; sourceUrl?: string | null; changed: () => void }) {
  const token = session.token;
  const initial = (() => { try { const url = new URL(sourceUrl ?? ""); return url.hostname === "github.com" ? url.pathname.split("/").filter(Boolean).slice(0, 2) : []; } catch { return []; } })();
  const [owner, setOwner] = useState(initial[0] ?? "");
  const [repo, setRepo] = useState(initial[1] ?? "");
  const [available, setAvailable] = useState<boolean | null>(null);
  const [repository, setRepository] = useState<github.GitHubRepository | null>(null);
  const [releases, setReleases] = useState<github.GitHubPage<github.GitHubRelease> | null>(null);
  const [release, setRelease] = useState<github.GitHubRelease | null>(null);
  const [assets, setAssets] = useState<github.GitHubPage<github.GitHubAsset> | null>(null);
  const [selection, setSelection] = useState<github.GitHubSelection | null>(null);
  const [rights, setRights] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [submitted, setSubmitted] = useState<github.GitHubImport | null>(null);
  const [attempted, setAttempted] = useState(false);
  const requestId = useRef<string | null>(null);
  const controller = useRef<AbortController | null>(null);
  useEffect(() => {
    if (!busy) return;
    const warn = (event: BeforeUnloadEvent) => event.preventDefault();
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [busy]);
  useEffect(() => {
    const operation = new AbortController();
    void github.capabilities(AbortSignal.any([operation.signal, AbortSignal.timeout(10000)]))
      .then(value => { if (!operation.signal.aborted) setAvailable(value.features?.githubImports === true); })
      .catch(error => { if (!operation.signal.aborted) setError(message(error)); });
    return () => { operation.abort(); controller.current?.abort(); };
  }, []);
  async function run(action: (signal: AbortSignal) => Promise<void>) {
    if (busy) return;
    const operation = new AbortController(); controller.current = operation;
    setBusy(true); setError("");
    try { await action(AbortSignal.any([operation.signal, AbortSignal.timeout(55000)])); }
    catch (error) { if (!operation.signal.aborted) setError(message(error)); }
    finally { if (!operation.signal.aborted) setBusy(false); if (controller.current === operation) controller.current = null; }
  }
  function resetSelection() { setSelection(null); setRights(false); requestId.current = null; }
  function loadRepository(event: FormEvent) {
    event.preventDefault();
    void run(async signal => {
      const found = await github.repository(token, projectId, owner.trim(), repo.trim(), signal);
      const [canonicalOwner = "", canonicalRepo = ""] = found.fullName.split("/");
      const page = await github.releases(token, projectId, canonicalOwner, canonicalRepo, 1, signal);
      if (signal.aborted) return;
      setRepository(found); setReleases(page); setRelease(null); setAssets(null); resetSelection();
    });
  }
  function releasePage(page: number) {
    if (!repository) return;
    const [owner = "", repo = ""] = repository.fullName.split("/");
    void run(async signal => { const value = await github.releases(token, projectId, owner, repo, page, signal);
      if (!signal.aborted) { setReleases(value); setRelease(null); setAssets(null); resetSelection(); } });
  }
  function assetPage(selected: github.GitHubRelease, page: number) {
    if (!repository) return;
    const [owner = "", repo = ""] = repository.fullName.split("/");
    void run(async signal => { const value = await github.assets(token, projectId, owner, repo, selected.releaseId, page, signal);
      if (!signal.aborted) { setRelease(selected); setAssets(value); resetSelection(); } });
  }
  function preview(asset: github.GitHubAsset) {
    if (!repository || !release) return;
    const [owner = "", repo = ""] = repository.fullName.split("/");
    void run(async signal => { const value = await github.selection(token, projectId, owner, repo, release.releaseId, asset.assetId, signal);
      if (!signal.aborted) { setSelection(value); setRights(false); requestId.current = null; } });
  }
  function submit() {
    if (!selection || !rights) return;
    requestId.current ??= crypto.randomUUID(); setAttempted(true);
    void run(async signal => { const result = await github.submit(token, projectId, releaseId, requestId.current!, selection, signal);
      if (!signal.aborted) { setSubmitted(result); changed(); } });
  }
  if (submitted) return <Notice kind="success">GitHub import queued. Follow its progress in your upload history. Validation and review are still required.</Notice>;
  const locked = busy || attempted;
  return (
    <Stack>
      <Text>Choose an uploaded ZIP asset from a public release. Source archives and repository build scripts are not imported.</Text>
      {available === false ? <Notice kind="info">GitHub imports are currently paused. You can upload a ZIP directly.</Notice> : null}
      {available === null && !error ? <Pending label="Checking import availability" /> : null}
      {error ? <Notice kind="danger">{error}{attempted && " Your submission may already exist. Retry the same submission or refresh upload history before choosing another file."}</Notice> : null}
      {available === null && error ? (
        <div>
          <Button lines="none" color="neutral" border size="sm" disabled={busy} onClick={() => void run(async signal => setAvailable((await github.capabilities(signal)).features?.githubImports === true))}>
            Retry availability check
          </Button>
        </div>
      ) : null}
      {available ? (
        <>
          <form onSubmit={loadRepository} className={styles.repo}>
            <FieldGrid>
              <Field label="GitHub owner">
                <Input icon={githubGlyph} required maxLength={39} value={owner} disabled={locked} onChange={event => setOwner(event.target.value)} />
              </Field>
              <Field label="Repository">
                <Input required maxLength={100} value={repo} disabled={locked} onChange={event => setRepo(event.target.value)} />
              </Field>
            </FieldGrid>
            <div>
              <Button type="submit" lines="none" color="neutral" border size="sm" icon={search01} iconPosition="left" disabled={locked}>
                Find public releases
              </Button>
            </div>
          </form>
          {repository ? (
            <>
              <Text>Browsing <strong>{repository.fullName}</strong></Text>
              <GitHubConnectionControl key={`${session.token}:${repository.repositoryId}`} session={session} projectId={projectId} repository={repository} />
            </>
          ) : null}
          {releases ? (
            <div className={styles.step}>
              <Subhead as="h5">Choose a release</Subhead>
              {releases.items.length === 0 ? <Fine>No public releases on this page. Upload a ZIP directly if the repository has no release assets.</Fine> : null}
              <Actions className={styles.choices}>
                {releases.items.map(item => (
                  <Button key={item.releaseId} lines="none" border size="sm" color={release?.releaseId === item.releaseId ? "yellow" : "neutral"} disabled={locked}
                    aria-pressed={release?.releaseId === item.releaseId} onClick={() => assetPage(item, 1)}>
                    {`${item.tag}${item.prerelease ? " · prerelease" : ""}`}
                  </Button>
                ))}
              </Actions>
              <Actions>
                <Button lines="none" color="neutral" size="sm" disabled={locked} onClick={() => releasePage(1)}>First release page</Button>
                {releases.nextPage ? <Button lines="none" color="neutral" size="sm" disabled={locked} onClick={() => releasePage(releases.nextPage!)}>More releases</Button> : null}
              </Actions>
            </div>
          ) : null}
          {assets && release ? (
            <div className={styles.step}>
              <Subhead as="h5">ZIP assets for {release.tag}</Subhead>
              {assets.items.length === 0 ? <Fine>No uploaded assets on this page.</Fine> : null}
              <ul className={styles.assets}>
                {assets.items.map(asset => (
                  <li key={asset.assetId}>
                    <Button lines="none" color="neutral" border size="sm" disabled={locked || !eligible(asset)} onClick={() => preview(asset)}>
                      {`${asset.name} · ${size(asset.sizeBytes)}`}
                    </Button>
                    {!eligible(asset) ? <small> Requires a ZIP up to 100 MiB with a GitHub SHA-256 digest. Older assets can be uploaded directly.</small> : null}
                  </li>
                ))}
              </ul>
              <Actions>
                <Button lines="none" color="neutral" size="sm" disabled={locked} onClick={() => assetPage(release, 1)}>First asset page</Button>
                {assets.nextPage ? <Button lines="none" color="neutral" size="sm" disabled={locked} onClick={() => assetPage(release, assets.nextPage!)}>More assets</Button> : null}
              </Actions>
            </div>
          ) : null}
          {selection ? (
            <div className={styles.step}>
              <Subhead as="h5">Confirm this source</Subhead>
              <Provenance selection={selection} />
              <Checkbox checked={rights} disabled={locked} onChange={event => setRights(event.target.checked)}>
                I have permission to redistribute this asset and all its included files under this release’s license.
              </Checkbox>
              <Actions>
                <Button key={busy ? "busy" : attempted ? "retry" : "import"} lines="none" size="sm" busy={busy} disabled={!rights} onClick={submit}>
                  {busy ? "Submitting…" : attempted ? "Retry the same submission" : "Import ZIP for validation"}
                </Button>
                {attempted && !busy ? <Button lines="none" color="neutral" border size="sm" onClick={() => { changed(); }}>Refresh upload history</Button> : null}
              </Actions>
            </div>
          ) : null}
          {busy ? <Pending label="Contacting GitHub" /> : null}
        </>
      ) : null}
    </Stack>
  );
}
