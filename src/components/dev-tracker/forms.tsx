"use client";

import { useRouter } from "next/navigation";
import { useCallback, useRef, useState, type FormEvent } from "react";

import { Button } from "@/components/ui/button";
import { Meter } from "@/components/ui/feedback";
import { Checkbox, Field, Input, Select, Textarea } from "@/components/ui/field";
import { sent } from "@/components/ui/icons";
import { Panel } from "@/components/ui/panel";
import { SmartLink } from "@/components/ui/smart-link";
import { Display, Eyebrow } from "@/components/ui/typography";
import { useSession } from "@/lib/account/session";
import * as api from "@/lib/dev-tracker/api";
import { categories, dateTime, message, reviewStates, type Idea } from "@/lib/dev-tracker/types";
import { Busy, ErrorNotice, SignInNote, useTrackerRead } from "./shared";

import styles from "./discussion.module.css";

export function useRequestId() {
  const current = useRef<{ payload: string; id: string } | null>(null);
  const requestId = (body: unknown) => {
    const payload = JSON.stringify(body);
    if (current.current?.payload !== payload) current.current = { payload, id: crypto.randomUUID() };
    return current.current.id;
  };
  return { requestId, reset: () => { current.current = null; } };
}

const TITLE = { min: 8, max: 120 };
const BODY = { min: 30, max: 8000 };
const count = (value: number) => value.toLocaleString("en-GB");

/** Client-side validation messages; the Master validates again on submit. */
function titleError(title: string) {
  const length = title.trim().length;
  if (!length) return "Give your idea a title.";
  if (length < TITLE.min) return `Use at least ${TITLE.min} characters (${length} so far).`;
  return "";
}
function bodyError(body: string) {
  const length = body.trim().length;
  if (!length) return "Describe the problem and your suggestion.";
  if (length < BODY.min) return `Use at least ${BODY.min} characters (${length} so far).`;
  return "";
}

const GUIDE = [
  { title: "Check for an existing idea.", text: "Join its discussion and vote instead of splitting the conversation.", link: { href: "/dev-tracker", label: "Browse community ideas" } },
  { title: "Explain the problem.", text: "Who does it affect? What happens today, and what should happen instead?" },
  { title: "Keep it focused.", text: "One idea per proposal. No secrets, account information, harassment or spam." },
];

export function NewIdea() {
  const { session, ready } = useSession();
  return (
    <section className={styles.compose}>
      <Panel brackets padding="lg" className={styles.composePanel}>
        <Eyebrow>{"// Start a conversation"}</Eyebrow>
        <Display as="h1" size="md">
          What would make OPEN//77 better?
        </Display>
        {!ready ? <Busy label="SESSION" /> : !session?.emailVerified ? <SignInNote /> : <CreateForm key={session.accountId} token={session.token} />}
      </Panel>
      <aside className={styles.guide} aria-labelledby="guide-title">
        <Display as="h2" size="sm" id="guide-title">
          A great idea starts with a real need.
        </Display>
        <ol className={styles.guideSteps}>
          {GUIDE.map((step, index) => (
            <li key={step.title}>
              <span className={styles.guideIndex}>{String(index + 1).padStart(2, "0")}</span>
              <div>
                <strong>{step.title}</strong>
                <p>{step.text}</p>
                {step.link ? (
                  <SmartLink href={step.link.href} className={styles.textLink} glitch>
                    {step.link.label}
                  </SmartLink>
                ) : null}
              </div>
            </li>
          ))}
        </ol>
        <p className={styles.guideNote}>Ideas are public immediately, labelled “Community review”. Staff validation moves an idea onto the development board.</p>
      </aside>
    </section>
  );
}

function CreateForm({ token }: { token: string }) {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [category, setCategory] = useState("quality_of_life");
  const [touched, setTouched] = useState({ title: false, body: false });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const { requestId } = useRequestId();
  const loadQuota = useCallback((signal: AbortSignal) => api.quota(token, signal), [token]);
  const quota = useTrackerRead(token, loadQuota);
  const errors = { title: touched.title ? titleError(title) : "", body: touched.body ? bodyError(body) : "" };
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;
    setTouched({ title: true, body: true });
    if (titleError(title) || bodyError(body)) {
      // Inline messages replace the browser bubbles; move focus to the first problem.
      event.currentTarget.querySelector<HTMLElement>(titleError(title) ? "input[name=title]" : "textarea[name=body]")?.focus();
      return;
    }
    setBusy(true);
    setError("");
    const payload = { title: title.trim(), body: body.trim(), category };
    try {
      const idea = await api.create(token, { ...payload, requestId: requestId(payload) });
      router.push(`/dev-tracker/${idea.id}`);
    } catch (error) {
      setError(message(error));
      quota.reload();
      setBusy(false);
    }
  }
  return (
    <form className={styles.form} onSubmit={submit} noValidate>
      {quota.loading ? <Busy label="ALLOWANCE" /> : null}
      <ErrorNotice error={quota.error} retry={quota.reload} />
      {quota.data ? (
        <div className={styles.allowance}>
          <p className={styles.allowanceHead}>
            <strong>
              {quota.data.remaining} / {quota.data.ideasPerWeek} ideas available
            </strong>
            <span>Rolling 7-day allowance · {quota.data.ideaCooldownMinutes} min between ideas</span>
          </p>
          <Meter value={quota.data.ideasPerWeek ? (quota.data.remaining / quota.data.ideasPerWeek) * 100 : 0} label={`${quota.data.remaining} of ${quota.data.ideasPerWeek} ideas available this week`} />
          {quota.data.nextSubmissionAtUtc ? (
            <p className={styles.allowanceNext}>
              Next submission: <b>{dateTime(quota.data.nextSubmissionAtUtc)}</b>. The server checks eligibility again when you submit.
            </p>
          ) : null}
        </div>
      ) : null}
      <Field label="Title" hint={`A short, specific summary · ${title.trim().length} / ${TITLE.max}`} error={errors.title}>
        <Input
          name="title"
          required
          minLength={TITLE.min}
          maxLength={TITLE.max}
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          onBlur={() => setTouched((value) => ({ ...value, title: true }))}
          placeholder="Shared taxi destinations for passengers"
        />
      </Field>
      <Field label="Category">
        <Select value={category} onChange={(event) => setCategory(event.target.value)}>
          {categories.map(([id, label]) => (
            <option value={id} key={id}>
              {label}
            </option>
          ))}
        </Select>
      </Field>
      <Field label="Your proposal" hint={`The problem, your suggestion, an example · ${count(body.length)} / ${count(BODY.max)}`} error={errors.body}>
        <Textarea
          name="body"
          required
          minLength={BODY.min}
          maxLength={BODY.max}
          rows={10}
          value={body}
          onChange={(event) => setBody(event.target.value)}
          onBlur={() => setTouched((value) => ({ ...value, body: true }))}
          placeholder={"The problem\n\nYour suggested improvement\n\nAn example of how it would help players or developers"}
        />
      </Field>
      <ErrorNotice error={error} />
      <div className={`${styles.actions} ${styles.actionsPrimary}`}>
        <Button type="submit" color="red" lines="left" icon={sent} iconPosition="left" busy={busy} disabled={!quota.data}>
          Publish idea
        </Button>
        <Button color="neutral" border lines="none" href="/dev-tracker">
          Cancel
        </Button>
      </div>
      <p className={styles.fineprint}>Your account name and proposal will be public. Retrying the same submission will not create a duplicate.</p>
    </form>
  );
}

