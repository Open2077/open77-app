"use client";

import { useId, useMemo, useState, type PointerEvent } from "react";

import { Tag } from "@/components/ui/chip";
import { Table } from "@/components/ui/data";
import { useLocale, useMessages } from "@/i18n/client";
import { LOCALE_INFO, type Locale } from "@/i18n/config";
import { fill, formatNumber, plural } from "@/i18n/format";
import type { Messages } from "@/i18n/types";
import { dayState, percent } from "@/lib/status/model";
import type { Day, Service, ServiceState } from "@/lib/status/model";

import styles from "./status.module.css";

type StatusMessages = Messages["status"];

/**
 * Dates, percentages and durations in the page language. English keeps the
 * en-GB day-month order it always had; times are UTC everywhere.
 */
export function statusFormat(locale: Locale, m: StatusMessages) {
  const dateTag = locale === "en" ? "en-GB" : LOCALE_INFO[locale].tag;
  const utcTime = (date: string) => new Date(date).toLocaleTimeString(dateTag, { timeZone: "UTC", hour: "2-digit", minute: "2-digit" });
  return {
    m,
    locale,
    utc: (date: string) =>
      new Date(date).toLocaleString(dateTag, { timeZone: "UTC", day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" }) +
      " UTC",
    utcTime,
    utcDay: (date: string) => new Date(date).toLocaleDateString(dateTag, { timeZone: "UTC", day: "2-digit", month: "short" }),
    /** {@link percent}'s rounding (never up to 100 %), written the language's way. */
    pct: (value: number | null) => {
      if (locale === "en" || value === null) return percent(value);
      const floored = value < 100 ? Math.floor(value * 100) / 100 : 100;
      return formatNumber(locale, floored / 100, { style: "percent", minimumFractionDigits: 2, maximumFractionDigits: 2 });
    },
    count: (value: number) => formatNumber(locale, value),
    state: (state: ServiceState) => m.states[state],
    /** "4 min", "2 h 05 min": how long a closed incident lasted, as observed. */
    duration: (from: string, to: string) => {
      const minutes = Math.max(1, Math.round((Date.parse(to) - Date.parse(from)) / 60000));
      if (minutes < 60) return fill(m.duration.minutes, { count: minutes });
      const hours = Math.floor(minutes / 60);
      if (hours < 48) return fill(m.duration.hours, { hours, minutes: String(minutes % 60).padStart(2, "0") });
      return plural(locale, m.duration.days, Math.round(hours / 24));
    },
  };
}

export type StatusFormat = ReturnType<typeof statusFormat>;

export function useStatusFormat(): StatusFormat {
  const locale = useLocale();
  const m = useMessages("status");
  return useMemo(() => statusFormat(locale, m), [locale, m]);
}

/** Status colours carry meaning of their own: cyan = healthy, yellow = slow, red = down, slate = unknown. */
const TAG_TONE: Record<ServiceState, "blue" | "yellow" | "red" | "neutral"> = {
  operational: "blue",
  degraded: "yellow",
  outage: "red",
  unknown: "neutral",
};

/** A service state: lamp + label, never colour alone. */
export function StateTag({ state, label }: { state: ServiceState; label?: string }) {
  const f = useStatusFormat();
  return (
    <Tag tone={TAG_TONE[state]} className={styles.stateTag}>
      <span className={styles.lamp} data-state={state} aria-hidden="true" />
      {label ?? f.state(state)}
    </Tag>
  );
}

/** The skewed swatch used by the legend. */
export function Swatch({ state, partial = false }: { state: ServiceState; partial?: boolean }) {
  return <span className={styles.swatch} data-state={state} data-partial={partial || undefined} aria-hidden="true" />;
}

/** One bar per UTC day; each bar is a button that reveals the day's numbers. */
export function DayBars({ history, days, name }: { history: Day[]; days: number; name: string }) {
  const f = useStatusFormat();
  const b = f.m.bars;
  const [selected, setSelected] = useState<Day | null>(null);
  const shown = history.slice(-days);
  const availability = (day: Day, empty: string) =>
    day.checked ? fill(b.available, { percent: f.pct((day.available / day.checked) * 100) }) : empty;
  return (
    <div className={styles.barsBlock}>
      <div
        className={styles.bars}
        data-days={days}
        style={{ gridTemplateColumns: `repeat(${days}, minmax(0, 1fr))` }}
        role="group"
        aria-label={fill(b.group, { name, days })}
      >
        {shown.map((day) => {
          const label = fill(b.day, {
            date: day.date,
            availability: availability(day, b.noData),
            checked: f.count(day.checked),
            expected: f.count(day.expected),
            failed: f.count(day.failed),
            slow: f.count(day.slow),
          });
          return (
            <button
              key={day.date}
              type="button"
              className={styles.bar}
              data-state={dayState(day)}
              data-partial={day.checked > 0 && day.checked < day.expected}
              aria-label={label}
              title={label}
              aria-pressed={selected?.date === day.date}
              onClick={() => setSelected(selected?.date === day.date ? null : day)}
            />
          );
        })}
      </div>
      <div className={styles.axis} aria-hidden="true">
        <span>{shown[0]?.date}</span>
        <span className={styles.axisRule} />
        <span>{b.today}</span>
      </div>
      {selected ? (
        <p className={styles.dayDetail} role="status">
          <span className={styles.prompt} aria-hidden="true">{">"}</span>
          {fill(b.detail, {
            date: selected.date,
            availability: availability(selected, b.noObservations),
            checked: f.count(selected.checked),
            expected: f.count(selected.expected),
            failed: f.count(selected.failed),
            slow: f.count(selected.slow),
          })}
        </p>
      ) : null}
    </div>
  );
}

const WIDTH = 800;
const HEIGHT = 200;
const TOP = 14;
const BOTTOM = 186;

/** 24 hours of five-minute response-time buckets. Gaps stay gaps. */
export function LatencyChart({ service }: { service: Service | undefined }) {
  const f = useStatusFormat();
  const l = f.m.latency;
  const titleId = useId();
  const points = service?.latency ?? [];
  const measured = points.filter((point) => point.ms !== null);
  const max = Math.max(100, ...measured.map((point) => point.ms ?? 0));
  const ceiling = Math.ceil(max / 50) * 50;
  const average = measured.length ? Math.round(measured.reduce((sum, point) => sum + (point.ms ?? 0), 0) / measured.length) : null;
  const peak = measured.length ? Math.max(...measured.map((point) => point.ms ?? 0)) : null;
  const x = (index: number) => (index / Math.max(points.length - 1, 1)) * WIDTH;
  const y = (ms: number) => BOTTOM - (ms / ceiling) * (BOTTOM - TOP);

  // One path per connected run, so a missing sample is never bridged.
  const runs: Array<Array<{ x: number; y: number }>> = [];
  let run: Array<{ x: number; y: number }> = [];
  points.forEach((point, index) => {
    if (point.ms === null) {
      if (run.length) runs.push(run);
      run = [];
      return;
    }
    run.push({ x: x(index), y: y(point.ms) });
  });
  if (run.length) runs.push(run);
  const line = runs.map((segment) => segment.map((p, i) => `${i ? "L" : "M"}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(" ")).join(" ");
  const area = runs
    .filter((segment) => segment.length > 1)
    .map((segment) => `M${segment[0]!.x.toFixed(1)},${BOTTOM} ${segment.map((p) => `L${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(" ")} L${segment.at(-1)!.x.toFixed(1)},${BOTTOM} Z`)
    .join(" ");

  const [hover, setHover] = useState<number | null>(null);
  const point = hover !== null ? points[hover] : undefined;
  function track(event: PointerEvent<HTMLDivElement>) {
    if (!points.length) return;
    const rect = event.currentTarget.getBoundingClientRect();
    const ratio = Math.min(1, Math.max(0, (event.clientX - rect.left) / rect.width));
    setHover(Math.round(ratio * (points.length - 1)));
  }

  return (
    <div className={styles.latency}>
      <div className={styles.latencyStats}>
        <p>
          <strong>{average === null ? "—" : average}</strong>
          {average === null ? null : <span className={styles.unit}>ms</span>}
          <span className={styles.latencyLabel}>{l.average}</span>
        </p>
        <p>
          <strong>{peak === null ? "—" : peak}</strong>
          {peak === null ? null : <span className={styles.unit}>ms</span>}
          <span className={styles.latencyLabel}>{l.slowest}</span>
        </p>
        <p>
          <strong>{measured.length}</strong>
          <span className={styles.unit}>/ {points.length || 288}</span>
          <span className={styles.latencyLabel}>{l.measured}</span>
        </p>
      </div>
      <div className={styles.chart} onPointerMove={track} onPointerLeave={() => setHover(null)}>
        <span className={styles.chartTick} style={{ top: `${(TOP / HEIGHT) * 100}%` }} aria-hidden="true">
          {ceiling} ms
        </span>
        <span className={styles.chartTick} style={{ top: `${(((TOP + BOTTOM) / 2) / HEIGHT) * 100}%` }} aria-hidden="true">
          {ceiling / 2} ms
        </span>
        <svg
          viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
          preserveAspectRatio="none"
          role="img"
          aria-labelledby={titleId}
        >
          <title id={titleId}>
            {fill(l.chartTitle, { service: service?.name ?? l.service, count: f.count(measured.length) })}
          </title>
          {[TOP, (TOP + BOTTOM) / 2, BOTTOM].map((lineY) => (
            <line key={lineY} x1="0" y1={lineY} x2={WIDTH} y2={lineY} className={lineY === BOTTOM ? styles.baseline : styles.gridLine} />
          ))}
          {area ? <path d={area} className={styles.area} /> : null}
          <path d={line} className={styles.trace} />
          {measured.length < 3
            ? points.map((p, index) => (p.ms === null ? null : <circle key={p.at} cx={x(index)} cy={y(p.ms)} r="4" className={styles.chartPoint} />))
            : null}
          {hover !== null ? <line x1={x(hover)} x2={x(hover)} y1={TOP} y2={BOTTOM} className={styles.crosshair} /> : null}
        </svg>
        {point ? (
          <div
            className={styles.tooltip}
            style={{ left: `${(x(hover ?? 0) / WIDTH) * 100}%` }}
            data-flip={(hover ?? 0) > points.length * 0.7 || undefined}
            aria-hidden="true"
          >
            <strong>{point.ms === null ? l.noSample : `${point.ms} ms`}</strong>
            <span>{f.utcTime(point.at)} UTC</span>
          </div>
        ) : null}
        {!measured.length ? <span className={styles.chartEmpty}>{l.empty}</span> : null}
      </div>
      <div className={styles.axis} aria-hidden="true">
        <span>{l.dayAgo}</span>
        <span className={styles.axisRule} />
        <span>{l.halfDay}</span>
        <span className={styles.axisRule} />
        <span>{l.now}</span>
      </div>
      <details className={styles.samples}>
        <summary>{l.view}</summary>
        <Table caption={l.caption} dense className={styles.sampleTable}>
          <thead>
            <tr>
              <th scope="col">{l.time}</th>
              <th scope="col" data-numeric>
                {l.responseTime}
              </th>
            </tr>
          </thead>
          <tbody>
            {[...points].reverse().map((p) => (
              <tr key={p.at}>
                <td>{f.utc(p.at)}</td>
                <td data-numeric>{p.ms === null ? l.noSuccessful : `${p.ms} ms`}</td>
              </tr>
            ))}
          </tbody>
        </Table>
      </details>
    </div>
  );
}
