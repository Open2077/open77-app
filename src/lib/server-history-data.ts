export type PlayerHistoryPoint = { timestampUtc: string; capturedAtUtc: string; connectedPlayers: number; maximumPlayers: number };
export type PlayerHistory = { serverId: string; hours: 24 | 48; intervalSeconds: number; fromUtc: string; toUtc: string; points: PlayerHistoryPoint[] };

export function validatePlayerHistory(value: unknown, serverId: string, hours: 24 | 48): PlayerHistory {
  const data = value as PlayerHistory | null;
  if (!data || data.serverId !== serverId || data.hours !== hours || data.intervalSeconds !== 600 || !Array.isArray(data.points) || data.points.length > hours * 6) throw new Error("Invalid activity response");
  const from = Date.parse(data.fromUtc), to = Date.parse(data.toUtc);
  if (!Number.isFinite(from) || !Number.isFinite(to) || to <= from || to - from > hours * 3_600_000) throw new Error("Invalid activity window");
  let previous = from;
  for (const point of data.points) {
    const time = Date.parse(point?.timestampUtc);
    if (!Number.isFinite(time) || time <= previous || time > to || !Number.isSafeInteger(point.connectedPlayers) || point.connectedPlayers < 0 || !Number.isSafeInteger(point.maximumPlayers) || point.maximumPlayers < 0) throw new Error("Invalid activity sample");
    previous = time;
  }
  return data;
}

/** Only measured values contribute to statistics; a missing reading is not zero. */
export function historyStats(data: PlayerHistory) {
  const counts = data.points.map(point => point.connectedPlayers);
  return { peak: counts.length ? Math.max(...counts) : null, average: counts.length ? Math.round(counts.reduce((sum, n) => sum + n, 0) / counts.length) : null };
}

export function historyGeometry(data: PlayerHistory, width: number, height = 220) {
  const first = Date.parse(data.points[0]?.timestampUtc ?? data.fromUtc);
  const last = Date.parse(data.points.at(-1)?.timestampUtc ?? data.toUtc);
  const single = data.points.length === 1;
  const start = single ? first - data.intervalSeconds * 500 : first;
  const end = single ? last + data.intervalSeconds * 500 : last;
  const maximum = Math.max(1, Math.ceil((historyStats(data).peak ?? 0) / 4)) * 4;
  const left = 34, right = width - 12, top = 12, bottom = height - 36;
  const x = (time: number) => left + (time - start) / Math.max(1, end - start) * (right - left);
  const y = (count: number) => bottom - count / maximum * (bottom - top);
  const points = data.points.map(point => ({ x: x(Date.parse(point.timestampUtc)), y: y(point.connectedPlayers), point }));
  const line = points.map((point, index) => `${index ? "L" : "M"}${point.x.toFixed(2)},${point.y.toFixed(2)}`).join(" ");
  const area = points.length > 1 ? `${line} L${right},${bottom} L${left},${bottom} Z` : "";
  return { start, end, first, last, maximum, left, right, top, bottom, points, line, area, x, y };
}
