"use client";

import { useCallback, useState } from "react";
import type { FormEvent } from "react";

import { Button } from "@/components/admin/admin-button";
import { Field, Textarea } from "@/components/ui/field";
import { tick02 } from "@/components/ui/icons";
import { MasterApiError } from "@/lib/account/api";
import { incidentResolution, resolveIncident, resolutionError } from "@/lib/account/incidents-api";
import type { IncidentResolution, IncidentResolutionInput } from "@/lib/account/incidents-api";
import { useSession } from "@/lib/account/session";
import { AdminSpinner, useAdminActivity } from "./admin-activity";
import { Footnote, FormActions, Mono, StatusTag, SubHeading } from "./admin-kit";
import { ErrorStrip, useAdminData } from "./use-admin-data";

import styles from "./incidents-panel.module.css";

export function ResolutionBadge({ resolution }: { resolution?: IncidentResolution }) {
  return (
    <StatusTag status={resolution?.status === "resolved" ? "ok" : "neutral"}>
      {resolution ? resolution.status === "resolved" ? "Resolved" : "Open" : "Status unavailable"}
    </StatusTag>
  );
}

export function IncidentResolutionPanel({ id, onSaved }: { id: string; onSaved: (value: IncidentResolution) => void }) {
  // Fetch the current revision rather than trusting a potentially stale inbox row.
  const load = useCallback(async (token: string) => {
    try { return await incidentResolution(token, id); }
    catch (error) {
      if (error instanceof MasterApiError) throw new MasterApiError(error.code, resolutionError(error), error.status);
      throw error;
    }
  }, [id]);
  const { token, data, setData, error, loading, reload } = useAdminData(load);
  const [draft, setDraft] = useState<IncidentResolutionInput | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [notice, setNotice] = useState("");
  const { clear } = useSession();
  const { begin } = useAdminActivity();

  function edit(status: "open" | "resolved") {
    if (!data) return;
    setDraft({ status, expectedRevision: data.revision, reason: data.reason ?? "", problem: data.problem ?? "", fix: data.fix ?? "" });
    setSaveError(null); setNotice("");
  }
  function reloadSaved() {
    setDraft(null); setSaveError(null); setNotice(""); reload();
  }
  async function save(event: FormEvent) {
    event.preventDefault();
    if (!token || !draft || saving) return;
    setSaving(true); setSaveError(null); setNotice("");
    const finish = begin();
    try {
      const value = await resolveIncident(token, id, draft);
      setData(value); setDraft(null); onSaved(value);
      setNotice(value.status === "resolved" ? "Report resolved. Resolution saved on the master." : "Report reopened. Notes retained on the master.");
      finish(true);
    } catch (error) {
      if (error instanceof MasterApiError && error.status === 401) clear();
      setSaveError(resolutionError(error)); finish(false);
    } finally { setSaving(false); }
  }

  return (
    <section className={styles.resolution} aria-label="Report resolution" aria-busy={saving || loading}>
      <div className={styles.resolutionHead}>
        <SubHeading>Resolution</SubHeading>
        {data ? <ResolutionBadge resolution={data} /> : null}
      </div>
      <Footnote>Staff notes only. Resolving keeps the original evidence and its existing retention period. Do not include secrets.</Footnote>
      {loading ? <AdminSpinner label="Loading resolution" /> : null}
      <ErrorStrip message={error} />
      {error ? (
        <div>
          <Button size="sm" color="neutral" border lines="none" onClick={reload} disabled={loading || saving}>
            Retry resolution request
          </Button>
        </div>
      ) : null}
      {data ? (
        <>
          {data.updatedAtUtc ? (
            <p className={styles.resolutionMeta}>
              Last {data.status === "resolved" ? "resolved / edited" : "reopened"}:{" "}
              <time dateTime={data.updatedAtUtc}>{new Date(data.updatedAtUtc).toISOString().replace("T", " ").slice(0, 19)} UTC</time>
              <br />
              Admin account: <Mono>{data.updatedByAccountId}</Mono>
            </p>
          ) : null}
          {!draft ? (
            <>
              <dl className={styles.notes}>
                {([["Reason", data.reason], ["Problem identified", data.problem], ["Fix / how it was resolved", data.fix]] as const).map(([label, value]) =>
                  value ? (
                    <div key={label}>
                      <dt>{label}</dt>
                      <dd>{value}</dd>
                    </div>
                  ) : null,
                )}
              </dl>
              {data.status === "resolved" && !data.reason && !data.problem && !data.fix ? <Footnote>Resolved without additional notes.</Footnote> : null}
              <FormActions>
                <Button size="sm" color="red" lines="none" icon={tick02} iconPosition="left" disabled={loading || !!error} onClick={() => edit("resolved")}>
                  {data.status === "resolved" ? "Edit resolution" : "Resolve report"}
                </Button>
                {data.status === "resolved" ? (
                  <Button size="sm" color="neutral" border lines="none" disabled={loading || !!error} onClick={() => edit("open")}>
                    Reopen report
                  </Button>
                ) : null}
              </FormActions>
            </>
          ) : (
            <form className={styles.resolutionForm} onSubmit={save}>
              <fieldset disabled={saving}>
                <legend>{draft.status === "open" ? "Reopen this report" : "Resolve this report"} · all notes are optional</legend>
                <Field label="Reason (optional)" hint={`${draft.reason?.length ?? 0} / 500`}>
                  <Textarea rows={2} maxLength={500} autoFocus value={draft.reason} onChange={e => setDraft({ ...draft, reason: e.target.value })} placeholder="Fixed in a release, duplicate, no longer reproducible…" />
                </Field>
                <Field label="Problem identified (optional)" hint={`${draft.problem?.length ?? 0} / 4,000`}>
                  <Textarea rows={3} maxLength={4000} value={draft.problem} onChange={e => setDraft({ ...draft, problem: e.target.value })} placeholder="What caused the crash?" />
                </Field>
                <Field label="Fix / how it was resolved (optional)" hint={`${draft.fix?.length ?? 0} / 4,000`}>
                  <Textarea rows={3} maxLength={4000} value={draft.fix} onChange={e => setDraft({ ...draft, fix: e.target.value })} placeholder="Describe the fix, workaround, commit or release." />
                </Field>
                <ErrorStrip message={saveError} />
                {saveError ? (
                  <div>
                    <Button size="sm" color="neutral" border lines="none" onClick={reloadSaved}>
                      Reload saved version (discard draft)
                    </Button>
                  </div>
                ) : null}
                <FormActions>
                  <Button size="sm" color="neutral" border lines="none" onClick={() => { setDraft(null); setSaveError(null); }}>
                    Cancel
                  </Button>
                  <Button type="submit" size="sm" color="red" lines="none" busy={saving}>
                    {draft.status === "open" ? "Confirm reopen" : data.status === "resolved" ? "Save resolution" : "Confirm resolve"}
                  </Button>
                  {saving ? <AdminSpinner label="Saving resolution" /> : null}
                </FormActions>
              </fieldset>
            </form>
          )}
        </>
      ) : null}
      <Footnote role="status">{notice}</Footnote>
    </section>
  );
}
