"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";

import { Button } from "@/components/ui/button";
import { Notice } from "@/components/ui/feedback";
import { Field, Input } from "@/components/ui/field";
import { arrowLeft01, arrowRight01, refresh as refreshGlyph, upload02 } from "@/components/ui/icons";
import { Eyebrow } from "@/components/ui/typography";
import * as api from "@/lib/community/client-api";
import { transferUpload } from "@/lib/community/upload";
import type { CommunityContent, CommunityPage, CommunityUploadItem } from "@/lib/community/types";
import { Actions, Block, FileInput, Pager, Pending, Progress, StateTag } from "@/components/account/kit";
import { Card, CardGrid, Meta, Name, Stack, Subhead, Text } from "./creator-parts";
import { PrivateMediaPreview } from "./private-media-preview";

import styles from "./creator-media.module.css";

type References = NonNullable<CommunityContent["media"]>;
export function CreatorMedia({ token, projectId, media, onChange }: {
  token: string; projectId: string | null; media: References; onChange: (value: References) => void;
}) {
  const avatar = projectId === null;
  const [history, setHistory] = useState<CommunityPage<CommunityUploadItem> | null>(null);
  const [cursor, setCursor] = useState<string>();
  const [refresh, setRefresh] = useState(0);
  const [error, setError] = useState("");
  const [historyError, setHistoryError] = useState("");
  const [notice, setNotice] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState(0);
  const [restart, setRestart] = useState<CommunityUploadItem | null>(null);
  const operation = useRef<AbortController | null>(null);
  useEffect(() => () => operation.current?.abort(), []);
  useEffect(() => {
    if (!busy) return;
    const warn = (event: BeforeUnloadEvent) => event.preventDefault();
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [busy]);
  useEffect(() => {
    const controller = new AbortController();
    let timer: ReturnType<typeof setTimeout> | undefined;
    let count = 0;
    async function load() {
      try {
        const signal = AbortSignal.any([controller.signal, AbortSignal.timeout(10000)]);
        const result = await (projectId === null ? api.myAvatarUploads(token, cursor, signal) : api.myUploads(token, projectId, cursor, signal));
        if (controller.signal.aborted) return;
        setHistory(result); setHistoryError("");
        if (result.items.some(item => item.upload.kind === "image" && ["processing", "receiving"].includes(item.upload.state))) {
          if (count++ < 20) timer = setTimeout(load, Math.min(30000, 3000 * 1.3 ** count));
          else setNotice("Automatic image checks paused. Refresh to check again.");
        }
      } catch (error) { if (!controller.signal.aborted) setHistoryError(error instanceof Error ? error.message : "Image history could not be loaded."); }
    }
    void load();
    return () => { controller.abort(); clearTimeout(timer); };
  }, [token, projectId, cursor, refresh]);
  function reload() { setRefresh(value => value + 1); }
  async function upload(event: FormEvent) {
    event.preventDefault(); if (busy) return;
    const finalizeOnly = restart?.upload.state === "uploaded";
    if (!finalizeOnly && (!file || !file.size || file.size > 10 * 1024 * 1024 || !/\.(jpe?g|png|webp)$/i.test(file.name))) {
      setError("Choose a JPEG, PNG or WebP image up to 10 MiB."); return;
    }
    if (!finalizeOnly && restart && file && (restart.originalName !== file.name || file.size > restart.upload.maximumBytes)) {
      setError("Select the original filename within its reserved size to restart."); return;
    }
    const controller = new AbortController(); operation.current = controller;
    setBusy(true); setError(""); setNotice("Uploading image…"); setProgress(0);
    try {
      let id = restart?.upload.uploadId;
      if (!finalizeOnly && file) {
        const grant = restart ? await api.restartUpload(token, restart.upload.uploadId, controller.signal) :
          await (projectId === null ? api.reserveAvatarUpload(token, file, controller.signal) : api.reserveUpload(token, projectId, null, "image", file, controller.signal));
        id = grant.uploadId;
        await transferUpload(grant, file, controller.signal, setProgress);
      }
      if (!id) throw new Error("No image upload was reserved.");
      await api.completeUpload(token, id, controller.signal);
      setNotice(avatar ? "Avatar queued for processing. Select it below when processing finishes, then save your public profile." : "Image queued for processing. Attach it below when processing finishes, then save your draft.");
      setFile(null); setRestart(null); setCursor(undefined);
    } catch (error) {
      setNotice(""); setError(controller.signal.aborted ? "Transfer stopped. Refresh upload history before restarting." : error instanceof Error ? error.message : "Image upload failed.");
    } finally { operation.current = null; setBusy(false); reload(); }
  }
  function move(index: number, direction: number) {
    const current = media[index], target = media[index + direction];
    if (!current || !target) return;
    const next = [...media]; next[index] = target; next[index + direction] = current; onChange(next);
  }
  const images = history?.items.filter(item => item.upload.kind === "image") ?? [];
  return (
    <Block
      eyebrow={avatar ? "Your creator identity" : "Show your creation"}
      title={avatar ? "Profile avatar" : "Cover and screenshots"}
      headingLevel={avatar ? 2 : 3}
      lead={avatar ? "Upload an image, select it after processing, then save your public profile to make it visible. Use an image you have permission to share." : "The first image is your cover. Add up to eight more screenshots, describe each image, and save your draft. New images become public after review."}
      actions={
        <Button lines="none" color="neutral" border size="sm" icon={refreshGlyph} iconPosition="left" onClick={reload}>
          Refresh images
        </Button>
      }
    >
      <Stack>
        {error ? <Notice kind="danger">{error}</Notice> : null}
        {historyError ? <Notice kind="danger">{historyError}</Notice> : null}
        {notice ? <Notice kind="info">{notice}</Notice> : null}

        {media.length ? (
          <CardGrid className={avatar ? styles.avatarGrid : undefined}>
            {media.map((reference, index) => (
              <Card key={reference.mediaId} selected={index === 0}>
                <Eyebrow muted={index !== 0}>{avatar ? "Selected avatar" : index === 0 ? "Cover" : `Screenshot ${index}`}</Eyebrow>
                <PrivateMediaPreview token={token} mediaId={reference.mediaId} alt={reference.altText} />
                {!avatar ? (
                  <>
                    <Field label="Image description">
                      <Input required maxLength={500} value={reference.altText} onChange={event => onChange(media.map((item, i) => i === index ? { ...item, altText: event.target.value } : item))} />
                    </Field>
                    <Field label="Caption" optional>
                      <Input maxLength={1000} value={reference.caption ?? ""} onChange={event => onChange(media.map((item, i) => i === index ? { ...item, caption: event.target.value } : item))} />
                    </Field>
                  </>
                ) : null}
                <Actions className={styles.cardActions}>
                  {!avatar ? (
                    <>
                      <Button lines="none" color="neutral" border size="sm" iconOnly icon={arrowLeft01} aria-label="Move earlier" title="Move earlier" disabled={index === 0} onClick={() => move(index, -1)} />
                      <Button lines="none" color="neutral" border size="sm" iconOnly icon={arrowRight01} aria-label="Move later" title="Move later" disabled={index === media.length - 1} onClick={() => move(index, 1)} />
                    </>
                  ) : null}
                  <Button lines="none" color="neutral" border size="sm" onClick={() => onChange(media.filter((_, i) => i !== index))}>
                    {avatar ? "Remove avatar selection" : "Remove from draft"}
                  </Button>
                </Actions>
              </Card>
            ))}
          </CardGrid>
        ) : null}

        <form className={styles.upload} onSubmit={upload}>
          {restart ? <Text role="status">Recovering {restart.originalName}</Text> : null}
          {restart?.upload.state !== "uploaded" ? (
            <Field label={avatar ? "Upload an avatar" : "Upload a screenshot"} hint="JPEG, PNG or WebP · up to 10 MiB">
              <FileInput accept="image/jpeg,image/png,image/webp" disabled={busy} onChange={event => setFile(event.target.files?.[0] ?? null)} />
            </Field>
          ) : null}
          <Actions>
            <Button key={restart ? `restart-${restart.upload.state}` : "upload"} type="submit" lines="none" size="sm" icon={upload02} iconPosition="left" busy={busy} disabled={!file && restart?.upload.state !== "uploaded"}>
              {restart?.upload.state === "uploaded" ? "Process stored image" : restart ? "Restart image upload" : "Upload image"}
            </Button>
            {busy ? (
              <Button lines="none" color="neutral" border size="sm" onClick={() => operation.current?.abort()}>
                Stop transfer
              </Button>
            ) : null}
            {restart && !busy ? (
              <Button lines="none" color="neutral" border size="sm" onClick={() => { setRestart(null); setFile(null); }}>
                Choose a new upload
              </Button>
            ) : null}
          </Actions>
          {busy ? <Progress value={progress} label="Image upload progress" /> : null}
        </form>

        <div className={styles.library}>
          <Subhead as={avatar ? "h3" : "h4"}>Your uploaded images</Subhead>
          {!history && !historyError ? <Pending label="Loading your image library" /> : null}
          {history && !images.length ? (
            <Notice kind="info">{cursor ? "No images on this upload-history page. Browse another page or return to the newest uploads." : "No images on this page yet. Upload a JPEG, PNG or WebP above to start your gallery."}</Notice>
          ) : null}
          {images.length ? (
            <CardGrid>
              {images.map(item => (
                <Card key={item.upload.uploadId} selected={media.some(reference => reference.mediaId === item.upload.mediaId)}>
                  <Name as={avatar ? "h4" : "h5"}>{item.originalName}</Name>
                  <Meta>
                    <StateTag state={item.upload.state} />
                    {item.upload.inspectionCode ? <span>{item.upload.inspectionCode.replaceAll("_", " ")}</span> : null}
                  </Meta>
                  {item.upload.state === "accepted" && item.upload.mediaId ? (
                    <div>
                      <Button lines="none" border size="sm" disabled={(!avatar && media.length >= 9) || media.some(reference => reference.mediaId === item.upload.mediaId)}
                        onClick={() => onChange(avatar ? [{ mediaId: item.upload.mediaId!, altText: "Creator avatar" }] : [...media, { mediaId: item.upload.mediaId!, altText: "", caption: "" }])}>
                        {avatar ? "Select avatar" : "Attach to draft"}
                      </Button>
                    </div>
                  ) : null}
                  {["pending", "uploaded"].includes(item.upload.state) ? (
                    <div>
                      <Button lines="none" color="neutral" border size="sm" disabled={busy} onClick={() => {
                        if (Date.parse(item.upload.expiresAtUtc) <= Date.now()) { setError("This reservation expired. Start a new image upload."); return; }
                        setRestart(item); setFile(null); setError(""); setNotice("Use the upload form above to recover this image.");
                      }}>
                        Recover upload
                      </Button>
                    </div>
                  ) : null}
                </Card>
              ))}
            </CardGrid>
          ) : null}
          <Pager label="Image upload pages">
            {cursor ? (
              <Button lines="none" color="neutral" border size="sm" onClick={() => setCursor(undefined)}>
                Newest uploads
              </Button>
            ) : null}
            {history?.nextCursor ? (
              <Button lines="none" color="neutral" border size="sm" onClick={() => setCursor(history.nextCursor ?? undefined)}>
                Older uploads
              </Button>
            ) : null}
          </Pager>
        </div>
      </Stack>
    </Block>
  );
}
