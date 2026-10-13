"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";

import { Button } from "@/components/ui/button";
import { Notice } from "@/components/ui/feedback";
import { Field } from "@/components/ui/field";
import { refresh as refreshGlyph, upload02 } from "@/components/ui/icons";
import { Eyebrow } from "@/components/ui/typography";
import * as api from "@/lib/community/client-api";
import { transferUpload } from "@/lib/community/upload";
import type { CommunityPage, CommunityUploadItem } from "@/lib/community/types";
import { Actions, Block, FileInput, Progress, StateTag } from "@/components/account/kit";
import { Card, CardGrid, Meta, Name, Stack } from "./creator-parts";
import { PrivateMediaPreview } from "./private-media-preview";

import styles from "./creator-clip.module.css";

const CLIP_BYTES = 8 * 1024 * 1024;

/**
 * The optional hover clip: one short muted video per creation, shown when
 * someone rests the pointer on its card. Upload, wait for processing, pick it.
 */
export function CreatorClip({ token, projectId, clipMediaId, onChange }: {
  token: string; projectId: string; clipMediaId: string | null | undefined; onChange: (value: string | null) => void;
}) {
  const [history, setHistory] = useState<CommunityPage<CommunityUploadItem> | null>(null);
  const [refresh, setRefresh] = useState(0);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState(0);
  const [disabled, setDisabled] = useState(false);
  const operation = useRef<AbortController | null>(null);
  useEffect(() => () => operation.current?.abort(), []);
  useEffect(() => {
    const controller = new AbortController();
    let timer: ReturnType<typeof setTimeout> | undefined;
    let count = 0;
    async function load() {
      try {
        const result = await api.myUploads(token, projectId, undefined, AbortSignal.any([controller.signal, AbortSignal.timeout(10000)]));
        if (controller.signal.aborted) return;
        setHistory(result);
        if (result.items.some(item => item.upload.kind === "clip" && ["processing", "receiving"].includes(item.upload.state)) && count++ < 20)
          timer = setTimeout(load, Math.min(30000, 3000 * 1.3 ** count));
      } catch (error) { if (!controller.signal.aborted) setError(error instanceof Error ? error.message : "Upload history could not be loaded."); }
    }
    void load();
    return () => { controller.abort(); clearTimeout(timer); };
  }, [token, projectId, refresh]);
  async function upload(event: FormEvent) {
    event.preventDefault();
    if (busy || !file) return;
    if (!file.size || file.size > CLIP_BYTES || !/\.(webm|mp4|gif)$/i.test(file.name)) { setError("Choose a WebM, MP4 or GIF up to 8 MiB and 8 seconds."); return; }
    const controller = new AbortController(); operation.current = controller;
    setBusy(true); setError(""); setNotice("Uploading clip…"); setProgress(0);
    try {
      const grant = await api.reserveUpload(token, projectId, null, "clip", file, controller.signal);
      await transferUpload(grant, file, controller.signal, setProgress);
      await api.completeUpload(token, grant.uploadId, controller.signal);
      setNotice("Clip queued for processing. It is re-encoded muted at up to 640 pixels; pick it below when processing finishes, then save your draft.");
      setFile(null);
    } catch (failure) {
      setNotice("");
      const message = failure instanceof Error ? failure.message : "Clip upload failed.";
      if (failure instanceof Error && "code" in failure && failure.code === "clips_disabled") setDisabled(true);
      setError(controller.signal.aborted ? "Transfer stopped." : message);
    } finally { operation.current = null; setBusy(false); setRefresh(value => value + 1); }
  }
  const clips = history?.items.filter(item => item.upload.kind === "clip") ?? [];
  return (
    <Block
      eyebrow="Motion preview"
      title="Hover clip"
      headingLevel={3}
      lead="One short clip, up to 8 seconds and 8 MiB (WebM, MP4 or GIF), plays muted when someone hovers your creation in the library. Sound, subtitles and metadata are dropped during processing. Keep a cover image too: it is the poster everywhere else."
      actions={
        <Button lines="none" color="neutral" border size="sm" icon={refreshGlyph} iconPosition="left" onClick={() => setRefresh(value => value + 1)}>
          Refresh clips
        </Button>
      }
    >
      <Stack>
        {disabled ? <Notice kind="warning">Hover clips are not enabled on this workshop yet.</Notice> : null}
        {error ? <Notice kind="danger">{error}</Notice> : null}
        {notice ? <Notice kind="info">{notice}</Notice> : null}
        <div className={styles.layout}>
          {clipMediaId ? (
            <Card selected className={styles.selected}>
              <Eyebrow>Selected clip</Eyebrow>
              <PrivateMediaPreview token={token} mediaId={clipMediaId} alt="Hover clip" variant="clip" />
              <div>
                <Button lines="none" color="neutral" border size="sm" onClick={() => onChange(null)}>
                  Remove clip from draft
                </Button>
              </div>
            </Card>
          ) : null}
          {!disabled ? (
            <form className={styles.upload} onSubmit={upload}>
              <Field label="Upload a clip" hint="WebM, MP4 or GIF · up to 8 MiB · up to 8 seconds">
                <FileInput accept="video/webm,video/mp4,image/gif,.webm,.mp4,.gif" disabled={busy} onChange={event => setFile(event.target.files?.[0] ?? null)} />
              </Field>
              <Actions>
                <Button type="submit" lines="none" size="sm" icon={upload02} iconPosition="left" disabled={busy || !file} busy={busy}>
                  Upload clip
                </Button>
                {busy ? (
                  <Button lines="none" color="neutral" border size="sm" onClick={() => operation.current?.abort()}>
                    Stop transfer
                  </Button>
                ) : null}
              </Actions>
              {busy ? <Progress value={progress} label="Clip upload progress" /> : null}
            </form>
          ) : null}
        </div>
        {clips.length > 0 ? (
          <CardGrid>
            {clips.map(item => (
              <Card key={item.upload.uploadId} selected={clipMediaId === item.upload.mediaId}>
                <Name>{item.originalName}</Name>
                <Meta>
                  <StateTag state={item.upload.state} />
                  {item.upload.inspectionCode ? <span>{item.upload.inspectionCode.replaceAll("_", " ")}</span> : null}
                </Meta>
                {item.upload.state === "accepted" && item.upload.mediaId ? (
                  <div>
                    <Button key={clipMediaId === item.upload.mediaId ? "selected" : "pick"} lines="none" color={clipMediaId === item.upload.mediaId ? "neutral" : "yellow"} border size="sm" disabled={clipMediaId === item.upload.mediaId} onClick={() => onChange(item.upload.mediaId!)}>
                      {clipMediaId === item.upload.mediaId ? "Selected" : "Use as hover clip"}
                    </Button>
                  </div>
                ) : null}
              </Card>
            ))}
          </CardGrid>
        ) : null}
      </Stack>
    </Block>
  );
}
