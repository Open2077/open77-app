"use client";

import { useEffect, useId, useRef, useState, type MouseEvent } from "react";

import { Button } from "@/components/ui/button";
import { cx } from "@/components/ui/cx";
import { useLocale, useMessages, useRoutePath } from "@/i18n/client";
import {
  LANGUAGE_COOKIE,
  LANGUAGE_COOKIE_MAX_AGE,
  LOCALE_INFO,
  LOCALES,
  isLocalizedPath,
  localizeHref,
  type Locale,
} from "@/i18n/config";

import styles from "./language-select.module.css";

/**
 * Remembers an explicit choice. The proxy reads it on every page that exists in
 * several languages and it beats the browser's Accept-Language from then on;
 * "en" is stored too, so choosing English sticks.
 */
function rememberLanguage(locale: Locale) {
  const secure = window.location.protocol === "https:" ? "; Secure" : "";
  document.cookie = `${LANGUAGE_COOKIE}=${encodeURIComponent(locale)}; Path=/; Max-Age=${LANGUAGE_COOKIE_MAX_AGE}; SameSite=Lax${secure}`;
}

/**
 * The language selector: a compact popover in the header bar, a row of links in
 * the mobile menu and the footer. Every entry is a real link to the same page
 * in that language (crawlable, works without JavaScript); the click handler
 * also stores the choice and keeps the query string and fragment.
 *
 * Pages that only exist in English (docs, devblog…) keep their URL: the choice
 * is stored for the rest of the site and the selector says why nothing moved.
 */
export function LanguageSelect({ className, variant = "popover" }: { className?: string; variant?: "popover" | "menu" | "footer" }) {
  const locale = useLocale();
  const path = useRoutePath();
  const m = useMessages("chrome").language;
  const [open, setOpen] = useState(false);
  const [notice, setNotice] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const listId = useId();
  const localized = isLocalizedPath(path);

  useEffect(() => {
    if (!notice) return;
    const timer = window.setTimeout(() => setNotice(false), 5000);
    return () => window.clearTimeout(timer);
  }, [notice]);

  useEffect(() => {
    if (!open) return;
    const onPointer = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      setOpen(false);
      rootRef.current?.querySelector<HTMLElement>("button")?.focus();
    };
    window.addEventListener("pointerdown", onPointer);
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("pointerdown", onPointer);
      window.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const choose = (event: MouseEvent<HTMLAnchorElement>, target: Locale, href: string) => {
    if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    event.preventDefault();
    rememberLanguage(target);
    if (!localized) {
      setNotice(target !== "en");
      setOpen(false);
      return;
    }
    // A different language is a different root layout, and the proxy must see the new cookie:
    // a full document load is the point, not a client transition.
    // eslint-disable-next-line @next/next/no-location-assign-relative-destination
    window.location.assign(`${href}${window.location.search}${window.location.hash}`);
  };

  const links = (
    <ul className={styles.list} id={listId} aria-label={m.choose}>
      {LOCALES.map((target) => {
        const info = LOCALE_INFO[target];
        const href = localized ? localizeHref(path, target) : path;
        return (
          <li key={target}>
            <a
              href={href}
              lang={info.tag}
              hrefLang={info.tag}
              aria-current={target === locale ? "true" : undefined}
              className={styles.link}
              onClick={(event) => choose(event, target, href)}
            >
              <span className={styles.short} aria-hidden="true">
                {info.short}
              </span>
              <span className={styles.name}>{info.name}</span>
            </a>
          </li>
        );
      })}
    </ul>
  );

  if (variant !== "popover") {
    return (
      <nav className={cx(styles.inline, styles[variant], className)} aria-label={m.label}>
        <p className={styles.heading}>{m.label}</p>
        {links}
        {notice ? (
          <p className={styles.notice} role="status">
            {m.englishOnly}
          </p>
        ) : null}
      </nav>
    );
  }

  return (
    <div ref={rootRef} className={cx(styles.popover, open && styles.open)}>
      <Button
        lines="none"
        iconOnly
        className={cx(className, styles.toggle)}
        aria-label={`${m.label}: ${LOCALE_INFO[locale].name}`}
        title={m.label}
        aria-expanded={open}
        aria-controls={listId}
        onClick={() => setOpen((value) => !value)}
      >
        {LOCALE_INFO[locale].short}
      </Button>
      <div className={styles.panel} hidden={!open}>
        {links}
      </div>
      {notice ? (
        <p className={styles.toast} role="status">
          {m.englishOnly}
        </p>
      ) : null}
    </div>
  );
}
