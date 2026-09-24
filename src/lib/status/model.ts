export const SERVICE_IDS = ["master", "directory", "client", "launcher", "server", "website", "workshop"] as const;
export type ServiceState = "operational" | "degraded" | "outage" | "unknown";
export type Day = { date: string; checked: number; available: number; failed: number; slow: number; expected: number };
export type Service = {
  id: string; name: string; description: string; state: ServiceState; checkedAt: string | null;
  latencyMs: number | null; detail: string; history: Day[]; latency: { at: string; ms: number | null }[];
};
export type Incident = { id: string; service: string; startedAt: string; detectedAt: string; resolvedAt: string | null; detail: string };
export type Maintenance = { id: string; title: string; message: string; startsAt: string; endsAt: string; services: string[] };
export type StatusSnapshot = {
  schema: 1; generatedAt: string; startedAt: string | null; intervalSeconds: number; staleAfterSeconds: number;
  region: string; services: Service[]; incidents: Incident[]; maintenance: Maintenance[];
};
export const LABELS: Record<ServiceState, string> = {
  operational: "Operational", degraded: "Slow responses", outage: "Disruption", unknown: "No recent data",
};

const object = (value: unknown): value is Record<string, unknown> => !!value && typeof value === "object" && !Array.isArray(value);
const text = (value: unknown, max = 240): value is string => typeof value === "string" && value.length <= max;
const date = (value: unknown): value is string => text(value, 40) && Number.isFinite(Date.parse(value));
const count = (value: unknown): value is number => typeof value === "number" && Number.isSafeInteger(value) && value >= 0;
const ms = (value: unknown) => value === null || (count(value) && value <= 60000);
const serviceId = (id: unknown) => SERVICE_IDS.some((known) => known === id);

/** A corrupt/partial feed must never become a green status page. No untrusted HTML or URLs. */
export function parseSnapshot(value: unknown): StatusSnapshot | null {
  if (!object(value) || value.schema !== 1 || !date(value.generatedAt) || !(value.startedAt === null || date(value.startedAt)) ||
      value.intervalSeconds !== 60 || value.staleAfterSeconds !== 180 || !text(value.region, 100) ||
      !Array.isArray(value.services) || value.services.length !== SERVICE_IDS.length ||
      !Array.isArray(value.incidents) || value.incidents.length > 200 || !Array.isArray(value.maintenance) || value.maintenance.length > 100) return null;
  const ids = new Set();
  for (const item of value.services) {
    if (!object(item) || !serviceId(item.id) || ids.has(item.id) || !text(item.name, 100) || !text(item.description, 500) ||
        !(item.checkedAt === null || date(item.checkedAt)) || !ms(item.latencyMs) || !text(item.detail) ||
        !["operational", "degraded", "outage", "unknown"].includes(String(item.state)) ||
        !Array.isArray(item.history) || item.history.length !== 90 || !Array.isArray(item.latency) || item.latency.length !== 288) return null;
    ids.add(item.id);
    let previousDate = -Infinity;
    for (const day of item.history) {
      if (!object(day) || !date(day.date) || !/^\d{4}-\d{2}-\d{2}$/.test(day.date) || Date.parse(day.date) <= previousDate ||
          !count(day.checked) || !count(day.available) || !count(day.failed) || !count(day.slow) || !count(day.expected) ||
          day.expected > 1440 || day.expected === 0 || day.checked > day.expected || day.available + day.failed !== day.checked || day.slow > day.available) return null;
      previousDate = Date.parse(day.date);
    }
    let previousPoint = -Infinity;
    for (const point of item.latency) {
      if (!object(point) || !date(point.at) || !ms(point.ms) || Date.parse(point.at) <= previousPoint) return null;
      previousPoint = Date.parse(point.at);
    }
  }
  if (!value.incidents.every((item) => object(item) && text(item.id, 100) && serviceId(item.service) && date(item.startedAt) && date(item.detectedAt) &&
      (item.resolvedAt === null || date(item.resolvedAt)) && text(item.detail))) return null;
  if (!value.maintenance.every((item) => object(item) && text(item.id, 100) && text(item.title, 140) && text(item.message, 2000) &&
      date(item.startsAt) && date(item.endsAt) && Date.parse(item.endsAt) > Date.parse(item.startsAt) &&
      Array.isArray(item.services) && item.services.length > 0 && item.services.every(serviceId))) return null;
  return value as StatusSnapshot;
}

export function isStale(snapshot: StatusSnapshot, now: number) {
  const age = now - Date.parse(snapshot.generatedAt);
  return age > snapshot.staleAfterSeconds * 1000 || age < -60000;
}

export function currentState(service: Service, snapshot: StatusSnapshot, now: number): ServiceState {
  if (isStale(snapshot, now) || !service.checkedAt || now - Date.parse(service.checkedAt) > 180000 || Date.parse(service.checkedAt) > now + 60000) return "unknown";
  return service.state;
}

export function overallState(states: ServiceState[]): ServiceState {
  if (states.includes("outage")) return "outage";
  if (states.includes("degraded")) return "degraded";
  if (!states.length || states.includes("unknown")) return "unknown";
  return "operational";
}

export function statistics(history: Day[], days: number) {
  const totals = history.slice(-days).reduce((sum, day) => ({
    checked: sum.checked + day.checked, available: sum.available + day.available, expected: sum.expected + day.expected,
  }), { checked: 0, available: 0, expected: 0 });
  return { ...totals, availability: totals.checked ? totals.available / totals.checked * 100 : null,
    coverage: totals.expected ? totals.checked / totals.expected * 100 : 0 };
}

export function dayState(day: Day): ServiceState {
  return day.failed ? "outage" : day.slow ? "degraded" : day.checked ? "operational" : "unknown";
}

export function percent(value: number | null) {
  if (value === null) return "—";
  // Never round an actual failure up to 100%.
  return `${(value < 100 ? Math.floor(value * 100) / 100 : 100).toFixed(2)}%`;
}
