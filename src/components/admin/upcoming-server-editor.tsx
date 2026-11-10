"use client";

import { useState } from "react";
import { ServerText } from "@/components/servers/server-text";
import { Field, Input, Textarea } from "@/components/ui/field";
import type { UpcomingServerProfile } from "@/lib/account/admin-api";
import styles from "./servers-panel.module.css";

function localDate(value: string | null): string {
  if (!value) return "";
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return "";
  return new Date(date.getTime() - date.getTimezoneOffset() * 60_000).toISOString().slice(0, 16);
}

export function UpcomingServerEditor({ value, onChange, disabled }: {
  value: UpcomingServerProfile;
  onChange: (value: UpcomingServerProfile) => void;
  disabled: boolean;
}) {
  const [opening, setOpening] = useState(() => localDate(value.opensAtUtc));
  const [languages, setLanguages] = useState(value.languages.join(", "));
  function update<K extends keyof UpcomingServerProfile>(key: K, next: UpcomingServerProfile[K]) {
    onChange({ ...value, [key]: next });
  }
  return (
        <div className={styles.upcomingFields}>
          <p>Shown in the Rust launcher, grouped by community and language. Upcoming servers leave the live list until you clear this flag. Hidden servers stay hidden everywhere.</p>
          <Field label="Community">
            <Input value={value.community} maxLength={96} disabled={disabled} required={value.enabled} onChange={e => update("community", e.target.value)} placeholder="Night City France" />
          </Field>
          <Field label="Announcement name">
            <Input value={value.name} maxLength={256} disabled={disabled} required={value.enabled} onChange={e => update("name", e.target.value)} />
          </Field>
          <div className={styles.namePreview} aria-label="Formatted server name preview"><ServerText text={value.name} /></div>
          <Field label="Languages">
            <Input value={languages} disabled={disabled} required={value.enabled} placeholder="fr, en, pt-BR" onChange={e => {
              setLanguages(e.target.value);
              update("languages", e.target.value.split(/[\s,;]+/).filter(Boolean));
            }} />
          </Field>
          <Field label="Opening date and time (your local timezone)">
            <Input type="datetime-local" value={opening} disabled={disabled} onChange={e => {
              setOpening(e.target.value);
              const date = new Date(e.target.value);
              update("opensAtUtc", e.target.value && Number.isFinite(date.getTime()) ? date.toISOString() : null);
            }} />
          </Field>
          <p>Leave the date blank for “To be announced”. Dates are saved in UTC. Reaching the date does not automatically mark a server live.</p>
          <Field label="Discord invitation">
            <Input type="url" value={value.discord ?? ""} disabled={disabled} maxLength={2048} placeholder="https://discord.gg/your-community" onChange={e => update("discord", e.target.value || null)} />
          </Field>
          <Field label="Website">
            <Input type="url" value={value.website ?? ""} disabled={disabled} maxLength={2048} placeholder="https://example.com" onChange={e => update("website", e.target.value || null)} />
          </Field>
          <Field label="Description" className={styles.wideField}>
            <Textarea rows={3} value={value.description ?? ""} disabled={disabled} maxLength={1000} onChange={e => update("description", e.target.value || null)} />
          </Field>
          <Field label="Logo URL">
            <Input value={value.iconUrl ?? ""} disabled={disabled} maxLength={2048} placeholder="https://… or /api/v1/icons/…" onChange={e => update("iconUrl", e.target.value || null)} />
          </Field>
          <Field label="Banner URL">
            <Input value={value.bannerUrl ?? ""} disabled={disabled} maxLength={2048} placeholder="https://… or /api/v1/banners/…" onChange={e => update("bannerUrl", e.target.value || null)} />
          </Field>
        </div>
  );
}
