"use client";

import { useEffect, useState, type FormEvent } from "react";

import { Button } from "@/components/ui/button";
import { Notice } from "@/components/ui/feedback";
import { Field, Textarea } from "@/components/ui/field";
import { refresh as refreshGlyph } from "@/components/ui/icons";
import { appealStatus, submitAppeal } from "@/lib/community/client-api";
import type { CommunityAppeal } from "@/lib/community/types";
import { useSession } from "@/lib/account/session";
import { Actions, Disclosure, Fine, Pending } from "@/components/account/kit";
import { MonoBlock, Stack, Subhead, Text } from "./creator-parts";
import { useCommunityDraft } from "./use-community-draft";

import styles from "./appeal-form.module.css";

export function AppealForm({ token, decisionId }: { token: string; decisionId: string }) {
  const [open, setOpen] = useState(false);
  const [visited, setVisited] = useState(false);
  return (
    <Disclosure
      tone="framed"
      className={styles.appeal}
      summary="Appeal this decision / check your appeal"
      open={open}
      onToggle={event => { setOpen(event.currentTarget.open); if (event.currentTarget.open) setVisited(true); }}
    >
      {visited ? <AppealDetails token={token} decisionId={decisionId} /> : null}
    </Disclosure>
  );
}

function AppealDetails({ token, decisionId }: { token: string; decisionId: string }) {
  const { session } = useSession();
  const memory = useCommunityDraft(session?.token === token ? session.accountId : undefined, `appeal:${decisionId}`);
  const reason = memory.draft?.text ?? "";
  const [appeal, setAppeal] = useState<CommunityAppeal | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [refresh, setRefresh] = useState(0);
  useEffect(() => {
    const controller = new AbortController();
    appealStatus(token, decisionId, AbortSignal.any([controller.signal, AbortSignal.timeout(10000)]))
      .then(value => { if (!controller.signal.aborted) { setAppeal(value.appeal); setLoaded(true); setError(""); } })
      .catch(error => { if (!controller.signal.aborted) setError(error instanceof Error ? error.message : "Appeal status could not be loaded."); });
    return () => controller.abort();
  }, [token, decisionId, refresh]);
  async function submit(event: FormEvent) {
    event.preventDefault(); setBusy(true); setError("");
    try { setAppeal(await submitAppeal(token, decisionId, reason, AbortSignal.timeout(10000))); memory.discard(); }
    catch (error) { setError(error instanceof Error ? error.message : "Your appeal could not be submitted."); }
    finally { setBusy(false); }
  }
  return (
    <Stack>
      {error ? <Notice kind="danger">{error}</Notice> : null}
      {!loaded && !error ? <Pending label="Loading appeal status" /> : null}
      {appeal ? (
        <div role="status" className={styles.status}>
          <Subhead as="h4">{appeal.state === "open" ? "Appeal awaiting review" : "Appeal reviewed"}</Subhead>
          <Fine>Reference: {appeal.appealId}</Fine>
          <MonoBlock label="Your appeal">{appeal.reason}</MonoBlock>
          {appeal.response ? (
            <>
              <Subhead as="h4">Moderator response</Subhead>
              <MonoBlock label="Response">{appeal.response}</MonoBlock>
            </>
          ) : null}
          {memory.draft ? (
            <Disclosure summary="An unsent local draft is also retained">
              <Text>An appeal already exists for this decision. Review or copy your local text before discarding it.</Text>
              <Field label="Retained appeal draft">
                <Textarea readOnly value={reason} />
              </Field>
              <div>
                <Button lines="none" color="red" border size="sm" onClick={() => { if (window.confirm("Discard your unsent appeal draft?")) memory.discard(); }}>
                  Discard draft
                </Button>
              </div>
            </Disclosure>
          ) : null}
        </div>
      ) : loaded ? (
        <form className={styles.form} onSubmit={submit}>
          <Text>
            Explain why this decision should be reconsidered, including relevant evidence or source links. You can submit one appeal for this decision. Moderators will respond in your Workshop inbox; submitting an appeal does not change the content’s current status.
          </Text>
          <Field label="Your explanation">
            <Textarea
              required
              maxLength={5000}
              value={reason}
              onChange={event => { if (!memory.save({ text: event.target.value })) setError("This tab holds 64 unsent drafts. Submit or explicitly discard another draft first; existing drafts have been kept."); }}
              readOnly={busy || session?.token !== token}
            />
          </Field>
          {memory.draft ? (
            <p role="status" className={styles.draft}>
              Draft kept in this tab for your account across Workshop pages. Reloading or closing the tab loses it.{" "}
              <Button lines="none" color="neutral" border size="sm" disabled={busy} onClick={() => { if (window.confirm("Discard your unsent appeal?")) memory.discard(); }}>
                Discard draft
              </Button>
            </p>
          ) : null}
          <div>
            <Button key={busy ? "busy" : "idle"} type="submit" lines="none" size="sm" busy={busy} disabled={!reason.trim()}>
              {busy ? "Submitting…" : "Submit appeal"}
            </Button>
          </div>
        </form>
      ) : null}
      <Actions>
        <Button lines="none" color="neutral" border size="sm" icon={refreshGlyph} iconPosition="left" disabled={busy} onClick={() => setRefresh(value => value + 1)}>
          Refresh appeal status
        </Button>
      </Actions>
    </Stack>
  );
}
