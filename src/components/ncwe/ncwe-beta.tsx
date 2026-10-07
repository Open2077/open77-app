"use client";

import Link from "next/link";
import { type FormEvent, type ReactNode, useCallback, useEffect, useId, useRef, useState } from "react";
import { AuthPanel } from "@/components/account/auth-panel";
import { ArrowRightIcon, CheckIcon, DiscordIcon } from "@/components/icons";
import { MasterApiError } from "@/lib/account/api";
import type { FieldErrors } from "@/lib/account/field-errors";
import * as beta from "@/lib/account/ncwe-beta-api";
import type { NcweAvailability, NcweBetaApplication, NcweBetaState, NcweDiscordLookup } from "@/lib/account/ncwe-beta-api";
import { useSession } from "@/lib/account/session";
import { site } from "@/lib/site";
import styles from "./ncwe-beta.module.css";

const SNOWFLAKE = /^[0-9]{17,20}$/;
const DEFAULT_AVATAR = "https://cdn.discordapp.com/embed/avatars/0.png";

function failure(error: unknown): string {
  return error instanceof MasterApiError ? error.message : "Something went wrong. Try again.";
}

function day(iso: string | null | undefined): string | null {
  if (!iso) return null;
  const date = new Date(iso);
  return Number.isNaN(date.getTime()) ? null : date.toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" });
}

/** When a Discord account was created, read from its id. */
function snowflakeDate(id: string): string | null {
  try { return new Date(Number((BigInt(id) >> 22n) + 1420070400000n)).toISOString(); } catch { return null; }
}

function httpLink(value: string | null | undefined): string | null {
  if (!value) return null;
  try {
    const url = new URL(value);
    return url.protocol === "https:" || url.protocol === "http:" ? url.href : null;
  } catch { return null; }
}

function profileOf(application: NcweBetaApplication): NcweDiscordLookup {
  const discord = application.discord;
  return {
    userId: discord.userId, username: discord.username, displayName: discord.displayName,
    avatarUrl: discord.avatarUrl ?? DEFAULT_AVATAR, joinedServerAtUtc: discord.joinedServerAtUtc,
    accountCreatedAtUtc: snowflakeDate(discord.userId) ?? "",
  };
}

