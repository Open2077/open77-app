"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";

import { AuthPanel } from "@/components/account/auth-panel";
import { ArrowLink, Fine, Pending } from "@/components/account/kit";
import { Button } from "@/components/ui/button";
import { Avatar } from "@/components/ui/data";
import { Notice } from "@/components/ui/feedback";
import { Field, Input, Textarea } from "@/components/ui/field";
import { add01, cancel01, link01, refresh, tick02, user } from "@/components/ui/icons";
import { Panel } from "@/components/ui/panel";
import { useSession, type StoredSession } from "@/lib/account/session";
import { myProfile, saveProfile } from "@/lib/community/client-api";
import type { CommunityProfile } from "@/lib/community/types";
import { CreatorMedia } from "./creator-media";

import styles from "./profile-editor.module.css";

export function ProfileEditor() {
  const { session, ready } = useSession();
  const [owner, setOwner] = useState<StoredSession | null>(null);
  const [dirty, setDirty] = useState(false);
  const active = !!session?.emailVerified && session.accountId === owner?.accountId;
  useEffect(() => {
    if (!dirty) return;
    const warn = (event: BeforeUnloadEvent) => event.preventDefault();
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);
  if (!owner && session?.emailVerified) setOwner(session);
  if (!ready) return <Pending label="Account" />;
  if (!owner)
    return !session ? (
      <AuthPanel />
    ) : (
      <Notice kind="info" title="Verify your e-mail first">
        Verify your email to create a profile. <ArrowLink href="/account">Open your account</ArrowLink>
      </Notice>
    );
  return (
    <>
      {!active ? (
        <div className={styles.resume}>
          <Notice kind="warning" title="Your profile edits remain in this tab.">
            Sign in to the same account to continue.
          </Notice>
          <AuthPanel />
          {session?.emailVerified && session.accountId !== owner.accountId ? (
            <Button
              lines="none"
              border
              color="neutral"
              size="sm"
              onClick={() => {
                setOwner(session);
                setDirty(false);
              }}
            >
              Discard profile edits and switch account
            </Button>
          ) : null}
        </div>
      ) : null}
      <div hidden={!active}>
        <Editor key={owner.accountId} token={active && session ? session.token : owner.token} active={active} onDirty={setDirty} />
      </div>
    </>
  );
}

function Editor({ token, active, onDirty }: { token: string; active: boolean; onDirty: (dirty: boolean) => void }) {
  const [profile, setProfile] = useState<CommunityProfile | null>(null);
  const [handle, setHandle] = useState("");
  const [bio, setBio] = useState("");
  const [links, setLinks] = useState<CommunityProfile["links"]>([]);
  const [avatarMediaId, setAvatarMediaId] = useState<string | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [status, setStatus] = useState("");
  const [refreshCount, setRefresh] = useState(0);
  const initialized = useRef(false);
  const dirty =
    loaded &&
    (handle !== (profile?.handle ?? "") ||
      bio !== (profile?.bio ?? "") ||
      avatarMediaId !== (profile?.avatarMediaId ?? null) ||
      JSON.stringify(links) !== JSON.stringify(profile?.links ?? []));
  useEffect(() => {
    onDirty(dirty);
  }, [dirty, onDirty]);
  useEffect(() => {
    if (!active || initialized.current) return;
    const controller = new AbortController();
    myProfile(token, AbortSignal.any([controller.signal, AbortSignal.timeout(10000)]))
      .then(({ profile }) => {
        if (!controller.signal.aborted) {
          initialized.current = true;
          setProfile(profile);
          setHandle(profile?.handle ?? "");
          setBio(profile?.bio ?? "");
          setLinks(profile?.links ?? []);
          setAvatarMediaId(profile?.avatarMediaId ?? null);
          setLoaded(true);
          setError("");
        }
      })
      .catch((error) => {
        if (!controller.signal.aborted) setError(error instanceof Error ? error.message : "Profile could not be loaded.");
      });
    return () => controller.abort();
  }, [token, refreshCount, active]);
  async function save(event: FormEvent) {
    event.preventDefault();
    if (!active || busy) return;
    setBusy(true);
    setError("");
    setStatus("");
    try {
      const value = await saveProfile(token, profile?.revision ?? 0, handle, bio, links, AbortSignal.timeout(10000), avatarMediaId);
      setProfile(value);
      setHandle(value.handle);
      setStatus("Your public profile is saved.");
    } catch (error) {
      setError(error instanceof Error ? error.message : "Profile could not be saved.");
    } finally {
      setBusy(false);
    }
  }

  if (!loaded)
    return (
      <div className={styles.loading}>
        {error ? (
          <Notice
            kind="danger"
            title="Your profile is unavailable."
            action={
              <Button lines="none" border color="red" size="sm" icon={refresh} iconPosition="left" onClick={() => setRefresh((value) => value + 1)}>
                Try again
              </Button>
            }
          >
            {error}
          </Notice>
        ) : (
          <Pending label="Loading your profile" />
        )}
      </div>
    );

  return (
    <div className={styles.layout}>
      <div className={styles.main}>
        {error ? <Notice kind="danger">{error}</Notice> : null}
        {status ? <Notice kind="success">{status}</Notice> : null}
        <Panel brackets padding="lg">
          <form id="profile-form" className={styles.form} onSubmit={save}>
            <fieldset disabled={busy} className={styles.fields}>
              <legend className="sr-only">Public creator profile</legend>
              <Field
                label="Creator handle"
                hint="Letters, digits and single hyphens. Old handles keep pointing to you and cannot be claimed by someone else."
              >
                <Input
                  icon={user}
                  inputSize="lg"
                  required
                  minLength={3}
                  maxLength={40}
                  autoCapitalize="none"
                  spellCheck={false}
                  value={handle}
                  onChange={(event) => setHandle(event.target.value)}
                />
              </Field>
              <Field label="About you" optional hint={`${bio.length} / 2000`}>
                <Textarea maxLength={2000} rows={6} value={bio} onChange={(event) => setBio(event.target.value)} />
              </Field>
              <Fine>Your handle, bio and links are public. Keep personal contact details out unless you want to share them.</Fine>

              <div className={styles.links}>
                <p className={styles.linksLabel}>Links · {links.length} / 5</p>
                {links.map((link, index) => (
                  <div className={styles.link} key={index}>
                    <span className={styles.linkIndex}>{String(index + 1).padStart(2, "0")}</span>
                    <Field label={`Link ${index + 1} label`}>
                      <Input
                        required
                        maxLength={40}
                        value={link.label}
                        onChange={(event) => setLinks((current) => current.map((item, at) => (at === index ? { ...item, label: event.target.value } : item)))}
                      />
                    </Field>
                    <Field label="HTTPS address">
                      <Input
                        icon={link01}
                        required
                        type="url"
                        maxLength={2048}
                        value={link.url}
                        onChange={(event) => setLinks((current) => current.map((item, at) => (at === index ? { ...item, url: event.target.value } : item)))}
                      />
                    </Field>
                    <Button
                      lines="none"
                      border
                      color="neutral"
                      size="sm"
                      iconOnly
                      icon={cancel01}
                      aria-label={`Remove link ${index + 1}`}
                      title={`Remove link ${index + 1}`}
                      className={styles.removeLink}
                      onClick={() => setLinks((current) => current.filter((_, at) => at !== index))}
                    />
                  </div>
                ))}
                {links.length < 5 ? (
                  <div>
                    <Button
                      lines="none"
                      border
                      color="neutral"
                      size="sm"
                      icon={add01}
                      iconPosition="left"
                      onClick={() => setLinks((current) => [...current, { label: "", url: "" }])}
                    >
                      Add a link
                    </Button>
                  </div>
                ) : null}
              </div>

              <div className={styles.actions}>
                <Button key={busy ? "Saving…" : "Save public profile"} type="submit" icon={tick02} busy={busy}>
                  {busy ? "Saving…" : "Save public profile"}
                </Button>
                {profile ? <ArrowLink href={`/workshop/creators/${profile.handle}`}>View your public profile</ArrowLink> : null}
              </div>
            </fieldset>
          </form>
        </Panel>
      </div>

      <aside className={styles.aside} aria-label="Profile preview">
        <div className={styles.preview} aria-hidden="true">
          <p className={styles.previewLabel}>Public card</p>
          <div className={styles.previewBody}>
            <Avatar name={handle || "creator"} size={64} />
            <div className={styles.previewCopy}>
              <p className={styles.previewHandle}>@{handle || "your-handle"}</p>
              <p className={styles.previewBio}>{bio.trim() || "Tell other creators and server owners what you build."}</p>
            </div>
          </div>
          {links.filter((link) => link.label.trim()).length ? (
            <ul className={styles.previewLinks}>
              {links
                .filter((link) => link.label.trim())
                .map((link, index) => (
                  <li key={index}>{link.label}</li>
                ))}
            </ul>
          ) : null}
        </div>
      </aside>

      <div className={styles.avatar}>
        {profile ? (
          <fieldset className={styles.avatarFields} disabled={busy}>
            <legend className="sr-only">Profile avatar</legend>
            <CreatorMedia
              token={token}
              projectId={null}
              media={avatarMediaId ? [{ mediaId: avatarMediaId, altText: "Creator avatar" }] : []}
              onChange={(media) => {
                setAvatarMediaId(media[0]?.mediaId ?? null);
                setStatus("Avatar selection changed. Save your public profile to apply it.");
              }}
            />
            <div>
              <Button key={busy ? "Saving…" : "Save profile and avatar"} type="submit" form="profile-form" lines="none" icon={tick02} iconPosition="left" busy={busy}>
                {busy ? "Saving…" : "Save profile and avatar"}
              </Button>
            </div>
          </fieldset>
        ) : (
          <Notice kind="info">Save your profile first to upload an avatar.</Notice>
        )}
      </div>
    </div>
  );
}
