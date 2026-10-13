"use client";

import { useState, type FormEvent } from "react";

import { Button } from "@/components/admin/admin-button";
import { Notice } from "@/components/ui/feedback";
import { Field, Input, Textarea } from "@/components/ui/field";
import { arrowLeft01, layers01 } from "@/components/ui/icons";
import { useSession } from "@/lib/account/session";
import { accountQuotas, saveAccountQuotas, quotaFields, type AccountQuota, type QuotaOverrides, type Quotas } from "@/lib/community/quotas";
import { AdminPanel, Footnote, FormActions, FormPanel, Mono, SuccessStrip } from "./admin-kit";

import styles from "./community-panels.module.css";

export function CommunityQuotaPanel() {
  const { session } = useSession();
  return session?.role === "admin" ? <Editor key={session.accountId} token={session.token} ownId={session.accountId} /> : null;
}
function Editor({ token, ownId }: { token: string; ownId: string }) {
  const [id, setId] = useState(""), [current, setCurrent] = useState<AccountQuota | null>(null);
  const [fields, setFields] = useState<Record<keyof Quotas, string>>({ draftProjectsPerAccount: "", activeUploadsPerAccount: "", pendingBytesPerAccount: "", gitHubImportsPerDay: "" });
  const [reason, setReason] = useState(""), [error, setError] = useState(""), [status, setStatus] = useState(""), [busy, setBusy] = useState(false);
  function apply(value: AccountQuota) {
    setCurrent(value);
    setFields(Object.fromEntries(quotaFields.map(({ key }) => [key, value.overrides[key]?.toString() ?? ""])) as Record<keyof Quotas, string>);
  }
  async function load(event: FormEvent) {
    event.preventDefault(); if (busy) return;
    setBusy(true); setError(""); setStatus("");
    try { apply(await accountQuotas(token, id.trim(), AbortSignal.timeout(10000))); setReason(""); }
    catch (error) { setError(error instanceof Error ? error.message : "The account limits could not be loaded."); }
    finally { setBusy(false); }
  }
  async function save(event: FormEvent) {
    event.preventDefault(); if (!current || busy) return;
    setBusy(true); setError(""); setStatus("");
    try {
      const overrides = Object.fromEntries(quotaFields.map(({ key, maximum }) => {
        const value = fields[key].trim() === "" ? null : Number(fields[key]);
        if (value !== null && (!Number.isSafeInteger(value) || value < 1 || value > maximum)) throw new Error(`Choose a whole number from 1 to ${maximum} or leave the field blank.`);
        return [key, value];
      })) as QuotaOverrides;
      apply(await saveAccountQuotas(token, current.accountId, current.revision, overrides, reason.trim(), AbortSignal.timeout(10000)));
      setReason(""); setStatus("Creator allowances saved and recorded in the audit history.");
    } catch (error) { setError(error instanceof Error ? error.message : "The change could not be saved. Reload before retrying an uncertain result."); }
    finally { setBusy(false); }
  }
  return (
    <AdminPanel
      title="Creator publishing allowances"
      icon={layers01}
      brackets
      actions={
        <Button href="/admin/resources" size="sm" color="neutral" border lines="none" icon={arrowLeft01} iconPosition="left">
          Back to Workshop review
        </Button>
      }
    >
      <Footnote>Review the account quotas before changing them. Blank overrides use global defaults. Package and inspection safety limits remain unchanged.</Footnote>
      {error ? <Notice kind="danger">{error}</Notice> : null}
      <SuccessStrip message={status} />
      <form className={styles.lookup} onSubmit={load}>
        <Field label="Creator account ID" className={styles.lookupField}>
          <Input
            required
            pattern="[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}"
            value={id}
            onChange={event => setId(event.target.value)}
            disabled={busy}
            className={styles.mono}
          />
        </Field>
        <Button type="submit" size="sm" color="neutral" border lines="none" busy={busy}>
          {busy ? "Working…" : current ? "Load account / discard form changes" : "Load account limits"}
        </Button>
      </form>
      {current ? (
        <FormPanel title={<>Account <Mono>{current.accountId}</Mono></>} onSubmit={save}>
          <p className={styles.cardMeta}>Review revision {current.revision}. Editing the lookup above does not change this selected account until you load it.</p>
          <div className={styles.quotaGrid}>
            {quotaFields.map(({ key, label, maximum }) => (
              <Field key={key} label={label} hint={`Current effective allowance: ${current.effective[key].toLocaleString()}. Maximum: ${maximum.toLocaleString()}.`}>
                <Input
                  type="number"
                  min={1}
                  max={maximum}
                  step={1}
                  placeholder="Global default"
                  value={fields[key]}
                  disabled={busy || current.accountId === ownId}
                  onChange={event => setFields(value => ({ ...value, [key]: event.target.value }))}
                  className={styles.quotaInput}
                />
              </Field>
            ))}
          </div>
          {current.accountId === ownId ? (
            <Notice kind="warning">Another administrator must review changes to your own quota.</Notice>
          ) : (
            <>
              <Field label="Reason for this change">
                <Textarea required maxLength={5000} rows={3} value={reason} onChange={event => setReason(event.target.value)} disabled={busy} />
              </Field>
              <FormActions>
                <Button type="submit" size="sm" color="red" lines="none" disabled={busy || !reason.trim()}>
                  Save reviewed allowances
                </Button>
              </FormActions>
            </>
          )}
        </FormPanel>
      ) : null}
    </AdminPanel>
  );
}
