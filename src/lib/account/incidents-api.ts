import { masterCall, MasterApiError, MASTER_URL } from "./api";

export type IncidentResolution = { status: "open" | "resolved"; revision: number; updatedAtUtc: string | null;
  updatedByAccountId: string | null; reason: string | null; problem: string | null; fix: string | null };
export type IncidentResolutionInput = { status: "open" | "resolved"; expectedRevision: number;
  reason?: string; problem?: string; fix?: string };
export type IncidentRow = { incidentId: string; occurredAtUtc: string; receivedAtUtc: string;
  kind: string; fingerprint: string; serverId: string | null; bytes: number; sha256: string; resolution?: IncidentResolution };
export type IncidentCursor = { before: string; beforeId: string };
export type IncidentPage = { schema: string; items: IncidentRow[]; next: IncidentCursor | null };
export type IncidentFilters = { serverId?: string; incidentId?: string; fingerprint?: string; kind?: string; after?: string; status?: string };
export type IncidentPreview = { incidentId: string; sha256: string; manifest: Record<string, unknown>;
  files: { path: string; bytes: number }[]; entry: string; text: string; truncated: boolean };
export type IncidentDiscordSettings = { configured: boolean; enabled: boolean; destination: string | null; updatedAtUtc: string;
  delivery: { lastAttemptUtc: string | null; lastSuccessUtc: string | null; state: string } };
export function incidentDiscord(token: string): Promise<IncidentDiscordSettings> {
  return masterCall("/api/v1/admin/incidents/discord", { token });
}
export function configureIncidentDiscord(token: string, body: { webhookUrl?: string; enabled: boolean; remove?: boolean }): Promise<IncidentDiscordSettings> {
  return masterCall("/api/v1/admin/incidents/discord", { token, method: "POST", body });
}

export function incidents(token: string, filters: IncidentFilters & Partial<IncidentCursor> = {}): Promise<IncidentPage> {
  const query = new URLSearchParams({ limit: "40" });
  for (const [key, value] of Object.entries(filters)) if (value) query.set(key, value);
  return masterCall(`/api/v1/incidents?${query}`, { token });
}
export function incidentPreview(token: string, id: string, entry: string, signal?: AbortSignal): Promise<IncidentPreview> {
  return masterCall(`/api/v1/incidents/${encodeURIComponent(id)}/preview?entry=${encodeURIComponent(entry)}`, { token, signal });
}
export function incidentResolution(token: string, id: string): Promise<IncidentResolution> {
  return masterCall(`/api/v1/admin/incidents/${encodeURIComponent(id)}/resolution`, { token, signal: AbortSignal.timeout(20000) });
}
export function resolveIncident(token: string, id: string, body: IncidentResolutionInput): Promise<IncidentResolution> {
  return masterCall(`/api/v1/admin/incidents/${encodeURIComponent(id)}/resolution`, {
    token, method: "POST", body, signal: AbortSignal.timeout(20000),
  });
}
export function resolutionError(error: unknown): string {
  if (error instanceof MasterApiError) {
    if (error.code === "incident_resolution_conflict") return "This report changed since you opened the form. Reload the saved version before editing again. Your draft has not been submitted.";
    if (error.code === "incident_resolution_notes_too_long") return "Keep the reason under 500 characters and the problem and fix under 4,000 characters each.";
    if (error.code === "incident_not_found") return "This report no longer exists or has expired. Refresh the inbox.";
    if (error.status === 404) return "Resolution is unavailable. The master may need updating, or this report has expired. No local-only status is saved.";
    if (error.code === "incident_storage_unavailable") return "Resolution storage is unavailable. Your draft is kept here; reload the saved version before retrying.";
    if (error.code === "invalid_incident_resolution_notes") return "Remove unsupported control characters from the notes.";
    if (error.code === "network") return "Could not confirm the save. Your draft is kept here. Reload the saved version to check whether the master received it.";
  }
  return incidentError(error);
}
export function incidentError(error: unknown): string {
  if (error instanceof MasterApiError) {
    if (error.status === 404) return "Report not found, expired, or the incident receiver is not enabled yet.";
    if (error.status === 403) return "Administrator access is required. Your permissions may have changed.";
    return error.message;
  }
  return "The report request failed. Retry when the master is reachable.";
}

/** Private authenticated download; no credentials or report content in URLs/storage. */
export async function downloadIncident(token: string, incident: IncidentRow): Promise<void> {
  const response = await fetch(`${MASTER_URL}/api/v1/incidents/${encodeURIComponent(incident.incidentId)}`, {
    headers: { Authorization: `Bearer ${token}` }, cache: "no-store", redirect: "error", signal: AbortSignal.timeout(60000),
  });
  if (!response.ok) throw new MasterApiError("incident_download", `Download refused (HTTP ${response.status}).`, response.status);
  if (!response.body) throw new Error("Empty response");
  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let size = 0;
  try {
    while (true) {
      const next = await reader.read();
      if (next.done) break;
      size += next.value.length;
      if (size > 8 * 1024 * 1024) { await reader.cancel(); throw new Error("Oversized report"); }
      chunks.push(next.value);
    }
  } finally { reader.releaseLock(); }
  const bytes = new Uint8Array(size);
  let offset = 0;
  for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.length; }
  const digest = Array.from(new Uint8Array(await crypto.subtle.digest("SHA-256", bytes)), b => b.toString(16).padStart(2, "0")).join("");
  if (size !== incident.bytes || digest !== incident.sha256) throw new MasterApiError("incident_integrity", "Report integrity mismatch. Nothing was downloaded; refresh and retry.", 0);
  const url = URL.createObjectURL(new Blob([bytes], { type: "application/zip" }));
  const link = document.createElement("a");
  link.href = url; link.download = `open77-incident-${incident.incidentId}.zip`;
  document.body.append(link); link.click(); link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 30000);
}
