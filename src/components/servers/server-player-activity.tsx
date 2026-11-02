"use client";

import { useEffect, useId, useRef, useState } from "react";
import { historyGeometry, historyStats, type PlayerHistory } from "@/lib/server-history-data";
import { usePlayerHistory } from "./use-player-history";
import styles from "./server-player-activity.module.css";

export function ServerPeak({ id, preview = false }: { id: string; preview?: boolean }) {
  const element = useRef<HTMLSpanElement>(null);
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const observer = new IntersectionObserver(([entry]) => setVisible(entry?.isIntersecting ?? false));
    if (element.current) observer.observe(element.current);
    return () => observer.disconnect();
  }, []);
  const { data, loading, error } = usePlayerHistory(id, 48, visible && !preview);
  const peak = data ? historyStats(data).peak : null;
  return <span ref={element} className={styles.peak} data-server-peak title={error ?? "Highest recorded player count in the last 48 hours"}>
    {peak !== null ? <>Peak <b>{peak}</b> <span>· 48h</span></> : loading ? <span className={styles.loading}>Peak…</span> : "Peak —"}
  </span>;
}

export function ServerPlayerActivity({ id, preview = false }: { id: string; preview?: boolean }) {
  const [hours, setHours] = useState<24 | 48>(48);
  const { data, loading, error } = usePlayerHistory(id, hours, !preview);
  const stats = data ? historyStats(data) : null;
  return <section className={styles.activity} aria-label="Player activity" aria-busy={loading} data-player-activity>
    <header className={styles.heading}><div><h2>Player activity</h2><p>Connected players over time</p></div><div className={styles.periods} aria-label="Activity period">
      {([24, 48] as const).map(period => <button key={period} type="button" aria-pressed={hours === period} onClick={() => setHours(period)}>{period}h</button>)}
    </div></header>
    {stats?.peak !== null && stats?.peak !== undefined ? <dl className={styles.stats}><div><dd>{stats.peak}</dd><dt>Recorded peak</dt></div><div><dd>{stats.average}</dd><dt>Recorded average</dt></div></dl> : null}
    {data?.points.length ? <ActivityChart key={`${id}:${hours}`} data={data} /> : <div className={styles.empty} role="status">
      {loading || (!data && !error && !preview) ? <><span className={styles.scan} aria-hidden="true" />Loading player activity…</> : preview ? "Activity is available for live public servers." : error ?? "The first activity reading has not been recorded yet."}
    </div>}
    {data && error ? <p className={styles.notice} role="status">Showing the last activity received. {error}</p> : null}
  </section>;
}

function ActivityChart({ data }: { data: PlayerHistory }) {
  const host = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(600);
  const [index, setIndex] = useState<number | null>(null);
  const gradient = useId();
  useEffect(() => {
    const observer = new ResizeObserver(([entry]) => setWidth(Math.max(250, entry?.contentRect.width ?? 600)));
    if (host.current) observer.observe(host.current);
    return () => observer.disconnect();
  }, []);
  const plot = historyGeometry(data, width);
  const selected = index === null ? null : plot.points[index];
  const time = (value: number) => new Date(value).toLocaleString(undefined, { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
  const tickCount = width < 460 ? 3 : 5;
  const ticks = data.points.length === 1 ? [plot.first] : Array.from({ length: tickCount }, (_, i) => plot.start + (plot.end - plot.start) * i / (tickCount - 1));
  const span = Math.round((plot.last - plot.first) / 60_000);
  const partial = plot.first - Date.parse(data.fromUtc) > data.intervalSeconds * 1000 || Date.parse(data.toUtc) - plot.last >= data.intervalSeconds * 1000;
  const coverage = data.points.length === 1 ? "First reading" : partial ? `${Math.floor(span / 60)}h ${span % 60}m recorded` : `Last ${data.hours} hours`;
  return <div ref={host} className={styles.chart}>
    <div tabIndex={0} role="group" aria-label="Player activity chart. Use left and right arrows to explore recorded readings." className={styles.plot}
      onKeyDown={event => {
        if (!["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)) return;
        event.preventDefault(); event.stopPropagation();
        setIndex(event.key === "Home" ? 0 : event.key === "End" ? plot.points.length - 1 : Math.max(0, Math.min(plot.points.length - 1, (index ?? 0) + (event.key === "ArrowRight" ? 1 : -1))));
      }}
      onPointerMove={event => {
        const rect = event.currentTarget.getBoundingClientRect();
        const pointer = (event.clientX - rect.left) * width / rect.width;
        let nearest = 0;
        plot.points.forEach((point, i) => { if (Math.abs(point.x - pointer) < Math.abs(plot.points[nearest]!.x - pointer)) nearest = i; });
        setIndex(nearest);
      }} onPointerLeave={() => setIndex(null)} onBlur={() => setIndex(null)}>
      <svg viewBox={`0 0 ${width} 220`} role="img" aria-label={`Player activity, ${coverage}. Peak ${historyStats(data).peak} players.`}>
        <defs><linearGradient id={gradient} x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="currentColor" stopOpacity=".23" /><stop offset="100%" stopColor="currentColor" stopOpacity=".015" /></linearGradient></defs>
        {[0, 1, 2, 3, 4].map(i => <g key={i} className={styles.grid}><line x1={plot.left} x2={plot.right} y1={plot.y(i * plot.maximum / 4)} y2={plot.y(i * plot.maximum / 4)} /><text x={plot.left - 8} y={plot.y(i * plot.maximum / 4) + 3} textAnchor="end">{i * plot.maximum / 4}</text></g>)}
        {plot.area ? <path d={plot.area} fill={`url(#${gradient})`} data-history-area /> : null}
        {plot.points.length > 1 ? <path d={plot.line} fill="none" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" data-history-line /> : <circle cx={plot.points[0]!.x} cy={plot.points[0]!.y} r="4" fill="currentColor" data-history-single />}
        {ticks.map((tick, i) => <text key={tick} className={styles.tick} x={plot.x(tick)} y="210" textAnchor={ticks.length === 1 ? "middle" : i === 0 ? "start" : i === ticks.length - 1 ? "end" : "middle"}>{time(tick)}</text>)}
        {selected ? <g><line className={styles.cursor} x1={selected.x} x2={selected.x} y1={plot.top} y2={plot.bottom} /><circle cx={selected.x} cy={selected.y} r="4" fill="currentColor" /></g> : null}
      </svg>
      {selected ? <output className={styles.tooltip} style={{ left: `${Math.max(22, Math.min(78, selected.x / width * 100))}%` }}><strong>{selected.point.connectedPlayers} players</strong><span>{time(Date.parse(selected.point.timestampUtc))}</span></output> : null}
    </div>
    <div className={styles.legend}><span><i />Players · every 10 min</span><span>{coverage}</span><span>Local time</span></div>
    <p className={styles.caption}>Line connects recorded readings. Intermediate values are not measured.</p>
  </div>;
}