/** /ncwe: what the NCWE closed beta is, and applying to it with an OPEN//77 account. */
export function NcweBeta() {
  const { session, ready } = useSession();
  return <main id="main" className={styles.page}>
    <header className={styles.hero}>
      <div>
        <p className={styles.eyebrow}>{"// NCWE · CLOSED BETA"}</p>
        <h1>Build Night City.<em>Your way.</em></h1>
        <p className={styles.lede}><strong>NCWE</strong>, the Night City World Editor, is the OPEN//77 editor for Cyberpunk 2077 worlds.
          Move or remove the game&apos;s own objects, place props, lights and roads, and ship the result as an ArchiveXL mod or an
          OPEN//77 server world. The closed beta opens to a small group of builders first.</p>
      </div>
      <ul className={styles.features}>
        <li><i aria-hidden="true" /><strong>The real city</strong><span>Night City streams around your camera: move, hide or replace what is already there.</span></li>
        <li><i aria-hidden="true" /><strong>Your own assets</strong><span>Import FBX, glTF and OBJ models; NCWE cooks them into game meshes and textures.</span></li>
        <li><i aria-hidden="true" /><strong>Ship it</strong><span>Export an ArchiveXL mod, or a world resource your OPEN//77 server loads.</span></li>
        <li><i aria-hidden="true" /><strong>Build together</strong><span>Cloud projects and live sessions with your OPEN//77 account, plus an MCP server for AI copilots.</span></li>
      </ul>
    </header>
    <div className={styles.layout}>
      <section className={styles.panel} aria-labelledby="ncwe-apply-title">
        {!ready ? <Busy label="Loading your account…" /> : !session ? <SignIn /> : <Apply key={session.token} token={session.token} />}
      </section>
      <aside className={styles.guide}>
        <h3>How applying works.</h3>
        <ol>
          <li><strong>Sign in with your OPEN//77 account.</strong><br />The same account as the launcher, with a verified e-mail address.</li>
          <li><strong>Give us your Discord user ID.</strong><br />Our bot checks that you are on the OPEN//77 Discord and shows you the account, so you can confirm it is yours.</li>
          <li><strong>Tell us about you.</strong><br />Why you want the editor, what you would build and what you have built before.</li>
          <li><strong>The team reviews every application.</strong><br />Accepted builders get the NCWE Preview role on Discord and a welcome message tagging them.</li>
        </ol>
        <p>One application per OPEN//77 account and per Discord account. You can edit or withdraw it until it is reviewed.</p>
        {site.links.discord ? <p><a href={site.links.discord} target="_blank" rel="noopener noreferrer">Not on the Discord yet? Join the OPEN//77 server ↗</a></p> : null}
      </aside>
    </div>
  </main>;
}

function Busy({ label }: { label: string }) {
  return <div className={styles.loading} role="status"><span className={styles.spinner} aria-hidden="true" />{label}</div>;
}

function SignIn() {
  return <>
    <p className={styles.eyebrow}>STEP 1 · YOUR OPEN//77 ACCOUNT</p>
    <h2 id="ncwe-apply-title">Sign in to apply.</h2>
    <p className={styles.panelLead}>Applications are tied to your OPEN//77 platform account, the one the launcher and the editor use.
      No account yet? Create one here: it is free.</p>
    <div className={styles.signin}><AuthPanel /></div>
  </>;
}

function Apply({ token }: { token: string }) {
  const { session, clear } = useSession();
  const [state, setState] = useState<NcweBetaState | null>(null);
  const [error, setError] = useState("");
  const [version, setVersion] = useState(0);
  const [editing, setEditing] = useState(false);
  const [notice, setNotice] = useState("");
  const reload = useCallback(() => { setError(""); setVersion(value => value + 1); }, []);

  useEffect(() => {
    const controller = new AbortController();
    beta.ncweBetaState(token, AbortSignal.any([controller.signal, AbortSignal.timeout(12000)]))
      .then(next => { if (!controller.signal.aborted) { setState(next); setError(""); } })
      .catch((err: unknown) => {
        if (controller.signal.aborted) return;
        if (err instanceof MasterApiError && err.status === 401) clear();
        else setError(failure(err));
      });
    return () => controller.abort();
  }, [token, version, clear]);

  if (!state) return error
    ? <><h2 id="ncwe-apply-title">Your application.</h2><div className={styles.error} role="alert">{error}<button type="button" onClick={reload}>Try again</button></div></>
    : <Busy label="Loading your application…" />;
  const application = state.application;
  const inviteUrl = httpLink(state.discordInviteUrl) ?? site.links.discord ?? null;
  if (application && application.status !== "pending") return <Decided application={application} inviteUrl={inviteUrl} />;
  if (application && !editing) return <Pending application={application} token={token} canEdit={state.open} notice={notice}
    onEdit={() => { setNotice(""); setEditing(true); }}
    onWithdrawn={() => { setNotice(""); setState({ ...state, application: null }); }} />;
  if (!state.open) return <>
    <h2 id="ncwe-apply-title">Applications are closed.</h2>
    <p className={styles.panelLead}>The closed beta is not taking new builders right now. Follow the OPEN//77 Discord to know when it opens again.</p>
  </>;
  return <ApplyForm key={application?.revision ?? 0} token={token} state={state} initial={application} inviteUrl={inviteUrl}
    accountName={session?.displayName ?? ""}
    onCancel={application ? () => setEditing(false) : undefined}
    onSaved={saved => {
      setState({ ...state, application: saved });
      setEditing(false);
      setNotice(application ? "Your changes are saved." : "Application sent. The team reviews every application; watch the OPEN//77 Discord.");
    }} />;
}

function ApplyForm({ token, state, initial, inviteUrl, accountName, onSaved, onCancel }: {
  token: string;
  state: NcweBetaState;
  initial: NcweBetaApplication | null;
  inviteUrl: string | null;
  accountName: string;
  onSaved: (application: NcweBetaApplication) => void;
  onCancel?: () => void;
}) {
  const id = useId();
  const [discordId, setDiscordId] = useState(initial?.discord.userId ?? "");
  const [member, setMember] = useState<NcweDiscordLookup | null>(initial ? profileOf(initial) : null);
  const [confirmed, setConfirmed] = useState(!!initial);
  const [checking, setChecking] = useState(false);
  const [lookupError, setLookupError] = useState<{ code: string; message: string } | null>(null);
  const [motivation, setMotivation] = useState(initial?.motivation ?? "");
  const [plans, setPlans] = useState(initial?.plans ?? "");
  const [experience, setExperience] = useState(initial?.experience ?? "");
  const [availability, setAvailability] = useState<NcweAvailability | "">(initial?.availability ?? "");
  const [portfolio, setPortfolio] = useState(initial?.portfolioUrl ?? "");
  const [accept, setAccept] = useState(!!initial);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const discordInput = useRef<HTMLInputElement>(null);
  const blocked = !state.emailVerified || !state.discordReady;

  function changeDiscord(value: string) {
    setDiscordId(value.replace(/\s+/g, ""));
    setMember(null); setConfirmed(false); setLookupError(null);
  }

  function otherAccount() {
    setMember(null); setConfirmed(false); setLookupError(null);
    requestAnimationFrame(() => discordInput.current?.focus());
  }

  async function check() {
    const value = discordId.trim();
    if (checking) return;
    if (!SNOWFLAKE.test(value)) {
      setLookupError({ code: "invalid_discord_id", message: "A Discord user ID is a number of 17 to 20 digits, not your @username. See below how to copy it." });
      return;
    }
    setChecking(true); setLookupError(null); setMember(null); setConfirmed(false);
    try { setMember(await beta.lookupNcweDiscord(token, value)); }
    catch (err) { setLookupError({ code: err instanceof MasterApiError ? err.code : "unknown", message: failure(err) }); }
    finally { setChecking(false); }
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (busy || blocked || !confirmed || !member || !availability) return;
    setBusy(true); setError(""); setFieldErrors({});
    try {
      onSaved(await beta.submitNcweApplication(token, {
        discordUserId: member.userId, motivation, plans, experience, availability, portfolioUrl: portfolio, acceptRules: accept,
      }));
    } catch (err) {
      if (err instanceof MasterApiError && Object.keys(err.fieldErrors).length) {
        setFieldErrors(err.fieldErrors);
        const discordError = err.fieldErrors.discordUserId?.[0];
        if (discordError) { setMember(null); setConfirmed(false); setLookupError({ code: err.code, message: discordError }); }
      } else setError(failure(err));
    } finally { setBusy(false); }
  }

  const fieldError = (name: string) => fieldErrors[name]?.[0];
  return <>
    <p className={styles.eyebrow}>{initial ? "EDIT YOUR APPLICATION" : "APPLY TO THE CLOSED BETA"}</p>
    <h2 id="ncwe-apply-title">{initial ? "Update your application." : "Your application."}</h2>
    <p className={styles.panelLead}>Applying as <strong>{accountName || "your OPEN//77 account"}</strong>. The team reads every answer: be specific, there are no wrong ones.</p>
    {!state.emailVerified ? <p className={styles.notice}>Verify your e-mail address first: applications need a verified OPEN//77 account.
      Your <Link href="/account">account page</Link> can send the verification e-mail again.</p> : null}
    {!state.discordReady ? <p className={styles.error} role="alert">Discord checks are offline right now, so applications are paused. Try again a little later.</p> : null}
    <form className={styles.form} onSubmit={submit} aria-busy={busy}>
      <fieldset className={styles.fieldset} disabled={blocked || busy}>
        <div className={styles.section}>
          <h3 className={styles.stepTitle}><span>01</span>Your Discord account</h3>
          <p className={styles.hint}>You need to be on the OPEN//77 Discord: accepted builders get the beta role and channels there.</p>
          {!confirmed ? <>
            <label className={styles.field} data-invalid={!!lookupError} htmlFor={`${id}-discord`}><b>Discord user ID</b></label>
            <div className={styles.discordRow} style={{ marginTop: 8 }}>
              <input ref={discordInput} id={`${id}-discord`} value={discordId} inputMode="numeric" autoComplete="off" spellCheck={false}
                placeholder="e.g. 123456789012345678" maxLength={24} aria-invalid={!!lookupError || undefined}
                aria-describedby={lookupError ? `${id}-discord-error` : undefined}
                onChange={event => changeDiscord(event.target.value)}
                onKeyDown={event => { if (event.key === "Enter") { event.preventDefault(); void check(); } }}
                className={styles.idInput} />
              <button type="button" className={styles.secondary} onClick={() => void check()} disabled={checking || !discordId}>
                {checking ? <><span className={styles.spinner} aria-hidden="true" />Checking…</> : <><DiscordIcon size={15} />Check on Discord</>}
              </button>
            </div>
            {lookupError ? <p id={`${id}-discord-error`} className={styles.error} role="alert">{lookupError.message}
              {lookupError.code === "discord_not_member" && inviteUrl ? <> <a href={inviteUrl} target="_blank" rel="noopener noreferrer">Join the OPEN//77 Discord ↗</a></> : null}</p> : null}
            <details className={styles.help} style={{ marginTop: 12 }}>
              <summary>Where do I find my Discord user ID?</summary>
              <ol>
                <li>In Discord, open <kbd>User Settings</kbd> ▸ <kbd>Advanced</kbd> and turn on <kbd>Developer Mode</kbd>.</li>
                <li>Click your avatar at the bottom left (or right-click your name in a member list) and choose <kbd>Copy User ID</kbd>.</li>
                <li>Paste it here: it is a long number, not your @username.</li>
              </ol>
            </details>
          </> : null}
          {member ? <MemberCard member={member} confirmed={confirmed} disabled={busy}
            onConfirm={() => setConfirmed(true)} onReject={otherAccount} onChange={otherAccount} /> : null}
        </div>

        <div className={styles.section}>
          <h3 className={styles.stepTitle}><span>02</span>About you</h3>
          <p className={styles.hint}>Only the OPEN//77 team reads your answers.</p>
          <div className={styles.form}>
            <Answer id={`${id}-motivation`} label="Why do you want to use NCWE?" min={beta.NCWE_LIMITS.motivation} rows={5}
              hint="What draws you to the editor, and what you expect from it." value={motivation} onChange={setMotivation} error={fieldError("motivation")}
              placeholder="I run a roleplay server and want to build our own interiors instead of…" />
            <Answer id={`${id}-plans`} label="What would you build first?" min={beta.NCWE_LIMITS.plans} rows={4}
              hint="A place, a mod, a server world: tell us about it." value={plans} onChange={setPlans} error={fieldError("plans")}
              placeholder="A night market under the Kabuki overpass, with stalls, lights and traffic…" />
            <Answer id={`${id}-experience`} label="Your experience" min={beta.NCWE_LIMITS.experience} rows={4}
              hint="Modding, 3D, level design, other editors (WolvenKit, Blender, Unreal…). Beginners are welcome too." value={experience}
              onChange={setExperience} error={fieldError("experience")} placeholder="WolvenKit for two years, a few ArchiveXL mods on Nexus…" />
            <fieldset className={styles.choices} aria-describedby={fieldError("availability") ? `${id}-availability-error` : undefined}>
              <legend>How much time could you give the beta?</legend>
              {beta.NCWE_AVAILABILITY.map(([value, label]) => <label key={value} className={styles.choice}>
                <input type="radio" name={`${id}-availability`} value={value} checked={availability === value} required
                  onChange={() => setAvailability(value)} />{label}
              </label>)}
              {fieldError("availability") ? <span id={`${id}-availability-error`} className={styles.fieldError} role="alert">{fieldError("availability")}</span> : null}
            </fieldset>
            <label className={styles.field} data-invalid={!!fieldError("portfolioUrl")}>
              <b>Portfolio or past work <span style={{ color: "var(--text-dim)", fontWeight: 400 }}>(optional)</span></b>
              <small>A Nexus page, ArtStation, YouTube, GitHub, screenshots…</small>
              <input type="url" value={portfolio} onChange={event => setPortfolio(event.target.value)} maxLength={beta.NCWE_LIMITS.portfolioMax}
                placeholder="https://" autoComplete="url" spellCheck={false} aria-invalid={!!fieldError("portfolioUrl") || undefined} />
              {fieldError("portfolioUrl") ? <span className={styles.fieldError} role="alert">{fieldError("portfolioUrl")}</span> : null}
            </label>
            <label className={styles.rules}>
              <input type="checkbox" checked={accept} onChange={event => setAccept(event.target.checked)} required />
              <span>I understand the closed beta: builds are for testers only and I will not share them, I report bugs and feedback in the
                NCWE channels on Discord, and the team can withdraw access at any time.</span>
            </label>
            {fieldError("acceptRules") ? <span className={styles.fieldError} role="alert">{fieldError("acceptRules")}</span> : null}
          </div>
        </div>
      </fieldset>
      {error ? <p className={styles.error} role="alert">{error}</p> : null}
      <div className={styles.actions}>
        <button type="submit" className={styles.primary} disabled={busy || blocked || !confirmed || !member}>
          {busy ? <><span className={styles.spinner} aria-hidden="true" />Sending…</>
            : <>{initial ? "Save my application" : confirmed && member ? `Apply as @${member.username}` : "Apply"}<ArrowRightIcon size={16} /></>}
        </button>
        {onCancel ? <button type="button" className={styles.textButton} onClick={onCancel} disabled={busy}>Cancel</button> : null}
        {!confirmed ? <span className={styles.submitHint}>Check and confirm your Discord account to apply.</span> : null}
      </div>
    </form>
  </>;
}

function Answer({ id, label, hint, value, onChange, min, error, rows, placeholder }: {
  id: string; label: string; hint: string; value: string; onChange: (value: string) => void;
  min: number; error: string | undefined; rows: number; placeholder: string;
}) {
  const length = value.trim().length;
  return <label className={styles.field} data-invalid={!!error} htmlFor={id}>
    <b>{label}</b><small>{hint}</small>
    <textarea id={id} value={value} onChange={event => onChange(event.target.value)} rows={rows} required minLength={min}
      maxLength={beta.NCWE_LIMITS.answerMax} placeholder={placeholder} aria-invalid={!!error || undefined} />
    <span className={styles.counter} data-short={length > 0 && length < min}>
      {length < min ? `${min - length} more characters at least` : `${value.length.toLocaleString("en-US")} / 2,000`}
    </span>
    {error ? <span className={styles.fieldError} role="alert">{error}</span> : null}
  </label>;
}

function MemberCard({ member, confirmed, disabled, onConfirm, onReject, onChange, caption }: {
  member: NcweDiscordLookup;
  confirmed: boolean;
  disabled?: boolean;
  onConfirm?: () => void;
  onReject?: () => void;
  onChange?: () => void;
  caption?: ReactNode;
}) {
  const joined = day(member.joinedServerAtUtc);
  const created = day(member.accountCreatedAtUtc);
  return <div className={styles.member} data-confirmed={confirmed}>
    {/* eslint-disable-next-line @next/next/no-img-element -- Discord CDN avatar, any size Discord serves */}
    <img className={styles.avatar} src={member.avatarUrl || DEFAULT_AVATAR} alt="" width={64} height={64} referrerPolicy="no-referrer" />
    <div>
      <p className={styles.memberName}>{member.displayName || member.username}</p>
      <p className={styles.memberHandle}>@{member.username} · {member.userId}</p>
      <p className={styles.memberMeta}>
        {joined ? <span>On the OPEN//77 Discord since {joined}</span> : null}
        {created ? <span>Discord account created {created}</span> : null}
      </p>
    </div>
    {confirmed
      ? <div className={styles.confirmed}><CheckIcon size={15} /><span>{caption ?? <>Confirmed: this application is tied to <strong>@{member.username}</strong>.</>}</span>
        {onChange ? <button type="button" className={styles.textButton} onClick={onChange} disabled={disabled}>Use another account</button> : null}</div>
      : <div className={styles.memberQuestion}>
        <p>Is this <strong>your</strong> Discord account?</p>
        <button type="button" className={styles.primary} onClick={onConfirm} disabled={disabled}>Yes, that&apos;s me</button>
        <button type="button" className={styles.secondary} onClick={onReject} disabled={disabled}>No, not me</button>
      </div>}
  </div>;
}

function StatusBadge({ status }: { status: NcweBetaApplication["status"] }) {
  const label = status === "pending" ? "Under review" : status === "approved" ? "Accepted" : "Not accepted";
  return <span className={styles.badge} data-status={status}>{label}</span>;
}

function Timeline({ application }: { application: NcweBetaApplication }) {
  const sent = day(application.createdAtUtc);
  const updated = application.updatedAtUtc !== application.createdAtUtc ? day(application.updatedAtUtc) : null;
  const decided = day(application.decidedAtUtc);
  return <p className={styles.timeline}>
    {sent ? <span>Sent {sent}</span> : null}
    {updated && !decided ? <span>Updated {updated}</span> : null}
    {decided ? <span>Reviewed {decided}</span> : null}
  </p>;
}

function Answers({ application }: { application: NcweBetaApplication }) {
  const portfolio = httpLink(application.portfolioUrl);
  const time = beta.NCWE_AVAILABILITY.find(([value]) => value === application.availability)?.[1] ?? application.availability;
  return <dl className={styles.answers}>
    <div><dt>Why NCWE</dt><dd>{application.motivation}</dd></div>
    <div><dt>First build</dt><dd>{application.plans}</dd></div>
    <div><dt>Experience</dt><dd>{application.experience}</dd></div>
    <div><dt>Time for the beta</dt><dd>{time}</dd></div>
    {application.portfolioUrl ? <div><dt>Portfolio</dt><dd>{portfolio
      ? <a href={portfolio} target="_blank" rel="noopener noreferrer nofollow">{application.portfolioUrl}</a> : application.portfolioUrl}</dd></div> : null}
  </dl>;
}

function Pending({ application, token, canEdit, notice, onEdit, onWithdrawn }: {
  application: NcweBetaApplication; token: string; canEdit: boolean; notice: string;
  onEdit: () => void; onWithdrawn: () => void;
}) {
  const [armed, setArmed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  async function withdraw() {
    if (busy) return;
    if (!armed) { setArmed(true); return; }
    setBusy(true); setError("");
    try { await beta.withdrawNcweApplication(token); onWithdrawn(); }
    catch (err) { setError(failure(err)); setBusy(false); setArmed(false); }
  }
  return <>
    <div className={styles.statusHead}>
      <div><p className={styles.eyebrow}>YOUR APPLICATION</p><h2 id="ncwe-apply-title">Under review.</h2></div>
      <StatusBadge status="pending" />
    </div>
    <p className={styles.panelLead}>The team reads every application. If you are accepted, our bot gives your Discord account the NCWE Preview
      role and tags you in a welcome message. Until then you can still edit or withdraw it.</p>
    {notice ? <p className={styles.success} role="status">{notice}</p> : null}
    <MemberCard member={profileOf(application)} confirmed />
    <Timeline application={application} />
    <Answers application={application} />
    {error ? <p className={styles.error} role="alert">{error}</p> : null}
    <div className={styles.actions} style={{ marginTop: 24 }}>
      {canEdit ? <button type="button" className={styles.secondary} onClick={onEdit} disabled={busy}>Edit my application</button> : null}
      <button type="button" className={`${styles.secondary} ${styles.danger}`} data-armed={armed} disabled={busy}
        onClick={() => void withdraw()} onBlur={() => setArmed(false)}>
        {busy ? "Withdrawing…" : armed ? "Click again to withdraw" : "Withdraw"}
      </button>
    </div>
  </>;
}

function Decided({ application, inviteUrl }: { application: NcweBetaApplication; inviteUrl: string | null }) {
  const approved = application.status === "approved";
  return <>
    <div className={styles.statusHead}>
      <div><p className={styles.eyebrow}>YOUR APPLICATION</p><h2 id="ncwe-apply-title">{approved ? "You're in." : "Not this time."}</h2></div>
      <StatusBadge status={application.status} />
    </div>
    <p className={styles.panelLead}>{approved
      ? <>Welcome to the NCWE closed beta! Your Discord account <strong>@{application.discord.username}</strong> has the NCWE Preview role:
        the beta channels on the OPEN//77 Discord are open to you. Builds, news and feedback all live there.</>
      : <>The team did not accept your application this time. Places are limited during the closed beta: stay around on the
        OPEN//77 Discord, more builders will join as it opens up.</>}</p>
    {application.decisionNote ? <p className={styles.note}><span>Message from the team</span>{application.decisionNote}</p> : null}
    <MemberCard member={profileOf(application)} confirmed caption={<>Linked Discord account: <strong>@{application.discord.username}</strong></>} />
    <Timeline application={application} />
    {inviteUrl ? <div className={styles.actions} style={{ marginTop: 22 }}>
      <a className={styles.primary} href={inviteUrl} target="_blank" rel="noopener noreferrer"><DiscordIcon size={16} />Open the Discord</a>
    </div> : null}
    <details className={styles.help} style={{ marginTop: 24 }}><summary>Your answers</summary><Answers application={application} /></details>
  </>;
}
