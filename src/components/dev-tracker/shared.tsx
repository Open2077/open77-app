"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCallback, useEffect, useState, type ReactNode } from "react";

import { Button } from "@/components/ui/button";
import { Tag } from "@/components/ui/chip";
import { Loader, Notice } from "@/components/ui/feedback";
import { Icon } from "@/components/ui/icon";
import { add01, arrowDown01, arrowLeft02, arrowUp01, login03 } from "@/components/ui/icons";
import { Page, PageHero } from "@/components/ui/page";
import { Tabs } from "@/components/ui/tabs";
import { useSession } from "@/lib/account/session";
import * as api from "@/lib/dev-tracker/api";
import { canVote, message, stateLabel, type Idea } from "@/lib/dev-tracker/types";

import styles from "./tracker.module.css";

const TABS = [
  { href: "/dev-tracker", label: "Community ideas" },
  { href: "/dev-tracker/approved", label: "Validated ideas" },
  { href: "/dev-tracker/roadmap", label: "Development board" },
  { href: "/dev-tracker/mine", label: "My ideas" },
];
const LISTS = new Set(TABS.map((tab) => tab.href));

const STEPS = [
  { title: "Propose", text: "Any verified account can suggest an idea." },
  { title: "Discuss & vote", text: "The community weighs in, in the open." },
  { title: "Validate & ship", text: "Staff move it across the board." },
];

export function TrackerShell({ children }: { children: ReactNode }) {
  const path = usePathname();
  const list = LISTS.has(path);
  const compose = path === "/dev-tracker/new";
  return (
    <Page tone="red">
      {list ? (
        <PageHero
          size="compact"
          art={{ src: "/home/img/devs-bg.webp", position: "center 62%" }}
          watermark="Ideas"
          eyebrow="// Your ideas. Our next chapter."
          title={["Dev", "tracker."]}
          accent={[1]}
          lead="Help shape OPEN//77. Share what matters, talk it through, and follow the work from first idea to release."
          actions={
            <>
              <Button color="red" lines="left" icon={add01} iconPosition="left" href="/dev-tracker/new">
                Suggest an idea
              </Button>
              <Button color="red" border lines="none" href="/dev-tracker/roadmap">
                Development board
              </Button>
            </>
          }
          aside={
            <ol className={styles.pipeline} aria-label="How an idea moves">
              {STEPS.map((step, index) => (
                <li key={step.title}>
                  <span className={styles.pipelineIndex}>{String(index + 1).padStart(2, "0")}</span>
                  <strong>{step.title}</strong>
                  <small>{step.text}</small>
                </li>
              ))}
            </ol>
          }
        />
      ) : (
        <div className={styles.topbar}>
          <p className={styles.crumbs}>
            <Link href="/dev-tracker" className={styles.back}>
              <Icon glyph={arrowLeft02} />
              Dev Tracker
            </Link>
            <span className={styles.separator} aria-hidden="true">
              {"//"}
            </span>
            <span aria-current="page">{compose ? "Suggest an idea" : "Community idea"}</span>
          </p>
        </div>
      )}
      <div className={styles.shell}>
        <Tabs label="Dev Tracker" exact items={TABS} className={styles.tabs} />
        {children}
        <p className={styles.footerNote}>
          <span className={styles.prompt} aria-hidden="true">
            {"//"}
          </span>
          Community proposals and staff-maintained development progress. Votes help us understand demand; validation is not a delivery-date promise. Bug reports belong in{" "}
          <Link href="/docs/launcher">launcher diagnostics</Link>.
        </p>
      </div>
    </Page>
  );
}

/** Development states carry their own colour: validated/planned/shipped cyan, building red, testing yellow. */
const STATE_TAG: Record<string, { tone: "blue" | "yellow" | "red" | "neutral"; solid?: boolean }> = {
  proposed: { tone: "neutral" },
  approved: { tone: "blue" },
  planned: { tone: "blue" },
  in_progress: { tone: "red" },
  testing: { tone: "yellow" },
  shipped: { tone: "blue", solid: true },
  declined: { tone: "neutral" },
  withdrawn: { tone: "neutral" },
};

