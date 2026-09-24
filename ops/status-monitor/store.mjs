import { DatabaseSync } from "node:sqlite";
import { SERVICES } from "./probes.mjs";

export const MINUTE = 60000;
export const DAY = 86400000;
export const RETENTION_DAYS = 90;
const iso = (value) => new Date(value).toISOString();

export function openStore(path) {
  const db = new DatabaseSync(path);
  db.exec(`PRAGMA journal_mode=WAL; PRAGMA busy_timeout=5000;
    CREATE TABLE IF NOT EXISTS checks (
      service TEXT NOT NULL, slot INTEGER NOT NULL, state TEXT NOT NULL,
      latency INTEGER, detail TEXT NOT NULL, PRIMARY KEY(service, slot)
    ) WITHOUT ROWID;
    CREATE TABLE IF NOT EXISTS incidents (
      id INTEGER PRIMARY KEY, service TEXT NOT NULL, started INTEGER NOT NULL,
      detected INTEGER NOT NULL, ended INTEGER, detail TEXT NOT NULL
    );
    CREATE UNIQUE INDEX IF NOT EXISTS one_open_incident ON incidents(service) WHERE ended IS NULL;
    CREATE TABLE IF NOT EXISTS metadata (key TEXT PRIMARY KEY, value INTEGER NOT NULL);
  `);
  return db;
}

export function record(db, service, result, now = Date.now()) {
  const slot = Math.floor(now / MINUTE) * MINUTE;
  db.exec("BEGIN IMMEDIATE");
  try {
    const inserted = db.prepare("INSERT OR IGNORE INTO checks VALUES (?, ?, ?, ?, ?)")
      .run(service, slot, result.state, result.latencyMs, result.detail);
    if (inserted.changes) {
      db.prepare("INSERT OR IGNORE INTO metadata VALUES ('started', ?)").run(slot);
      const previous = db.prepare("SELECT * FROM checks WHERE service = ? AND slot < ? ORDER BY slot DESC LIMIT 1").get(service, slot);
      // Confirm transitions with two consecutive minute samples, never across a monitoring gap.
      if (previous && slot - previous.slot === MINUTE) {
        const open = db.prepare("SELECT id FROM incidents WHERE service = ? AND ended IS NULL").get(service);
        if (result.state === "outage" && previous.state === "outage" && !open) {
          db.prepare("INSERT INTO incidents(service, started, detected, detail) VALUES (?, ?, ?, ?)").run(service, previous.slot, slot, result.detail);
        } else if (result.state !== "outage" && previous.state !== "outage" && open) {
          db.prepare("UPDATE incidents SET ended = ? WHERE id = ?").run(slot, open.id);
        }
      }
    }
    db.exec("COMMIT");
  } catch (error) { db.exec("ROLLBACK"); throw error; }
}

export function validateMaintenance(raw) {
  if (!Array.isArray(raw) || raw.length > 100) throw new Error("Maintenance must be an array of up to 100 entries");
  const ids = new Set();
  return raw.map((item) => {
    if (!item || typeof item.id !== "string" || !/^[a-z0-9-]{1,80}$/.test(item.id) || ids.has(item.id) ||
        typeof item.title !== "string" || !item.title.trim() || item.title.length > 140 ||
        typeof item.message !== "string" || item.message.length > 2000 ||
        !Number.isFinite(Date.parse(item.startsAt)) || !Number.isFinite(Date.parse(item.endsAt)) ||
        Date.parse(item.endsAt) <= Date.parse(item.startsAt) ||
        !Array.isArray(item.services) || !item.services.length || item.services.some((id) => !SERVICES.some((service) => service.id === id))) {
      throw new Error("Invalid maintenance entry");
    }
    ids.add(item.id);
    return { id: item.id, title: item.title, message: item.message, startsAt: iso(Date.parse(item.startsAt)), endsAt: iso(Date.parse(item.endsAt)), services: [...new Set(item.services)] };
  });
}

export function snapshot(db, { now = Date.now(), region = "Operator probe", maintenance = [] } = {}) {
  const today = Math.floor(now / DAY) * DAY;
  const since = today - (RETENTION_DAYS - 1) * DAY;
  const currentSlot = Math.floor(now / MINUTE) * MINUTE;
  const latencyStart = Math.floor(now / 300000) * 300000 - DAY + 300000;
  const services = SERVICES.map(({ id, name, description }) => {
    const latest = db.prepare("SELECT * FROM checks WHERE service = ? ORDER BY slot DESC LIMIT 1").get(id);
    const days = db.prepare(`SELECT CAST(slot / ? AS INTEGER) * ? AS day, COUNT(*) AS checked,
      SUM(state != 'outage') AS available, SUM(state = 'outage') AS failed, SUM(state = 'degraded') AS slow
      FROM checks WHERE service = ? AND slot >= ? GROUP BY day`).all(DAY, DAY, id, since);
    const buckets = new Map(days.map((day) => [day.day, day]));
    const history = Array.from({ length: RETENTION_DAYS }, (_, index) => {
      const day = since + index * DAY;
      const bucket = buckets.get(day);
      return {
        date: iso(day).slice(0, 10), checked: bucket?.checked ?? 0, available: bucket?.available ?? 0,
        failed: bucket?.failed ?? 0, slow: bucket?.slow ?? 0,
        expected: day === today ? Math.floor((currentSlot - today) / MINUTE) + 1 : 1440,
      };
    });
    const latencyRows = db.prepare(`SELECT CAST(slot / 300000 AS INTEGER) * 300000 AS time,
      AVG(latency) AS ms FROM checks WHERE service = ? AND slot >= ? GROUP BY time`).all(id, latencyStart);
    const latencies = new Map(latencyRows.map((row) => [row.time, row.ms]));
    return {
      id, name, description, state: latest && now - latest.slot <= 180000 ? latest.state : "unknown",
      checkedAt: latest ? iso(latest.slot) : null, latencyMs: latest?.latency ?? null,
      detail: latest?.detail ?? "No checks recorded yet", history,
      latency: Array.from({ length: 288 }, (_, index) => {
        const time = latencyStart + index * 300000;
        return { at: iso(time), ms: latencies.has(time) && latencies.get(time) !== null ? Math.round(latencies.get(time)) : null };
      }),
    };
  });
  const rows = db.prepare("SELECT * FROM incidents WHERE ended IS NULL OR ended >= ? ORDER BY started DESC LIMIT 200").all(since);
  return {
    schema: 1, generatedAt: iso(now), startedAt: db.prepare("SELECT value FROM metadata WHERE key = 'started'").get()?.value != null ? iso(db.prepare("SELECT value FROM metadata WHERE key = 'started'").get().value) : null,
    intervalSeconds: 60, staleAfterSeconds: 180, region, services,
    incidents: rows.map((row) => ({ id: String(row.id), service: row.service, startedAt: iso(row.started), detectedAt: iso(row.detected), resolvedAt: row.ended ? iso(row.ended) : null, detail: row.detail })),
    maintenance: validateMaintenance(maintenance).filter((item) => Date.parse(item.endsAt) >= since).sort((a, b) => a.startsAt.localeCompare(b.startsAt)),
  };
}

export function prune(db, now = Date.now()) {
  const since = Math.floor(now / DAY) * DAY - (RETENTION_DAYS - 1) * DAY;
  db.prepare("DELETE FROM checks WHERE slot < ?").run(since);
  db.prepare("DELETE FROM incidents WHERE ended < ?").run(since);
}
