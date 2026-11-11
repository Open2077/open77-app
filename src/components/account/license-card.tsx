"use client";

import { useState, type FormEvent } from "react";
import { UpcomingServerEditor } from "@/components/admin/upcoming-server-editor";
import { safeHttpUrl } from "@/components/admin/format";
import { ServerText } from "@/components/servers/server-text";
import { Button } from "@/components/ui/button";
import { Notice } from "@/components/ui/feedback";
import { Checkbox } from "@/components/ui/field";
import { Panel } from "@/components/ui/panel";
import { Eyebrow } from "@/components/ui/typography";
import { MasterApiError } from "@/lib/account/api";
import type { OwnerLicense, UpcomingServerProfile } from "@/lib/account/server-owner-api";
import { plainLauncherText } from "@/lib/launcher-text";
import { StateTag, formatDay } from "./kit";
import styles from "./keymaster.module.css";

export function AnnouncementDetails({ profile }: { profile: UpcomingServerProfile }) {
  function link(value: string) {
    const href = safeHttpUrl(value);
    return href ? <a href={href} target="_blank" rel="noopener noreferrer">{value}</a> : value;
  }
  return (
    <div className={styles.announcementDetails}>
      <h4><ServerText text={profile.name} /></h4>
      <dl className={styles.facts}>
        <div><dt>Community</dt><dd><ServerText text={profile.community} /></dd></div>
        <div><dt>Languages</dt><dd>{profile.languages.join(" / ").toUpperCase()}</dd></div>
        <div><dt>Opening</dt><dd>{profile.opensAtUtc ? new Date(profile.opensAtUtc).toLocaleString() : "To be announced"}</dd></div>
        {profile.discord ? <div><dt>Discord invitation</dt><dd>{link(profile.discord)}</dd></div> : null}
        {profile.website ? <div><dt>Website</dt><dd>{link(profile.website)}</dd></div> : null}
        {profile.iconUrl ? <div><dt>Logo URL</dt><dd>{link(profile.iconUrl)}</dd></div> : null}
        {profile.bannerUrl ? <div><dt>Banner URL</dt><dd>{link(profile.bannerUrl)}</dd></div> : null}
      </dl>
      {profile.description ? <p className={styles.description}>{profile.description}</p> : null}
    </div>
  );
}