export function Badge({ state }: { state: string }) {
  const tag = STATE_TAG[state] ?? { tone: "neutral" as const };
  return (
    <Tag tone={tag.tone} variant={tag.solid ? "solid" : "outline"} className={styles.badge}>
      {stateLabel(state)}
    </Tag>
  );
}

export function ErrorNotice({ error, retry }: { error: string; retry?: () => void }) {
  if (!error) return null;
  return (
    <Notice
      kind="danger"
      className={styles.notice}
      action={
        retry ? (
          <Button size="sm" color="red" border lines="none" onClick={retry}>
            Retry / refresh
          </Button>
        ) : null
      }
    >
      <span className={styles.errorText}>{error}</span>
    </Notice>
  );
}

/** Pending state, in the terminal voice: `// IDEAS.FEED loading...`. */
export function Busy({ label = "DEV.TRACKER" }: { label?: string }) {
  return (
    <div className={styles.busy}>
      <Loader label={label} />
    </div>
  );
}

export function SignInNote() {
  return (
    <Notice
      kind="info"
      className={styles.notice}
      title="Everyone can browse."
      action={
        <Button size="sm" color="red" border lines="none" icon={login03} iconPosition="left" href="/account">
          Sign in
        </Button>
      }
    >
      <Link href="/account">Sign in with a verified account</Link> to propose ideas, vote or join the discussion.
    </Notice>
  );
}

/** Abort old reads and never briefly show another account's private view on a session switch. */
export function useTrackerRead<T>(key: string, load: (signal: AbortSignal) => Promise<T>, enabled = true) {
  const [result, setResult] = useState<{ key: string; data?: T; error?: string }>({ key: "" });
  const [version, setVersion] = useState(0);
  const reload = useCallback(() => setVersion((value) => value + 1), []);
  const requestKey = `${key}:${version}`;
  useEffect(() => {
    if (!enabled) return;
    const controller = new AbortController();
    load(AbortSignal.any([controller.signal, AbortSignal.timeout(12000)]))
      .then((data) => {
        if (!controller.signal.aborted) setResult({ key: requestKey, data });
      })
      .catch((error) => {
        if (!controller.signal.aborted) setResult({ key: requestKey, error: message(error) });
      });
    return () => controller.abort();
  }, [requestKey, load, enabled]);
  return {
    data: enabled && result.key === requestKey ? result.data : undefined,
    error: enabled && result.key === requestKey ? (result.error ?? "") : "",
    loading: enabled && result.key !== requestKey,
    reload,
  };
}

export function VoteBox({ idea, onChanged, size = "md" }: { idea: Idea; onChanged?: (idea: Idea) => void; size?: "md" | "lg" }) {
  const { session } = useSession();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const allowed = !!session?.emailVerified && canVote(idea, session.accountId);
  const score = idea.upvotes - idea.downvotes;
  async function choose(value: number) {
    if (!session || busy) return;
    setBusy(true);
    setError("");
    try {
      onChanged?.(await api.vote(session.token, idea.id, idea.myVote === value ? 0 : value));
    } catch (error) {
      setError(message(error));
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className={styles.voteWrap} data-size={size}>
      <div className={styles.vote} aria-label="Community votes" role="group" data-busy={busy || undefined}>
        <button
          type="button"
          className={styles.voteButton}
          disabled={busy || (!allowed && idea.myVote !== 1)}
          aria-label="Upvote"
          aria-pressed={idea.myVote === 1}
          onClick={() => void choose(1)}
        >
          <Icon glyph={arrowUp01} />
        </button>
        <strong className={styles.score} data-sign={score > 0 ? "up" : score < 0 ? "down" : undefined} title={`${idea.upvotes} upvotes · ${idea.downvotes} downvotes`}>
          {score}
        </strong>
        <button
          type="button"
          className={styles.voteButton}
          disabled={busy || (!allowed && idea.myVote !== -1)}
          aria-label="Downvote"
          aria-pressed={idea.myVote === -1}
          onClick={() => void choose(-1)}
        >
          <Icon glyph={arrowDown01} />
        </button>
      </div>
      {error ? (
        <p className={styles.voteError} role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}
