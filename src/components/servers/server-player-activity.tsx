"use client";

import { useEffect, useId, useRef, useState, type ReactNode } from "react";
import { fill, rich } from "@/i18n/format";
import { historyGeometry, historyStats, type PlayerHistory } from "@/lib/server-history-data";
import { useServerFormat } from "./server-format";
import { usePlayerHistory } from "./use-player-history";
import styles from "./server-player-activity.module.css";

const PEAK_TAGS = {
  b: (chunk: ReactNode) => <b>{chunk}</b>,
  span: (chunk: ReactNode) => <span>{chunk}</span>,
};

export function ServerPeak({ id, preview = false }: { id: string; preview?: boolean }) {
  const element = useRef<HTMLSpanElement>(null);
  const [visible, setVisible] = useState(false);
  const m = useServerFormat().m.activity;
  useEffect(() => {
    const observer = new IntersectionObserver(([entry]) => setVisible(entry?.isIntersecting ?? false));
    if (element.current) observer.observe(element.current);
    return () => observer.disconnect();
  }, []);
  const { data, loading, error } = usePlayerHistory(id, 48, visible && !preview);
  const peak = data ? historyStats(data).peak : null;
  return <span ref={element} className={styles.peak} data-server-peak title={error ? m.errors[error] : m.peakTitle}>
    {peak !== null ? rich(m.peak, PEAK_TAGS, { count: peak }) : loading ? <span className={styles.loading}>{m.peakLoading}</span> : m.peakNone}
  </span>;
}

export function ServerPlayerActivity({ id, preview = false }: { id: string; preview?: boolean }) {
  const [hours, setHours] = useState<24 | 48>(48);
  const { data, loading, error } = usePlayerHistory(id, hours, !preview);
  const m = useServerFormat().m.activity;
  const stats = data ? historyStats(data) : null;
  const errorText = error ? m.errors[error] : null;
  return <section className={styles.activity} aria-label={m.title} aria-busy={loading} data-player-activity>
    <header className={styles.heading}><div><h2>{m.title}</h2><p>{m.subtitle}</p></div><div className={styles.periods} aria-label={m.periods}>
      {([24, 48] as const).map(period => <button key={period} type="button" aria-pressed={hours === period} onClick={() => setHours(period)}>{fill(m.period, { hours: period })}</button>)}
    </div></header>
    {stats?.peak !== null && stats?.peak !== undefined ? <dl className={styles.stats}><div><dd>{stats.peak}</dd><dt>{m.recordedPeak}</dt></div><div><dd>{stats.average}</dd><dt>{m.recordedAverage}</dt></div></dl> : null}
    {data?.points.length ? <ActivityChart key={`${id}:${hours}`} data={data} /> : <div className={styles.empty} role="status">
      {loading || (!data && !error && !preview) ? <><span className={styles.scan} aria-hidden="true" />{m.loading}</> : preview ? m.previewOnly : errorText ?? m.firstPending}
    </div>}
    {data && errorText ? <p className={styles.notice} role="status">{fill(m.stale, { error: errorText })}</p> : null}
  </section>;
}

function ActivityChart({ data }: { data: PlayerHistory }) {
  const host = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(600);
  const [index, setIndex] = useState<number | null>(null);
  const gradient = useId();
  const f = useServerFormat();
  const m = f.m.activity.chart;
  useEffect(() => {
    const observer = new ResizeObserver(([entry]) => setWidth(Math.max(250, entry?.contentRect.width ?? 600)));
    if (host.current) observer.observe(host.current);
    return () => observer.disconnect();
  }, []);
  const plot = historyGeometry(data, width);
  const selected = index === null ? null : plot.points[index];
  const time = f.moment;
  const tickCount = width < 460 ? 3 : 5;
  const ticks = data.points.length === 1 ? [plot.first] : Array.from({ length: tickCount }, (_, i) => plot.start + (plot.end - plot.start) * i / (tickCount - 1));
  const span = Math.round((plot.last - plot.first) / 60_000);
  const partial = plot.first - Date.parse(data.fromUtc) > data.intervalSeconds * 1000 || Date.parse(data.toUtc) - plot.last >= data.intervalSeconds * 1000;
  const coverage = data.points.length === 1 ? m.firstReading : partial ? fill(m.recorded, { hours: Math.floor(span / 60), minutes: span % 60 }) : f.count(m.lastHours, data.hours);
  return <div ref={host} className={styles.chart}>
    <div tabIndex={0} role="group" aria-label={m.label} className={styles.plot}
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
      <svg viewBox={`0 0 ${width} 220`} role="img" aria-label={f.count(m.summary, historyStats(data).peak ?? 0, { coverage })}>
        <defs><linearGradient id={gradient} x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="currentColor" stopOpacity=".23" /><stop offset="100%" stopColor="currentColor" stopOpacity=".015" /></linearGradient></defs>
        {[0, 1, 2, 3, 4].map(i => <g key={i} className={styles.grid}><line x1={plot.left} x2={plot.right} y1={plot.y(i * plot.maximum / 4)} y2={plot.y(i * plot.maximum / 4)} /><text x={plot.left - 8} y={plot.y(i * plot.maximum / 4) + 3} textAnchor="end">{i * plot.maximum / 4}</text></g>)}
        {plot.area ? <path d={plot.area} fill={`url(#${gradient})`} data-history-area /> : null}
        {plot.points.length > 1 ? <path d={plot.line} fill="none" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" data-history-line /> : <circle cx={plot.points[0]!.x} cy={plot.points[0]!.y} r="4" fill="currentColor" data-history-single />}
        {ticks.map((tick, i) => <text key={tick} className={styles.tick} x={plot.x(tick)} y="210" textAnchor={ticks.length === 1 ? "middle" : i === 0 ? "start" : i === ticks.length - 1 ? "end" : "middle"}>{time(tick)}</text>)}
        {selected ? <g><line className={styles.cursor} x1={selected.x} x2={selected.x} y1={plot.top} y2={plot.bottom} /><circle cx={selected.x} cy={selected.y} r="4" fill="currentColor" /></g> : null}
      </svg>
      {selected ? <output className={styles.tooltip} style={{ left: `${Math.max(22, Math.min(78, selected.x / width * 100))}%` }}><strong>{f.count(m.players, selected.point.connectedPlayers)}</strong><span>{time(Date.parse(selected.point.timestampUtc))}</span></output> : null}
    </div>
    <div className={styles.legend}><span><i />{m.legendPlayers}</span><span>{coverage}</span><span>{m.localTime}</span></div>
    <p className={styles.caption}>{m.caption}</p>
  </div>;
}
