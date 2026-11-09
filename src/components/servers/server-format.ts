"use client";

import { useMemo } from "react";

import { useLocale, useMessages } from "@/i18n/client";
import { LOCALE_INFO, type Locale } from "@/i18n/config";
import { plural, type PluralForms, type Vars } from "@/i18n/format";
import type { Messages } from "@/i18n/types";
import { formatUptime } from "@/lib/servers";

export type ServersMessages = Messages["servers"];

/**
 * The server browser's words, dates and counts in the page language (from the
 * route, never the browser). Times stay in the visitor's own time zone, as
 * the activity chart's "Local time" legend says; only their wording changes.
 */
export function serverFormat(locale: Locale, m: ServersMessages) {
  const tag = LOCALE_INFO[locale].intl;
  const count = (forms: PluralForms, value: number, vars?: Vars) => plural(locale, forms, value, vars);
  return {
    m,
    locale,
    /** BCP-47 tag for `Intl` and the display-name lookups. */
    tag,
    count,
    /** "14:05" / "02:05 PM": the directory's freshness readout. */
    clock: (date: Date) => date.toLocaleTimeString(tag, { hour: "2-digit", minute: "2-digit" }),
    /** "Nov 2, 06:00 PM": activity chart ticks and tooltip. */
    moment: (value: number) =>
      new Date(value).toLocaleString(tag, { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" }),
    /** "3d 4h", "2h 15m", "8m", "just now"; null for an unparseable or future start. */
    uptime: (startedAtUtc: string, now: number) => formatUptime(startedAtUtc, now, m.detail.uptime),
    /** "12s ago", "4m ago", "2h ago": for the last-heartbeat and roster readouts. */
    relative: (iso: string, now: number) => {
      const then = new Date(iso).getTime();
      if (Number.isNaN(then)) return "—";
      const s = Math.max(0, Math.floor((now - then) / 1000));
      const units = m.detail.relative;
      if (s < 60) return count(units.seconds, s);
      const minutes = Math.floor(s / 60);
      if (minutes < 60) return count(units.minutes, minutes);
      const hours = Math.floor(minutes / 60);
      if (hours < 24) return count(units.hours, hours);
      return count(units.days, Math.floor(hours / 24));
    },
  };
}

export type ServerFormat = ReturnType<typeof serverFormat>;

export function useServerFormat(): ServerFormat {
  const locale = useLocale();
  const m = useMessages("servers");
  return useMemo(() => serverFormat(locale, m), [locale, m]);
}
