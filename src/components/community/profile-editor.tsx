"use client";

import Link from "next/link";
import { useEffect, useState, type FormEvent } from "react";
import { AuthPanel } from "@/components/account/auth-panel";
import { useSession } from "@/lib/account/session";
import { myProfile, saveProfile } from "@/lib/community/client-api";
import type { CommunityProfile } from "@/lib/community/types";

export function ProfileEditor() {
  const { session, ready } = useSession();
  if (!ready) return <p role="status">Loading your account…</p>;
  if (!session) return <AuthPanel />;
  if (!session.emailVerified) return <p className="hub-notice">Verify your email to create a profile. <Link href="/account">Open your account →</Link></p>;
  return <Editor key={session.accountId} token={session.token} />;
}

function Editor({ token }: { token: string }) {
  const [profile, setProfile] = useState<CommunityProfile | null>(null);
  const [handle, setHandle] = useState("");
  const [bio, setBio] = useState("");
  const [links, setLinks] = useState<CommunityProfile["links"]>([]);
  const [loaded, setLoaded] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [status, setStatus] = useState("");
  const [refresh, setRefresh] = useState(0);
  useEffect(() => {
    const controller = new AbortController();
    myProfile(token, AbortSignal.any([controller.signal, AbortSignal.timeout(10000)]))
      .then(({ profile }) => { if (!controller.signal.aborted) { setProfile(profile); setHandle(profile?.handle ?? ""); setBio(profile?.bio ?? ""); setLinks(profile?.links ?? []); setLoaded(true); setError(""); } })
      .catch(error => { if (!controller.signal.aborted) setError(error instanceof Error ? error.message : "Profile could not be loaded."); });
    return () => controller.abort();
  }, [token, refresh]);
  async function save(event: FormEvent) {
    event.preventDefault(); setBusy(true); setError(""); setStatus("");
    try {
      const value = await saveProfile(token, profile?.revision ?? 0, handle, bio, links, AbortSignal.timeout(10000));
      setProfile(value); setHandle(value.handle); setStatus("Your public profile is saved.");
    } catch (error) { setError(error instanceof Error ? error.message : "Profile could not be saved."); }
    finally { setBusy(false); }
  }
  return <>{error && <p className="hub-notice" role="alert">{error}</p>}{status && <p className="hub-notice" role="status">{status}</p>}
    {!loaded ? <><p role="status">{error ? "Your profile is unavailable." : "Loading your profile…"}</p><button className="btn btn-ghost" onClick={() => setRefresh(value => value + 1)}>Try again</button></> :
      <form className="hub-form" onSubmit={save}><fieldset disabled={busy} className="hub-profile-fields">
        <label>Creator handle<input required minLength={3} maxLength={40} autoCapitalize="none" spellCheck={false} value={handle} onChange={event => setHandle(event.target.value)} /><span>Letters, digits and single hyphens. Old handles keep pointing to you and cannot be claimed by someone else.</span></label>
        <label>About you<textarea maxLength={2000} rows={6} value={bio} onChange={event => setBio(event.target.value)} /></label>
        <p>Your handle, bio and links are public. Keep personal contact details out unless you want to share them.</p>
        {links.map((link, index) => <div className="hub-form-row" key={index}>
          <label>Link {index + 1} label<input required maxLength={40} value={link.label} onChange={event => setLinks(current => current.map((item, at) => at === index ? { ...item, label: event.target.value } : item))} /></label>
          <label>HTTPS address<input required type="url" maxLength={2048} value={link.url} onChange={event => setLinks(current => current.map((item, at) => at === index ? { ...item, url: event.target.value } : item))} /></label>
          <button type="button" className="btn btn-ghost" onClick={() => setLinks(current => current.filter((_, at) => at !== index))}>Remove link {index + 1}</button></div>)}
        {links.length < 5 && <button type="button" className="btn btn-ghost" onClick={() => setLinks(current => [...current, { label: "", url: "" }])}>Add a link</button>}
        <div className="hub-actions"><button className="btn btn-primary">{busy ? "Saving…" : "Save public profile"}</button>{profile && <Link href={`/creators/${profile.handle}`}>View your public profile →</Link>}</div>
      </fieldset></form>}</>;
}
