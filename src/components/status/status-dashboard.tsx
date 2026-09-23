"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { currentState, dayState, isStale, LABELS, overallState, parseSnapshot, percent, statistics } from "@/lib/status/model";
import type { Day, Service, ServiceState, StatusSnapshot } from "@/lib/status/model";
import styles from "./status.module.css";

const utc = (date: string) => new Date(date).toLocaleString("en-GB", { timeZone: "UTC", day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" }) + " UTC";
const TITLES: Record<ServiceState, string> = {
  operational: "All systems operational", degraded: "Some services are responding slowly", outage: "A service disruption was detected", unknown: "Awaiting fresh monitoring data",
};

function Badge({ state }: { state: ServiceState }) {
  return <span className={styles.badge} data-state={state}><span className={styles.dot} />{LABELS[state]}</span>;
}

function DayBars({ history, days }: { history: Day[]; days: number }) {
  const [selected, setSelected] = useState<Day | null>(null);
  return <div>
    <div className={styles.bars} style={{ gridTemplateColumns: `repeat(${days}, minmax(0, 1fr))` }} role="group" aria-label={`${days}-day availability, select a day for details`}>
      {history.slice(-days).map((day) => {
        const label = `${day.date}: ${day.checked ? percent(day.available / day.checked * 100) + " available" : "no data"}, ${day.checked} of ${day.expected} checks, ${day.failed} failed, ${day.slow} slow`;
        return <button key={day.date} type="button" data-state={dayState(day)} data-partial={day.checked > 0 && day.checked < day.expected}
          aria-label={label} title={label} aria-pressed={selected?.date === day.date}
          onClick={() => setSelected(selected?.date === day.date ? null : day)} />;
      })}
    </div>
    <div className={styles.barCaption}><span>{history.at(-days)?.date}</span><span>Today · UTC</span></div>
    {selected && <p className={styles.dayDetail} role="status">{selected.date} · {selected.checked ? percent(selected.available / selected.checked * 100) + " available" : "No observations"} · {selected.checked}/{selected.expected} checks · {selected.failed} failed · {selected.slow} slow</p>}
  </div>;
}

function LatencyChart({ service }: { service: Service | undefined }) {
  const points = service?.latency ?? [];
  const measured = points.filter((point) => point.ms !== null);
  const max = Math.max(100, ...measured.map((point) => point.ms ?? 0));
  const average = measured.length ? Math.round(measured.reduce((sum, point) => sum + (point.ms ?? 0), 0) / measured.length) : null;
  let path = "";
  let connected = false;
  points.forEach((point, index) => {
    if (point.ms === null) { connected = false; return; }
    path += `${connected ? "L" : "M"}${(index / Math.max(points.length - 1, 1) * 800).toFixed(1)},${(170 - point.ms / max * 145).toFixed(1)} `;
    connected = true;
  });
  return <>
    <div className={styles.chartSummary}><strong>{average === null ? "—" : `${average} ms`}</strong><span>average check time · last 24 hours</span></div>
    <div className={styles.chart}>
      <span className={styles.chartMax}>{max} ms</span>
      <svg viewBox="0 0 800 190" role="img" aria-label={`${service?.name ?? "Service"} response time over 24 hours. ${measured.length} measured five-minute buckets. Gaps mean no successful checks.`} preserveAspectRatio="none">
        {[25, 72, 120, 170].map((y) => <line key={y} x1="0" y1={y} x2="800" y2={y} className={styles.gridLine} />)}
        <path d={path} className={styles.trace} />
        {measured.length < 3 && points.map((point, index) => point.ms === null ? null : <circle key={point.at} cx={index / 287 * 800} cy={170 - point.ms / max * 145} r="3" className={styles.chartPoint} />)}
      </svg>
      {!measured.length && <span className={styles.chartEmpty}>No response-time samples yet</span>}
    </div>
    <div className={styles.barCaption}><span>24 hours ago</span><span>Now</span></div>
    <details className={styles.samples}><summary>View response-time data</summary>
      <div className={styles.tableScroll}><table><caption>Five-minute average check times · UTC · latest first</caption><thead><tr><th scope="col">Time</th><th scope="col">Response time</th></tr></thead>
        <tbody>{[...points].reverse().map((point) => <tr key={point.at}><td>{utc(point.at)}</td><td>{point.ms === null ? "No successful sample" : `${point.ms} ms`}</td></tr>)}</tbody></table></div>
    </details>
  </>;
}

export function StatusDashboard() {
  const [snapshot, setSnapshot] = useState<StatusSnapshot | null>(null);
  const [error, setError] = useState(false);
  const [loading, setLoading] = useState(true);
  const [now, setNow] = useState(0);
  const [days, setDays] = useState(90);
  const [selectedService, setSelectedService] = useState("master");
  const active = useRef<AbortController | null>(null);
  const refresh = useCallback(async () => {
    if (active.current) return;
    const controller = new AbortController();
    active.current = controller;
    setLoading(true);
    try {
      const response = await fetch("/api/status", { cache: "no-store", signal: AbortSignal.any([controller.signal, AbortSignal.timeout(10000)]) });
      const data = response.ok ? parseSnapshot(await response.json()) : null;
      if (!data) throw new Error("No monitoring data");
      setSnapshot(data);
      setError(false);
    } catch { if (!controller.signal.aborted) setError(true); }
    finally {
      if (active.current === controller) active.current = null;
      if (!controller.signal.aborted) { setNow(Date.now()); setLoading(false); }
    }
  }, []);

  useEffect(() => {
    const initial = setTimeout(() => void refresh(), 0);
    const poll = setInterval(() => { if (!document.hidden) void refresh(); }, 60000);
    const clock = setInterval(() => setNow(Date.now()), 10000);
    const visible = () => { if (!document.hidden) { setNow(Date.now()); void refresh(); } };
    document.addEventListener("visibilitychange", visible);
    return () => { clearTimeout(initial); clearInterval(poll); clearInterval(clock); document.removeEventListener("visibilitychange", visible); active.current?.abort(); active.current = null; };
  }, [refresh]);

  const stale = !!snapshot && isStale(snapshot, now);
  const states = snapshot?.services.map((service) => currentState(service, snapshot, now)) ?? [];
  const state = overallState(states);
  const total = statistics(snapshot?.services.flatMap((service) => service.history.slice(-days)) ?? [], days * (snapshot?.services.length ?? 1));
  const openIncidents = snapshot?.incidents.filter((incident) => !incident.resolvedAt) ?? [];
  const maintenance = snapshot?.maintenance.filter((item) => Date.parse(item.endsAt) > now) ?? [];

  return <main id="main" className={styles.page}>
    <header className={styles.hero}>
      <div><p className={styles.eyebrow}>{"// OPEN NETWORK · SERVICE STATUS"}</p><h1>The network.<br /><em>At a glance.</em></h1><p className={styles.intro}>Live service health, measured availability and a transparent record of interruptions.</p></div>
      <div className={styles.heroActions}><a href="/api/status" target="_blank" rel="noreferrer">Status JSON ↗</a><button onClick={() => void refresh()} disabled={loading} className={styles.refresh}><span className={loading ? styles.spinner : undefined} aria-hidden="true">↻</span>{loading ? "Checking…" : "Refresh status"}</button></div>
    </header>

    <section className={styles.signal} data-state={state} aria-label="Current network status">
      <div className={styles.signalIcon} aria-hidden="true">{state === "operational" ? "✓" : state === "unknown" ? "·" : "!"}</div>
      <div className={styles.signalCopy} role="status"><h2>{loading && !snapshot ? "Connecting to the monitor…" : TITLES[state]}</h2><p>{snapshot ? `Last measured ${utc(snapshot.generatedAt)} · checks every 60 seconds` : "No service is marked healthy until a real check is received."}</p></div>
      <span className={styles.liveLabel}>{stale || !snapshot ? "NO LIVE SIGNAL" : "MONITOR CONNECTED"}</span>
    </section>
    {(error || stale) && <div className={styles.warning} role="alert"><strong>{stale ? "Monitoring data is out of date." : "The monitoring feed could not be refreshed."}</strong> {snapshot ? "The last recorded history remains below. Old checks are not treated as current health." : "This does not establish whether services are up or down. Please retry shortly."}</div>}
    <noscript><p className={styles.warning}>JavaScript is required for live updates. The <a href="/api/status">public JSON feed</a> is available without JavaScript.</p></noscript>

    <div className={styles.metrics}>
      <div><span>Services operational</span><strong>{snapshot ? `${states.filter((value) => value === "operational").length} / ${states.length}` : "—"}</strong></div>
      <div><span>{days}-day observed availability</span><strong>{percent(total.availability)}</strong></div>
      <div><span>Monitoring coverage</span><strong>{percent(snapshot ? total.coverage : null)}</strong></div>
      <div><span>Open detected incidents</span><strong>{snapshot ? openIncidents.length : "—"}</strong></div>
    </div>

    <section className={styles.services} aria-labelledby="services-title">
      <div className={styles.sectionHeading}><div><p className={styles.eyebrow}>01 / AVAILABILITY</p><h2 id="services-title">Platform services</h2></div><div className={styles.segmented} role="group" aria-label="Availability period">{[7, 30, 90].map((value) => <button key={value} aria-pressed={value === days} onClick={() => setDays(value)}>{value} days</button>)}</div></div>
      <div className={styles.legend}>{(["operational", "degraded", "outage", "unknown"] as const).map((value) => <Badge key={value} state={value} />)}<span>Striped = partial coverage</span></div>
      {!snapshot && <div className={styles.empty}>{loading ? "Loading measured service health…" : "Waiting for monitoring data. Availability history will appear here once collection is active."}</div>}
      {snapshot?.services.map((service) => {
        const stats = statistics(service.history, days);
        return <article key={service.id} className={styles.service}>
          <div className={styles.serviceHeading}><div><h3>{service.name}</h3><p>{service.description}</p></div><Badge state={currentState(service, snapshot, now)} /></div>
          <DayBars key={`${service.id}-${days}`} history={service.history} days={days} />
          <div className={styles.serviceStats}><span><b>{percent(stats.availability)}</b> available · {percent(stats.coverage)} coverage</span><span>{currentState(service, snapshot, now) === "unknown" ? "Awaiting a fresh check" : service.detail}{service.latencyMs !== null ? ` · ${service.latencyMs} ms last recorded` : ""}</span></div>
        </article>;
      })}
    </section>

    <div className={styles.lowerGrid}>
      <section className={styles.panel} aria-labelledby="latency-title"><div className={styles.sectionHeading}><div><p className={styles.eyebrow}>02 / RESPONSE TIME</p><h2 id="latency-title">Every millisecond counts.</h2></div></div>
        <label className={styles.selectLabel}>Service<select value={selectedService} onChange={(event) => setSelectedService(event.target.value)} disabled={!snapshot}>{snapshot ? snapshot.services.map((service) => <option key={service.id} value={service.id}>{service.name}</option>) : <option value="master">Master API</option>}</select></label>
        <LatencyChart service={snapshot?.services.find((service) => service.id === selectedService)} />
        <p className={styles.note}>End-to-end check duration, not in-game ping. CDN checks include release metadata and 4 KiB partial downloads. Missing samples are never joined across gaps.</p>
      </section>
      <section className={styles.panel} aria-labelledby="maintenance-title"><p className={styles.eyebrow}>03 / MAINTENANCE</p><h2 id="maintenance-title">Heads up.</h2>
        {!maintenance.length ? <div className={styles.calm}><span aria-hidden="true">◎</span><h3>{snapshot ? "No scheduled maintenance" : "Schedule unavailable"}</h3><p>{snapshot ? "No active or upcoming maintenance in the latest feed." : "Waiting for a monitoring snapshot."}</p></div> : maintenance.map((item) => <article className={styles.maintenance} key={item.id}><span className={styles.eyebrow}>{Date.parse(item.startsAt) <= now ? "IN PROGRESS" : "SCHEDULED"}</span><h3>{item.title}</h3><p>{item.message}</p><small>{utc(item.startsAt)} — {utc(item.endsAt)}</small><p>{item.services.map((id) => snapshot?.services.find((service) => service.id === id)?.name ?? id).join(" · ")}</p></article>)}
      </section>
    </div>

    <section className={styles.panel} aria-labelledby="incidents-title"><div className={styles.sectionHeading}><div><p className={styles.eyebrow}>04 / INCIDENT HISTORY</p><h2 id="incidents-title">The record, not the guesswork.</h2></div><span className={styles.note}>Last 90 days · newest first</span></div>
      {!snapshot?.incidents.length ? <div className={styles.empty}>{snapshot ? "No confirmed incidents recorded in the observed period." : "Incident history is unavailable until the monitor responds."}</div> : <ol className={styles.incidents}>{snapshot.incidents.map((incident) => <li key={incident.id}><span className={styles.incidentDot} data-state={incident.resolvedAt ? "operational" : "outage"} /><div><h3>{snapshot.services.find((service) => service.id === incident.service)?.name} <span>{incident.resolvedAt ? "Recovered" : "Recovery not confirmed"}</span></h3><p>{incident.detail}</p><p className={styles.note}>First detected {utc(incident.startedAt)}{incident.resolvedAt ? ` · Recovery confirmed ${utc(incident.resolvedAt)}` : " · Awaiting two successful checks"}</p></div></li>)}</ol>}
      <p className={styles.note}>Incidents open after two consecutive failed checks and close after two successful checks. Single failures still appear in availability. Detection is not a root-cause diagnosis.</p>
    </section>

    <details className={styles.method}><summary>How we measure availability</summary><div><p>Measurements come from {snapshot?.region ?? "the configured operator probe"}. A check runs every minute. This is a single monitoring vantage point, not a global service-level guarantee. Community game servers and end-to-end sign-in are not covered.</p><p>Availability = successful checks ÷ completed checks. Slow but successful responses remain available. Coverage = completed checks ÷ scheduled minute slots in the selected UTC calendar days. Unobserved periods, including before monitoring began, are unknown — never counted as uptime. Maintenance does not erase failed checks.</p><p>Daily bars show the worst observed result; stripes indicate incomplete coverage. The response graph averages successful checks in five-minute buckets. Data older than three minutes becomes unknown, even if the last result was healthy.</p><p>{snapshot?.startedAt ? `Collection started ${utc(snapshot.startedAt)}. ` : "Collection start is not yet known. "}History is retained for 90 days. A monitor or network outage may prevent observations; incident timestamps do not prove uninterrupted downtime between checks.</p></div></details>
    <div className={styles.bottom}><span>OPEN//77 · PUBLIC TELEMETRY</span><a href="https://discord.open2077.net" target="_blank" rel="noreferrer">Something not listed here? Contact support ↗</a></div>
  </main>;
}