export function StaffReview({ idea, token, updated }: { idea: Idea; token: string; updated: () => Promise<void> }) {
  const [state, setState] = useState(idea.state);
  const [hidden, setHidden] = useState(idea.hidden);
  const [locked, setLocked] = useState(idea.locked);
  const [note, setNote] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  async function submit(event: FormEvent) {
    event.preventDefault();
    if (busy) return;
    setBusy(true);
    setError("");
    try {
      await api.review(token, idea, { state, hidden, locked, message: note.trim() });
      setNote("");
      await updated();
    } catch (error) {
      setError(message(error));
    } finally {
      setBusy(false);
    }
  }
  return (
    <details className={styles.drawer} data-kind="staff">
      <summary>
        <span className={styles.drawerLabel}>Staff controls · validation, progress & moderation</span>
        <span className={styles.toggle} aria-hidden="true" />
      </summary>
      <form className={styles.form} onSubmit={submit}>
        <Field label="Development status" hint="Approve an idea first before moving it into a delivery stage. Status changes and progress notes appear in the public timeline.">
          <Select value={state} onChange={(event) => setState(event.target.value)}>
            {reviewStates(idea.state).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Public progress update / decision" hint={`${note.trim().length} / 2,000 · at least 10 characters`}>
          <Textarea minLength={10} maxLength={2000} required value={note} rows={4} onChange={(event) => setNote(event.target.value)} placeholder="Explain the decision, next step, or what has shipped…" />
        </Field>
        <div className={styles.checks}>
          <Checkbox checked={locked} onChange={(event) => setLocked(event.target.checked)}>
            Lock discussion and new votes
          </Checkbox>
          <Checkbox checked={hidden} onChange={(event) => setHidden(event.target.checked)}>
            Hide this idea from the public (author and staff retain access)
          </Checkbox>
        </div>
        <ErrorNotice error={error} retry={() => void updated()} />
        <div className={styles.actions}>
          <Button type="submit" color="red" lines="none" busy={busy}>
            Publish staff update
          </Button>
        </div>
      </form>
    </details>
  );
}

export function OwnerEdit({ idea, token, updated }: { idea: Idea; token: string; updated: () => Promise<void> }) {
  const [title, setTitle] = useState(idea.title);
  const [body, setBody] = useState(idea.body);
  const [category, setCategory] = useState(idea.category);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  async function submit(event: FormEvent) {
    event.preventDefault();
    if (busy) return;
    setBusy(true);
    setError("");
    try {
      await api.edit(token, idea, { title, body, category });
      await updated();
    } catch (error) {
      setError(message(error));
    } finally {
      setBusy(false);
    }
  }
  return (
    <details className={styles.drawer}>
      <summary>
        <span className={styles.drawerLabel}>Edit your proposal</span>
        <span className={styles.toggle} aria-hidden="true" />
      </summary>
      <form onSubmit={submit} className={styles.form}>
        <Field label="Title" error={titleError(title)}>
          <Input required minLength={TITLE.min} maxLength={TITLE.max} value={title} onChange={(event) => setTitle(event.target.value)} />
        </Field>
        <Field label="Category">
          <Select value={category} onChange={(event) => setCategory(event.target.value)}>
            {categories.map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Description" error={bodyError(body)} hint={`${count(body.length)} / ${count(BODY.max)}`}>
          <Textarea required minLength={BODY.min} maxLength={BODY.max} rows={8} value={body} onChange={(event) => setBody(event.target.value)} />
        </Field>
        <ErrorNotice error={error} retry={() => void updated()} />
        <div className={styles.actions}>
          <Button type="submit" color="red" lines="none" busy={busy}>
            Save changes
          </Button>
        </div>
        <p className={styles.fineprint}>Once an idea receives votes or comments, add clarifications in the discussion instead of rewriting it.</p>
      </form>
    </details>
  );
}
