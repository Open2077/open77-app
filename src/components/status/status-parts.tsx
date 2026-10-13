"use client";

import { useId, useState, type PointerEvent } from "react";

import { Tag } from "@/components/ui/chip";
import { Table } from "@/components/ui/data";
import { dayState, LABELS, percent } from "@/lib/status/model";
import type { Day, Service, ServiceState } from "@/lib/status/model";

import styles from "./status.module.css";

export const utc = (date: string) =>
  new Date(date).toLocaleString("en-GB", { timeZone: "UTC", day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" }) + " UTC";
export const utcTime = (date: string) =>
  new Date(date).toLocaleTimeString("en-GB", { timeZone: "UTC", hour: "2-digit", minute: "2-digit" });
export const utcDay = (date: string) =>
  new Date(date).toLocaleDateString("en-GB", { timeZone: "UTC", day: "2-digit", month: "short" });

/** Status colours carry meaning of their own: cyan = healthy, yellow = slow, red = down, slate = unknown. */
const TAG_TONE: Record<ServiceState, "blue" | "yellow" | "red" | "neutral"> = {
  operational: "blue",
  degraded: "yellow",
  outage: "red",
  unknown: "neutral",
};

/** A service state: lamp + label, never colour alone. */
export function StateTag({ state, label }: { state: ServiceState; label?: string }) {
  return (
    <Tag tone={TAG_TONE[state]} className={styles.stateTag}>
      <span className={styles.lamp} data-state={state} aria-hidden="true" />
      {label ?? LABELS[state]}
    </Tag>
  );
}

/** The skewed swatch used by the legend. */
export function Swatch({ state, partial = false }: { state: ServiceState; partial?: boolean }) {
  return <span className={styles.swatch} data-state={state} data-partial={partial || undefined} aria-hidden="true" />;
}

/** One bar per UTC day; each bar is a button that reveals the day's numbers. */
export function DayBars({ history, days, name }: { history: Day[]; days: number; name: string }) {
  const [selected, setSelected] = useState<Day | null>(null);
  const shown = history.slice(-days);
  return (
    <div className={styles.barsBlock}>
      <div
        className={styles.bars}
        data-days={days}
        style={{ gridTemplateColumns: `repeat(${days}, minmax(0, 1fr))` }}
        role="group"
        aria-label={`${name}: ${days}-day availability, select a day for details`}
      >
        {shown.map((day) => {
          const label = `${day.date}: ${day.checked ? percent((day.available / day.checked) * 100) + " available" : "no data"}, ${day.checked} of ${day.expected} checks, ${day.failed} failed, ${day.slow} slow`;
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
        <span>Today · UTC</span>
      </div>
      {selected ? (
        <p className={styles.dayDetail} role="status">
          <span className={styles.prompt} aria-hidden="true">{">"}</span>
          {selected.date} · {selected.checked ? percent((selected.available / selected.checked) * 100) + " available" : "No observations"} · {selected.checked}/{selected.expected} checks · {selected.failed} failed · {selected.slow} slow
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
          <span className={styles.latencyLabel}>Average · last 24 h</span>
        </p>
        <p>
          <strong>{peak === null ? "—" : peak}</strong>
          {peak === null ? null : <span className={styles.unit}>ms</span>}
          <span className={styles.latencyLabel}>Slowest bucket</span>
        </p>
        <p>
          <strong>{measured.length}</strong>
          <span className={styles.unit}>/ {points.length || 288}</span>
          <span className={styles.latencyLabel}>Buckets measured</span>
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
            {`${service?.name ?? "Service"} response time over 24 hours. ${measured.length} measured five-minute buckets. Gaps mean no successful checks.`}
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
            <strong>{point.ms === null ? "No sample" : `${point.ms} ms`}</strong>
            <span>{utcTime(point.at)} UTC</span>
          </div>
        ) : null}
        {!measured.length ? <span className={styles.chartEmpty}>{"// No response-time samples yet"}</span> : null}
      </div>
      <div className={styles.axis} aria-hidden="true">
        <span>24 h ago</span>
        <span className={styles.axisRule} />
        <span>12 h</span>
        <span className={styles.axisRule} />
        <span>Now</span>
      </div>
      <details className={styles.samples}>
        <summary>View response-time data</summary>
        <Table caption="Five-minute average check times, UTC, latest first" dense className={styles.sampleTable}>
          <thead>
            <tr>
              <th scope="col">Time</th>
              <th scope="col" data-numeric>
                Response time
              </th>
            </tr>
          </thead>
          <tbody>
            {[...points].reverse().map((p) => (
              <tr key={p.at}>
                <td>{utc(p.at)}</td>
                <td data-numeric>{p.ms === null ? "No successful sample" : `${p.ms} ms`}</td>
              </tr>
            ))}
          </tbody>
        </Table>
      </details>
    </div>
  );
}

/** "4 min", "2 h 05 min": how long a closed incident lasted, as observed. */
export function duration(from: string, to: string) {
  const minutes = Math.max(1, Math.round((Date.parse(to) - Date.parse(from)) / 60000));
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.floor(minutes / 60);
  if (hours < 48) return `${hours} h ${String(minutes % 60).padStart(2, "0")} min`;
  return `${Math.round(hours / 24)} days`;
}
