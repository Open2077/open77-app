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
import { fill, plural, rich } from "@/i18n/format";
import { currentState, isStale, overallState, parseSnapshot, statistics } from "@/lib/status/model";
import type { StatusSnapshot } from "@/lib/status/model";
import { DayBars, LatencyChart, StateTag, Swatch, useStatusFormat } from "./status-parts";

import styles from "./status.module.css";

const SUPPORT_URL = "https://discord.gg/open77";
const PERIODS = [7, 30, 90] as const;

export function StatusDashboard() {
  const f = useStatusFormat();
  const { m, utc, utcDay, utcTime, duration, locale } = f;
  const percent = f.pct;
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
        watermark={m.hero.watermark}
        eyebrow={m.hero.eyebrow}
        title={m.hero.title}
        accent={m.hero.accent}
        lead={m.hero.lead}
        actions={
          <>
            <Button lines="left" icon={refreshGlyph} iconPosition="left" busy={loading} onClick={() => void refresh()}>
              {m.hero.refresh}
            </Button>
            <a className={styles.feedLink} href="/api/status" target="_blank" rel="noreferrer">
              <Icon glyph={sourceCode} />
              {m.hero.json}
              <Icon glyph={arrowUpRight01} />
            </a>
          </>
        }
        aside={
          <Panel brackets className={styles.signal} data-state={connecting ? "unknown" : state} aria-label={m.signal.label}>
            <div className={styles.signalHead}>
              <span className={styles.signalLamp} aria-hidden="true" />
              <span>{"// NETWORK.SIGNAL"}</span>
              <span className={styles.signalLive}>{stale || !snapshot ? m.signal.noSignal : m.signal.connected}</span>
            </div>
            <div role="status" className={styles.signalCopy}>
              <p className={styles.signalTitle}>{connecting ? m.signal.connecting : m.signal.titles[state]}</p>
              <p className={styles.signalMeta}>
                {snapshot
                  ? fill(m.signal.lastMeasured, { time: utc(snapshot.generatedAt) })
                  : m.signal.noHealthy}
              </p>
            </div>
            <ol className={styles.pips} aria-label={m.signal.services}>
              {(snapshot?.services ?? Array.from({ length: 7 }, (_, index) => ({ id: `pending-${index}`, name: m.signal.pending }))).map((service, index) => {
                const value = states[index] ?? "unknown";
                return (
                  <li key={service.id} className={styles.pip} data-state={value} title={`${service.name}: ${m.states[value]}`}>
                    <span className="sr-only">{`${service.name}: ${m.states[value]}`}</span>
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
            title={stale ? m.alerts.staleTitle : m.alerts.errorTitle}
          >
            {snapshot ? m.alerts.staleBody : m.alerts.errorBody}
          </Notice>
        ) : null}
        <noscript>
          <p className={styles.noscript}>
            {/* An API route, not a page: the rule matches it against the [lang] routes. */}
            {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
            {rich(m.alerts.noscript, { feed: (chunk) => <a href="/api/status">{chunk}</a> })}
          </p>
        </noscript>

        <div className={styles.metrics}>
          <Stat value={snapshot ? `${operational}/${states.length}` : "—"} label={m.metrics.operational} detail={snapshot ? m.metrics.now : m.metrics.waiting} />
          <Stat value={percent(total.availability)} label={fill(m.metrics.availability, { days })} detail={m.metrics.availabilityDetail} />
          <Stat value={percent(snapshot ? total.coverage : null)} label={m.metrics.coverage} detail={m.metrics.coverageDetail} />
          <Stat
            value={snapshot ? String(openIncidents.length) : "—"}
            label={m.metrics.incidents}
            detail={snapshot ? plural(locale, m.metrics.incidentsRecorded, snapshot.incidents.length) : m.metrics.historyUnavailable}
          />
        </div>

        <section className={styles.section} aria-labelledby="services-title">
          <header className={styles.head}>
            <div className={styles.headCopy}>
              <Eyebrow index={1}>{m.services.eyebrow}</Eyebrow>
              <Display size="md" id="services-title">
                {m.services.title}
              </Display>
            </div>
            <Tabs
              label={m.services.period}
              className={styles.periods}
              items={PERIODS.map((value) => ({ value: String(value), label: plural(locale, m.services.days, value) }))}
              value={String(days)}
              onChange={(value) => setDays(Number(value))}
            />
          </header>
          <ul className={styles.legend} aria-label={m.services.legend}>
            {(["operational", "degraded", "outage", "unknown"] as const).map((value) => (
              <li key={value}>
                <Swatch state={value} />
                {m.states[value]}
              </li>
            ))}
            <li>
              <Swatch state="operational" partial />
              {m.services.partial}
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
                        <span>{fill(m.services.uptime, { days })}</span>
                      </p>
                    </div>
                    <p className={styles.serviceFoot}>
                      <span>{fill(m.services.coverage, { value: percent(stats.coverage) })}</span>
                      <span>{current === "unknown" ? m.services.awaiting : service.detail}</span>
                      {service.latencyMs !== null ? <span>{fill(m.services.lastLatency, { ms: service.latencyMs })}</span> : null}
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
                <p className={styles.pendingText}>{m.services.waiting}</p>
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
                <Eyebrow index={2}>{m.latency.eyebrow}</Eyebrow>
                <Display size="sm" as="h2" id="latency-title">
                  {m.latency.title}
                </Display>
              </div>
              <Field label={m.latency.service} className={styles.serviceSelect}>
                <Select compact value={selectedService} onChange={(event) => setSelectedService(event.target.value)} disabled={!snapshot}>
                  {snapshot ? (
                    snapshot.services.map((service) => (
                      <option key={service.id} value={service.id}>
                        {service.name}
                      </option>
                    ))
                  ) : (
                    <option value="master">{m.latency.placeholderService}</option>
                  )}
                </Select>
              </Field>
            </header>
            <LatencyChart service={snapshot?.services.find((service) => service.id === selectedService)} />
            <p className={styles.note}>{m.latency.note}</p>
          </Panel>

          <Panel as="section" className={styles.panel} aria-labelledby="maintenance-title" padding="lg">
            <header className={styles.panelHead}>
              <div className={styles.headCopy}>
                <Eyebrow index={3}>{m.maintenance.eyebrow}</Eyebrow>
                <Display size="sm" as="h2" id="maintenance-title">
                  {m.maintenance.title}
                </Display>
              </div>
            </header>
            {!maintenance.length ? (
              <div className={styles.calm}>
                <span className={styles.calmMark} aria-hidden="true" />
                <p className={styles.calmTitle}>{snapshot ? m.maintenance.none : m.maintenance.unavailable}</p>
                <p className={styles.calmText}>{snapshot ? m.maintenance.noneBody : m.maintenance.waiting}</p>
              </div>
            ) : (
              <ul className={styles.maintenance}>
                {maintenance.map((item) => {
                  const running = Date.parse(item.startsAt) <= now;
                  return (
                    <li key={item.id} className={styles.maintenanceItem}>
                      <Tag tone={running ? "yellow" : "blue"} variant={running ? "solid" : "outline"}>
                        {running ? m.maintenance.inProgress : m.maintenance.scheduled}
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
                  { label: m.monitor.probe, value: snapshot?.region ?? "—" },
                  {
                    label: m.monitor.interval,
                    value: snapshot ? fill(m.monitor.intervalValue, { seconds: snapshot.intervalSeconds }) : "—",
                  },
                  {
                    label: m.monitor.unknownAfter,
                    value: snapshot ? fill(m.monitor.unknownAfterValue, { seconds: snapshot.staleAfterSeconds }) : "—",
                  },
                  { label: m.monitor.since, value: snapshot?.startedAt ? utc(snapshot.startedAt) : "—" },
                  { label: m.monitor.retention, value: m.monitor.retentionValue },
                ]}
              />
            </div>
          </Panel>
        </div>

        <section className={styles.section} aria-labelledby="incidents-title">
          <header className={styles.head}>
            <div className={styles.headCopy}>
              <Eyebrow index={4}>{m.incidents.eyebrow}</Eyebrow>
              <Display size="md" id="incidents-title">
                {m.incidents.title}
              </Display>
            </div>
            <p className={styles.headNote}>{m.incidents.note}</p>
          </header>
          {!snapshot?.incidents.length ? (
            <EmptyState
              eyebrow={snapshot ? m.incidents.clearEyebrow : m.incidents.offlineEyebrow}
              title={snapshot ? m.incidents.nothing : m.incidents.unavailable}
              className={styles.empty}
            >
              {snapshot ? m.incidents.nothingBody : m.incidents.unavailableBody}
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
                      <StateTag state={incident.resolvedAt ? "operational" : "outage"} label={incident.resolvedAt ? m.incidents.recovered : m.incidents.notConfirmed} />
                    </h3>
                    <p className={styles.incidentDetail}>
                      <span className={styles.prompt} aria-hidden="true">{">"}</span>
                      {incident.detail}
                    </p>
                    <p className={styles.incidentMeta}>
                      {fill(m.incidents.firstDetected, { time: utc(incident.startedAt) })}
                      {incident.resolvedAt
                        ? fill(m.incidents.recoveryConfirmed, {
                            time: utc(incident.resolvedAt),
                            duration: duration(incident.startedAt, incident.resolvedAt),
                          })
                        : m.incidents.awaiting}
                    </p>
                  </div>
                </li>
              ))}
            </ol>
          )}
          <p className={styles.note}>{m.incidents.rules}</p>
        </section>

        <details className={styles.method}>
          <summary>
            <span className={styles.methodLabel}>{m.method.summary}</span>
            <span className={styles.methodToggle} aria-hidden="true" />
          </summary>
          <Prose size="sm" className={styles.methodBody}>
            <p>{fill(m.method.source, { region: snapshot?.region ?? m.method.configuredProbe })}</p>
            <p>{m.method.formula}</p>
            <p>{m.method.bars}</p>
            <p>
              {snapshot?.startedAt ? fill(m.method.started, { time: utc(snapshot.startedAt) }) : m.method.notStarted}
              {m.method.retention}
            </p>
          </Prose>
        </details>

        <footer className={styles.bottom}>
          <p>
            {"// OPEN//77 · PUBLIC TELEMETRY · "}
            {snapshot?.region ?? m.footer.probePending}
          </p>
          <p className={styles.fineprint}>{m.footer.fineprint}</p>
          <a className={styles.feedLink} href={SUPPORT_URL} target="_blank" rel="noreferrer">
            {m.footer.support}
            <Icon glyph={arrowUpRight01} />
          </a>
        </footer>
      </div>
    </>
  );
}
