"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import { Tag } from "@/components/ui/chip";
import { EmptyState, Loader, Notice, Stat } from "@/components/ui/feedback";
import { DefinitionList } from "@/components/ui/data";
import { Field, Select } from "@/components/ui/field";
import { Icon } from "@/components/ui/icon";
import { arrowUpRight01, refresh as refreshGlyph, sourceCode } from "@/components/ui/icons";
import { PageHero } from "@/components/ui/page";
import { Panel } from "@/components/ui/panel";
import { Prose } from "@/components/ui/prose";
import { Tabs } from "@/components/ui/tabs";
import { Display, Eyebrow } from "@/components/ui/typography";
import { currentState, isStale, LABELS, overallState, parseSnapshot, percent, statistics } from "@/lib/status/model";
import type { ServiceState, StatusSnapshot } from "@/lib/status/model";
import { DayBars, duration, LatencyChart, StateTag, Swatch, utc, utcDay, utcTime } from "./status-parts";

import styles from "./status.module.css";

const TITLES: Record<ServiceState, string> = {
  operational: "All systems operational",
  degraded: "Some services are responding slowly",
  outage: "A service disruption was detected",
  unknown: "Awaiting fresh monitoring data",
};
const SUPPORT_URL = "https://discord.open2077.net";
const PERIODS = [7, 30, 90] as const;

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
      // Version the URL once to escape snapshots cached by the old public route.
      const response = await fetch("/api/status?v=2", { cache: "no-store", signal: AbortSignal.any([controller.signal, AbortSignal.timeout(10000)]) });
      const data = response.ok ? parseSnapshot(await response.json()) : null;
      if (!data) throw new Error("No monitoring data");
      setSnapshot(data);
      setError(false);
    } catch {
      if (!controller.signal.aborted) setError(true);
    } finally {
      if (active.current === controller) active.current = null;
      if (!controller.signal.aborted) {
        setNow(Date.now());
        setLoading(false);
      }
    }
  }, []);

  useEffect(() => {
    const initial = setTimeout(() => void refresh(), 0);
    const poll = setInterval(() => {
      if (!document.hidden) void refresh();
    }, 60000);
    const clock = setInterval(() => setNow(Date.now()), 10000);
    const visible = () => {
      if (!document.hidden) {
        setNow(Date.now());
        void refresh();
      }
    };
    document.addEventListener("visibilitychange", visible);
    return () => {
      clearTimeout(initial);
      clearInterval(poll);
      clearInterval(clock);
      document.removeEventListener("visibilitychange", visible);
      active.current?.abort();
      active.current = null;
    };
  }, [refresh]);

  const stale = !!snapshot && isStale(snapshot, now);
  const states = snapshot?.services.map((service) => currentState(service, snapshot, now)) ?? [];
  const state = overallState(states);
  const total = statistics(snapshot?.services.flatMap((service) => service.history.slice(-days)) ?? [], days * (snapshot?.services.length ?? 1));
  const openIncidents = snapshot?.incidents.filter((incident) => !incident.resolvedAt) ?? [];
  const maintenance = snapshot?.maintenance.filter((item) => Date.parse(item.endsAt) > now) ?? [];
  const connecting = loading && !snapshot;
  const operational = states.filter((value) => value === "operational").length;
  const serviceName = (id: string) => snapshot?.services.find((service) => service.id === id)?.name ?? id;

  return (
    <>
      <PageHero
        size="compact"
        art={{ src: "/assets/home/hero/city-v1.webp", position: "center 58%" }}
        watermark="Uptime"
        eyebrow="// Open network · service status"
        title={["The network.", "At a glance."]}
        accent={[1]}
        lead="Live service health, measured availability and a transparent record of every interruption, straight from the monitor."
        actions={
          <>
            <Button lines="left" icon={refreshGlyph} iconPosition="left" busy={loading} onClick={() => void refresh()}>
              Refresh status
            </Button>
            <a className={styles.feedLink} href="/api/status" target="_blank" rel="noreferrer">
              <Icon glyph={sourceCode} />
              Status JSON
              <Icon glyph={arrowUpRight01} />
            </a>
          </>
        }
        aside={
          <Panel brackets className={styles.signal} data-state={connecting ? "unknown" : state} aria-label="Current network status">
            <div className={styles.signalHead}>
              <span className={styles.signalLamp} aria-hidden="true" />
              <span>{"// NETWORK.SIGNAL"}</span>
              <span className={styles.signalLive}>{stale || !snapshot ? "No live signal" : "Monitor connected"}</span>
            </div>
            <div role="status" className={styles.signalCopy}>
              <p className={styles.signalTitle}>{connecting ? "Connecting to the monitor…" : TITLES[state]}</p>
              <p className={styles.signalMeta}>
                {snapshot
                  ? `Last measured ${utc(snapshot.generatedAt)} · checks every 60 seconds`
                  : "No service is marked healthy until a real check is received."}
              </p>
            </div>
            <ol className={styles.pips} aria-label="Services">
              {(snapshot?.services ?? Array.from({ length: 7 }, (_, index) => ({ id: `pending-${index}`, name: "Pending" }))).map((service, index) => {
                const value = states[index] ?? "unknown";
                return (
                  <li key={service.id} className={styles.pip} data-state={value} title={`${service.name}: ${LABELS[value]}`}>
                    <span className="sr-only">{`${service.name}: ${LABELS[value]}`}</span>
                  </li>
                );
              })}
            </ol>
          </Panel>
        }
      />

      <div className={styles.board}>
        {error || stale ? (
          <Notice
            kind={stale ? "warning" : "danger"}
            className={styles.alert}
            title={stale ? "Monitoring data is out of date." : "The monitoring feed could not be refreshed."}
          >
            {snapshot
              ? "The last recorded history remains below. Old checks are not treated as current health."
              : "This does not establish whether services are up or down. Please retry shortly."}
          </Notice>
        ) : null}
        <noscript>
          <p className={styles.noscript}>
            JavaScript is required for live updates. The <a href="/api/status">public JSON feed</a> is available without JavaScript.
          </p>
        </noscript>

        <div className={styles.metrics}>
          <Stat value={snapshot ? `${operational}/${states.length}` : "—"} label="Services operational" detail={snapshot ? "Right now" : "Waiting for a check"} />
          <Stat value={percent(total.availability)} label={`${days}-day availability`} detail="Successful ÷ completed checks" />
          <Stat value={percent(snapshot ? total.coverage : null)} label="Monitoring coverage" detail="Observed minute slots" />
          <Stat value={snapshot ? String(openIncidents.length) : "—"} label="Open incidents" detail={snapshot ? `${snapshot.incidents.length} recorded in 90 days` : "History unavailable"} />
        </div>

        <section className={styles.section} aria-labelledby="services-title">
          <header className={styles.head}>
            <div className={styles.headCopy}>
              <Eyebrow index={1}>Availability</Eyebrow>
              <Display size="md" id="services-title">
                Platform services
              </Display>
            </div>
            <Tabs
              label="Availability period"
              className={styles.periods}
              items={PERIODS.map((value) => ({ value: String(value), label: `${value} days` }))}
              value={String(days)}
              onChange={(value) => setDays(Number(value))}
            />
          </header>
          <ul className={styles.legend} aria-label="Legend">
            {(["operational", "degraded", "outage", "unknown"] as const).map((value) => (
              <li key={value}>
                <Swatch state={value} />
                {LABELS[value]}
              </li>
            ))}
            <li>
              <Swatch state="operational" partial />
              Striped = partial coverage
            </li>
          </ul>

          {snapshot ? (
            <div className={styles.services}>
              {snapshot.services.map((service, index) => {
                const stats = statistics(service.history, days);
                const current = states[index] ?? "unknown";
                return (
                  <article key={service.id} className={styles.service} data-state={current}>
                    <div className={styles.serviceIdentity}>
                      <span className={styles.serviceIndex}>{String(index + 1).padStart(2, "0")}</span>
                      <div>
                        <h3 className={styles.serviceName}>{service.name}</h3>
                        <p className={styles.serviceDescription}>{service.description}</p>
                      </div>
                    </div>
                    <DayBars key={`${service.id}-${days}`} history={service.history} days={days} name={service.name} />
                    <div className={styles.serviceStatus}>
                      <StateTag state={current} />
                      <p className={styles.uptime}>
                        <strong>{percent(stats.availability)}</strong>
                        <span>{days}-day uptime</span>
                      </p>
                    </div>
                    <p className={styles.serviceFoot}>
                      <span>{percent(stats.coverage)} coverage</span>
                      <span>{current === "unknown" ? "Awaiting a fresh check" : service.detail}</span>
                      {service.latencyMs !== null ? <span>{service.latencyMs} ms last recorded</span> : null}
                    </p>
                  </article>
                );
              })}
            </div>
          ) : (
            <div className={styles.pending}>
              {loading ? (
                <Loader label="STATUS.FEED" />
              ) : (
                <p className={styles.pendingText}>
                  Waiting for monitoring data. Availability history will appear here once collection is active.
                </p>
              )}
              <div className={styles.skeleton} aria-hidden="true">
                {Array.from({ length: 7 }, (_, index) => (
                  <div key={index} className={styles.skeletonRow}>
                    <span />
                    <span />
                    <span />
                  </div>
                ))}
              </div>
            </div>
          )}
        </section>

        <div className={styles.lower}>
          <Panel as="section" className={styles.panel} aria-labelledby="latency-title" padding="lg">
            <header className={styles.panelHead}>
              <div className={styles.headCopy}>
                <Eyebrow index={2}>Response time</Eyebrow>
                <Display size="sm" as="h2" id="latency-title">
                  Every millisecond counts.
                </Display>
              </div>
              <Field label="Service" className={styles.serviceSelect}>
                <Select compact value={selectedService} onChange={(event) => setSelectedService(event.target.value)} disabled={!snapshot}>
                  {snapshot ? (
                    snapshot.services.map((service) => (
                      <option key={service.id} value={service.id}>
                        {service.name}
                      </option>
                    ))
                  ) : (
                    <option value="master">Master API</option>
                  )}
                </Select>
              </Field>
            </header>
            <LatencyChart service={snapshot?.services.find((service) => service.id === selectedService)} />
            <p className={styles.note}>
              End-to-end check duration, not in-game ping. CDN checks include release metadata and 4 KiB partial downloads. Missing samples are never joined across gaps.
            </p>
          </Panel>

          <Panel as="section" className={styles.panel} aria-labelledby="maintenance-title" padding="lg">
            <header className={styles.panelHead}>
              <div className={styles.headCopy}>
                <Eyebrow index={3}>Maintenance</Eyebrow>
                <Display size="sm" as="h2" id="maintenance-title">
                  Heads up.
                </Display>
              </div>
            </header>
            {!maintenance.length ? (
              <div className={styles.calm}>
                <span className={styles.calmMark} aria-hidden="true" />
                <p className={styles.calmTitle}>{snapshot ? "No scheduled maintenance" : "Schedule unavailable"}</p>
                <p className={styles.calmText}>
                  {snapshot ? "No active or upcoming maintenance in the latest feed." : "Waiting for a monitoring snapshot."}
                </p>
              </div>
            ) : (
              <ul className={styles.maintenance}>
                {maintenance.map((item) => {
                  const running = Date.parse(item.startsAt) <= now;
                  return (
                    <li key={item.id} className={styles.maintenanceItem}>
                      <Tag tone={running ? "yellow" : "blue"} variant={running ? "solid" : "outline"}>
                        {running ? "In progress" : "Scheduled"}
                      </Tag>
                      <h3 className={styles.maintenanceTitle}>{item.title}</h3>
                      <p className={styles.maintenanceMessage}>{item.message}</p>
                      <p className={styles.maintenanceWindow}>
                        {utc(item.startsAt)} → {utc(item.endsAt)}
                      </p>
                      <p className={styles.maintenanceServices}>{item.services.map(serviceName).join(" · ")}</p>
                    </li>
                  );
                })}
              </ul>
            )}
            <div className={styles.probe}>
              <Eyebrow muted as="h3">
                {"// Monitor"}
              </Eyebrow>
              <DefinitionList
                items={[
                  { label: "Probe", value: snapshot?.region ?? "—" },
                  { label: "Check interval", value: snapshot ? `${snapshot.intervalSeconds} s` : "—" },
                  { label: "Unknown after", value: snapshot ? `${snapshot.staleAfterSeconds} s without data` : "—" },
                  { label: "Collecting since", value: snapshot?.startedAt ? utc(snapshot.startedAt) : "—" },
                  { label: "Retention", value: "90 days" },
                ]}
              />
            </div>
          </Panel>
        </div>

        <section className={styles.section} aria-labelledby="incidents-title">
          <header className={styles.head}>
            <div className={styles.headCopy}>
              <Eyebrow index={4}>Incident history</Eyebrow>
              <Display size="md" id="incidents-title">
                The record, not the guesswork.
              </Display>
            </div>
            <p className={styles.headNote}>Last 90 days · newest first</p>
          </header>
          {!snapshot?.incidents.length ? (
            <EmptyState
              eyebrow={snapshot ? "// INCIDENTS.LOG clear" : "// INCIDENTS.LOG offline"}
              title={snapshot ? "Nothing to report" : "History unavailable"}
              className={styles.empty}
            >
              {snapshot ? "No confirmed incidents recorded in the observed period." : "Incident history is unavailable until the monitor responds."}
            </EmptyState>
          ) : (
            <ol className={styles.incidents}>
              {snapshot.incidents.map((incident) => (
                <li key={incident.id} className={styles.incident} data-state={incident.resolvedAt ? "operational" : "outage"}>
                  <span className={styles.node} aria-hidden="true" />
                  <time className={styles.incidentWhen} dateTime={incident.startedAt}>
                    <span>{utcDay(incident.startedAt)}</span>
                    <span>{utcTime(incident.startedAt)} UTC</span>
                  </time>
                  <div className={styles.incidentBody}>
                    <h3 className={styles.incidentTitle}>
                      {serviceName(incident.service)}
                      <StateTag state={incident.resolvedAt ? "operational" : "outage"} label={incident.resolvedAt ? "Recovered" : "Recovery not confirmed"} />
                    </h3>
                    <p className={styles.incidentDetail}>
                      <span className={styles.prompt} aria-hidden="true">{">"}</span>
                      {incident.detail}
                    </p>
                    <p className={styles.incidentMeta}>
                      First detected {utc(incident.startedAt)}
                      {incident.resolvedAt
                        ? ` · Recovery confirmed ${utc(incident.resolvedAt)} · ${duration(incident.startedAt, incident.resolvedAt)} observed`
                        : " · Awaiting two successful checks"}
                    </p>
                  </div>
                </li>
              ))}
            </ol>
          )}
          <p className={styles.note}>
            Incidents open after two consecutive failed checks and close after two successful checks. Single failures still appear in availability. Detection is not a root-cause diagnosis.
          </p>
        </section>

        <details className={styles.method}>
          <summary>
            <span className={styles.methodLabel}>How we measure availability</span>
            <span className={styles.methodToggle} aria-hidden="true" />
          </summary>
          <Prose size="sm" className={styles.methodBody}>
            <p>
              Measurements come from {snapshot?.region ?? "the configured operator probe"}. A check runs every minute. This is a single monitoring vantage point, not a global service-level guarantee. Community game servers and end-to-end sign-in are not covered.
            </p>
            <p>
              Availability = successful checks ÷ completed checks. Slow but successful responses remain available. Coverage = completed checks ÷ scheduled minute slots in the selected UTC calendar days. Unobserved periods, including before monitoring began, are unknown — never counted as uptime. Maintenance does not erase failed checks.
            </p>
            <p>
              Daily bars show the worst observed result; stripes indicate incomplete coverage. The response graph averages successful checks in five-minute buckets. Data older than three minutes becomes unknown, even if the last result was healthy.
            </p>
            <p>
              {snapshot?.startedAt ? `Collection started ${utc(snapshot.startedAt)}. ` : "Collection start is not yet known. "}
              History is retained for 90 days. A monitor or network outage may prevent observations; incident timestamps do not prove uninterrupted downtime between checks.
            </p>
          </Prose>
        </details>

        <footer className={styles.bottom}>
          <p>
            {"// OPEN//77 · PUBLIC TELEMETRY · "}
            {snapshot?.region ?? "probe pending"}
          </p>
          <p className={styles.fineprint}>
            Status reflects automated checks from the stated monitoring location, not a guarantee of availability from every network.
          </p>
          <a className={styles.feedLink} href={SUPPORT_URL} target="_blank" rel="noreferrer">
            Something not listed here? Contact support
            <Icon glyph={arrowUpRight01} />
          </a>
        </footer>
      </div>
    </>
  );
}