export function LicenseCard({ license, disabled, onRevoke, onSubmit }: {
  license: OwnerLicense;
  disabled: boolean;
  onRevoke: () => void;
  onSubmit: (profile: UpcomingServerProfile, revision: number) => Promise<void>;
}) {
  const request = license.upcoming;
  const server = license.lastServer;
  const [editing, setEditing] = useState(false);
  const [confirmed, setConfirmed] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [profile, setProfile] = useState<UpcomingServerProfile>(() => request?.profile ?? {
    enabled: true, name: server?.name ?? license.label, community: plainLauncherText(server?.name ?? license.label),
    languages: [], opensAtUtc: null, discord: null, website: null, description: null, iconUrl: null, bannerUrl: null,
  });
  const locked = request != null && request.status !== "rejected";
  const canSubmit = !license.revokedAtUtc && server && !server.revoked && !locked;
  const valid = confirmed && profile.name.trim() && profile.community.trim() && profile.languages.length > 0
    && profile.languages.length <= 8 && profile.languages.every(tag => /^[a-z]{2,3}(-[a-z0-9]{2,8})*$/i.test(tag) && tag.length <= 35);
  async function submit(event: FormEvent) {
    event.preventDefault();
    if (disabled || !canSubmit || !valid) return;
    setError(null);
    try { await onSubmit(profile, request?.revision ?? 0); setEditing(false); }
    catch (err) { setError(err instanceof MasterApiError ? err.message : "Could not submit this announcement. Try again."); }
  }
  return (
    <Panel as="article" padding="md" className={styles.licenseCard} data-owner-license={license.licenseId}>
      <header className={styles.cardHeader}>
        <div><Eyebrow>Created {formatDay(license.createdAtUtc)}</Eyebrow><h3>{license.label}</h3><code className={styles.hint}>op77_live_····{license.keyHint}</code></div>
        <div className={styles.cardActions}>
          <StateTag state={license.revokedAtUtc ? "revoked" : "active"} />
          {!license.revokedAtUtc ? <Button size="sm" border lines="none" color="red" disabled={disabled} aria-label={`Revoke ${license.label}`} onClick={onRevoke}>Revoke license</Button> : null}
        </div>
      </header>
      <dl className={styles.facts}>
        <div><dt>License ID</dt><dd><code>{license.licenseId}</code></dd></div>
        {license.revokedAtUtc ? <div><dt>Revoked</dt><dd>{formatDay(license.revokedAtUtc)}</dd></div> : null}
      </dl>
      <section className={styles.serverDetails} aria-label={`Last attached server for ${license.label}`}>
        <Eyebrow>Last attached server</Eyebrow>
        {server ? <>
          <div className={styles.serverHeading}><h4><ServerText text={server.name} /></h4><StateTag state={server.revoked ? "revoked" : server.online ? "connected" : "offline"} /></div>
          <dl className={styles.facts}>
            <div><dt>Server ID</dt><dd><code>{server.serverId}</code></dd></div>
            <div><dt>Last address</dt><dd>{server.connectEndpoint || "Not registered yet"}</dd></div>
            <div><dt>Last seen</dt><dd>{server.lastSeenAtUtc ? new Date(server.lastSeenAtUtc).toLocaleString() : "Enrolled; waiting for first registration"}</dd></div>
          </dl>
        </> : <p>No server attached yet. Add this key to <code>masterServer.licenseKey</code> in your <code>server.jsonc</code>, then start your server.</p>}
      </section>
      <section className={styles.upcomingSection} aria-label={`Upcoming announcement for ${license.label}`}>
        <div className={styles.serverHeading}><h4>Upcoming announcement</h4>{request ? <StateTag state={request.status} /> : null}</div>
        {request?.reason ? <Notice kind={request.status === "rejected" ? "warning" : "info"} title={request.status === "rejected" ? "Why your request was rejected" : "Staff note"}>{request.reason}</Notice> : null}
        {request && !editing ? <AnnouncementDetails profile={request.profile} /> : null}
        {request?.status === "pending" ? <p>Your request is waiting for staff review. Its content is locked during review.</p> : null}
        {request?.status === "approved" ? <p>Approved. This license has used its one announcement approval. Its content is permanently locked. Publication follows the last attached server and stops if the license is revoked or the server is hidden.</p> : null}
        {request?.status === "launched" ? <p>Staff marked this launch complete. The upcoming announcement is archived, and this license has used its one approval. Its content remains locked.</p> : null}
        {!request ? <p>Plan your community launch with a date, languages, Discord invitation and artwork. Staff review is required before publication. One approved announcement per license.</p> : null}
        {!server && !license.revokedAtUtc ? <p>Attach a server first to unlock announcement submissions.</p> : null}
        {server?.revoked && !license.revokedAtUtc ? <p>The last attached server is revoked. Attach an available server before submitting.</p> : null}
        {canSubmit && !editing ? <Button size="sm" border lines="none" disabled={disabled} onClick={() => setEditing(true)}>{request?.status === "rejected" ? "Revise and resubmit" : "Prepare announcement"}</Button> : null}
        {canSubmit && editing ? <form onSubmit={submit} className={styles.announcementForm}>
          <UpcomingServerEditor value={profile} onChange={setProfile} disabled={disabled} audience="owner" />
          <Checkbox checked={confirmed} onChange={event => setConfirmed(event.target.checked)} disabled={disabled} required>I understand that I cannot change this announcement once staff approve it.</Checkbox>
          {error ? <Notice kind="danger">{error}</Notice> : null}
          <div className={styles.cardActions}>
            <Button type="submit" size="sm" lines="none" disabled={disabled || !valid} busy={disabled}>{request?.status === "rejected" ? "Resubmit for review" : "Submit for review"}</Button>
            <Button size="sm" color="neutral" border lines="none" disabled={disabled} onClick={() => setEditing(false)}>Cancel</Button>
          </div>
        </form> : null}
      </section>
    </Panel>
  );
}
