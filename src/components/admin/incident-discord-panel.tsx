"use client";

import { useState } from "react";
import type { FormEvent } from "react";

import { Button } from "@/components/admin/admin-button";
import { Field, Input } from "@/components/ui/field";
import { Icon } from "@/components/ui/icon";
import { arrowDown01, discord } from "@/components/ui/icons";
import { Panel } from "@/components/ui/panel";
import { MasterApiError } from "@/lib/account/api";
import { configureIncidentDiscord, incidentDiscord, incidentError } from "@/lib/account/incidents-api";
import { useSession } from "@/lib/account/session";
import { AdminSpinner, useAdminActivity } from "./admin-activity";
import { Footnote, FormActions, StatusTag } from "./admin-kit";
import { ArmButton } from "./arm-button";
import { ErrorStrip, useAdminData } from "./use-admin-data";

import styles from "./incidents-panel.module.css";

export function IncidentDiscordPanel() {
  const { token, data, setData, error, loading } = useAdminData(incidentDiscord);
  const { clear } = useSession();
  const { begin } = useAdminActivity();
  const [url, setUrl] = useState("");
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState("");
  const [failure, setFailure] = useState<string | null>(null);
  async function save(enabled: boolean, remove = false) {
    if (!token) return;
    setBusy(true); setNotice(""); setFailure(null);
    const finish = begin();
    try {
      const next = await configureIncidentDiscord(token, { enabled, remove, ...(enabled && !remove && url.trim() ? { webhookUrl: url.trim() } : {}) });
      setData(next); setUrl(""); setNotice(remove ? "Webhook removed." : "Discord settings saved. Future reports follow this configuration."); finish(true);
    } catch (e) { if (e instanceof MasterApiError && e.status === 401) clear(); setFailure(incidentError(e)); finish(false); }
    finally { setBusy(false); }
  }
  function submit(event: FormEvent) {
    event.preventDefault();
    if (url.trim() && !/^https:\/\/discord\.com\/api\/webhooks\/[0-9]{17,20}\/[A-Za-z0-9_-]{40,150}$/.test(url.trim())) {
      setFailure("Use an HTTPS discord.com/api/webhooks/… URL, without query parameters."); return;
    }
    void save(true);
  }
  return (
    <Panel as="details" padding="none" className={styles.webhook}>
      <summary className={styles.webhookSummary}>
        <Icon glyph={discord} className={styles.webhookIcon} />
        <span className={styles.webhookTitle}>
          Discord notifications <span className={styles.webhookHint}>· Configure integration</span>
        </span>
        <StatusTag status={data?.enabled ? "ok" : "neutral"}>{loading ? "Loading…" : data?.enabled ? "Enabled" : "Disabled"}</StatusTag>
        <Icon glyph={arrowDown01} className={styles.webhookChevron} />
      </summary>
      <div className={styles.webhookBody}>
        <Footnote>
          Only the incident ID, type, server ID, fingerprint and a private admin link are sent. No logs, account details or
          attachments. Existing reports are not replayed when enabling. The secret URL is never returned by the API.
        </Footnote>
        <ErrorStrip message={failure ?? error} />
        <form className={styles.webhookForm} onSubmit={submit}>
          <Field label={data?.configured ? "Replace webhook URL (leave blank to keep it)" : "Discord webhook URL"} className={styles.webhookField}>
            <Input
              type="password"
              value={url}
              onChange={e => setUrl(e.target.value)}
              autoComplete="new-password"
              spellCheck={false}
              maxLength={300}
              placeholder={data?.destination ?? "https://discord.com/api/webhooks/…"}
            />
          </Field>
          <Button type="submit" size="sm" color="red" lines="none" busy={busy} disabled={loading || (!data?.configured && !url.trim())}>
            {busy ? "Saving" : "Save & enable"}
          </Button>
        </form>
        <div className={styles.webhookFoot}>
          <p className={styles.delivery}>
            Delivery: <strong>{data?.delivery.state ?? "unknown"}</strong>
            {data?.delivery.lastSuccessUtc ? ` · Last sent ${new Date(data.delivery.lastSuccessUtc).toLocaleString()}` : " · No delivery recorded this runtime"}
          </p>
          <FormActions>
            <Button size="sm" color="neutral" border lines="none" disabled={!data?.enabled || busy || loading} onClick={() => void save(false)}>
              Disable
            </Button>
            <ArmButton label="Remove webhook" confirmLabel="Confirm removal" disabled={!data?.configured || busy || loading} onConfirm={() => void save(false, true)} />
          </FormActions>
        </div>
        {busy ? <AdminSpinner label="Saving" /> : null}
        <Footnote role="status">{notice}</Footnote>
      </div>
    </Panel>
  );
}
