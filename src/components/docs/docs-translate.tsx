"use client";

import { usePathname } from "next/navigation";
import { useCallback, useEffect, useId, useRef, useState, useSyncExternalStore } from "react";

import { Icon } from "@/components/ui/icon";
import { cancel01, linkSquare02, translate as translateGlyph } from "@/components/ui/icons";
import { LANGUAGE_COOKIE, LANGUAGE_EVENT, LOCALE_INFO, isLocale, negotiateLocale, type Locale } from "@/i18n/config";
import { fill } from "@/i18n/format";
import type { Messages } from "@/i18n/types";
import { downloadFraction, resolveTranslator, translatorApi, type TranslatorInstance, type TranslatorSupport } from "@/lib/docs-translate/api";
import { PageTranslation } from "@/lib/docs-translate/engine";
import { canonicalTag, googleTranslateUrl, isEnglish } from "@/lib/docs-translate/text";
import { SITE_URL } from "@/lib/site";

import styles from "./docs-translate.module.css";

export type DocsTranslateMessages = Messages["docsTranslate"];

/** The parts of a docs page that are translated (`<article>`, outline, API detail…). */
const ROOTS = "[data-docs-translate]";
/** Per tab: "auto-translate the docs into <tag>" for the rest of this visit. */
const AUTO_KEY = "open77.docs-translate.auto";
/** Per browser: the banner was dismissed. */
const BANNER_KEY = "open77.docs-translate.banner-dismissed";
const BANNER_EVENT = "open77:docs-translate-banner";

type Phase = "idle" | "preparing" | "downloading" | "translating" | "translated" | "error";

function readStorage(storage: "localStorage" | "sessionStorage", key: string): string | null {
  try {
    return window[storage].getItem(key);
  } catch {
    return null;
  }
}

function writeStorage(storage: "localStorage" | "sessionStorage", key: string, value: string | null) {
  try {
    if (value === null) window[storage].removeItem(key);
    else window[storage].setItem(key, value);
  } catch {
    // Storage blocked (private mode, site data off): the choice lasts for this page only.
  }
}

function readCookie(name: string): string | null {
  for (const part of document.cookie.split(";")) {
    const [key, ...value] = part.trim().split("=");
    if (key !== name) continue;
    try {
      return decodeURIComponent(value.join("="));
    } catch {
      return null;
    }
  }
  return null;
}

/**
 * The visitor's language: the site's language cookie when it names another
 * language than English, else the browser's first language. Empty when that is
 * English (or unknown): there is nothing to offer.
 */
function preferredTarget(): string {
  const cookie = readCookie(LANGUAGE_COOKIE);
  const tag = isLocale(cookie) && cookie !== "en" ? LOCALE_INFO[cookie].tag : canonicalTag(navigator.languages?.[0] ?? navigator.language);
  return tag && !isEnglish(tag) ? tag : "";
}

function subscribeLanguage(callback: () => void) {
  window.addEventListener(LANGUAGE_EVENT, callback);
  window.addEventListener("languagechange", callback);
  return () => {
    window.removeEventListener(LANGUAGE_EVENT, callback);
    window.removeEventListener("languagechange", callback);
  };
}

function subscribeBanner(callback: () => void) {
  window.addEventListener(BANNER_EVENT, callback);
  window.addEventListener("storage", callback);
  return () => {
    window.removeEventListener(BANNER_EVENT, callback);
    window.removeEventListener("storage", callback);
  };
}

const bannerDismissed = () => readStorage("localStorage", BANNER_KEY) === "1";

/** The UI speaks the visitor's language when the site has it, English otherwise. */
function uiLocale(target: string): Locale {
  return negotiateLocale(target) ?? "en";
}

/**
 * "français", "Deutsch", "Thai": the target language named in the UI language.
 * A region only adds noise ("Deutsch (Deutschland)"), so it is left out, except
 * for Chinese, where it decides the script the reader gets.
 */
function languageName(target: string, ui: Locale): string {
  const [language = target, ...rest] = target.split("-");
  const script = rest.find((part) => /^[a-z]{4}$/i.test(part));
  const named = language.toLowerCase() === "zh" ? target : script ? `${language}-${script}` : language;
  try {
    return new Intl.DisplayNames([LOCALE_INFO[ui].tag], { type: "language" }).of(named) ?? named;
  } catch {
    return named;
  }
}

function browserFamily(): keyof DocsTranslateMessages["howTo"] {
  const agent = navigator.userAgent;
  if (/Edg(A|iOS)?\//.test(agent)) return "edge";
  if (/Firefox\/|FxiOS/.test(agent)) return "firefox";
  if (/OPR\/|SamsungBrowser|YaBrowser|Vivaldi/.test(agent)) return "other";
  if (/CriOS|Chrome\//.test(agent)) return /Android|Mobile|CriOS/.test(agent) ? "chromeMobile" : "chrome";
  if (/Safari\//.test(agent)) return "safari";
  return "other";
}

/**
 * Optional machine translation of the English-only docs, by the visitor's own
 * browser: Chrome's built-in Translator API, on the device, nothing stored on
 * our side. A banner offers it once to visitors whose language is not English;
 * after that a small control stays in the corner. Browsers without the API get
 * a how-to for their own translate feature and a Google Translate link.
 *
 * The page itself stays the English, static, indexable document it was: this
 * component renders nothing on the server and only touches the DOM on request
 * (or, for the rest of a visit, once the reader asked for it).
 */
export function DocsTranslate({ messages }: { messages: Record<Locale, DocsTranslateMessages> }) {
  const pathname = usePathname();
  const target = useSyncExternalStore(subscribeLanguage, preferredTarget, () => "");
  const dismissed = useSyncExternalStore(subscribeBanner, bannerDismissed, () => true);
  const [resolved, setResolved] = useState<{ target: string; support: TranslatorSupport; tag: string | null } | null>(null);
  const [phase, setPhase] = useState<Phase>("idle");
  const [download, setDownload] = useState(0);
  const [progress, setProgress] = useState({ done: 0, total: 0 });
  /** The panel is open on this path (it closes when the reader moves on). */
  const [panelPath, setPanelPath] = useState<string | null>(null);
  const rootRef = useRef<HTMLDivElement>(null);
  const translator = useRef<{ tag: string; instance: TranslatorInstance } | null>(null);
  const engine = useRef<PageTranslation | null>(null);
  const creation = useRef<AbortController | null>(null);
  const caches = useRef(new Map<string, Map<string, string>>());
  const panelId = useId();

  const current = resolved && resolved.target === target ? resolved : null;
  const support = current?.support ?? null;
  const apiTag = current?.tag ?? null;

  // What this browser can do for the visitor's language.
  useEffect(() => {
    if (!target) return;
    let cancelled = false;
    void resolveTranslator(target).then((result) => {
      if (!cancelled) setResolved({ target, ...result });
    });
    return () => {
      cancelled = true;
    };
  }, [target]);

  const begin = useCallback(
    (instance: TranslatorInstance, tag: string) => {
      const container = document.getElementById("main");
      if (!container) return;
      engine.current?.stop();
      let cache = caches.current.get(tag);
      if (!cache) {
        cache = new Map();
        caches.current.set(tag, cache);
      }
      const run = new PageTranslation({
        container,
        rootSelector: ROOTS,
        target,
        translate: (text, signal) => instance.translate(text, { signal }),
        cache,
        ignore: (node) => Boolean(rootRef.current?.contains(node)),
        onProgress: ({ done, total, running }) => {
          if (engine.current !== run) return;
          setProgress({ done, total });
          setPhase(running ? "translating" : "translated");
        },
        onError: () => {
          if (engine.current === run) setPhase("error");
        },
      });
      engine.current = run;
      setPhase("translating");
      run.start();
    },
    [target],
  );

  /**
   * Starts a translation. Called from a click: `Translator.create` needs that
   * user activation when the model has to be downloaded, so it is called
   * before anything is awaited.
   */
  const translate = useCallback(() => {
    const api = translatorApi();
    if (!api || !apiTag || (support !== "available" && support !== "downloadable")) {
      setPanelPath(pathname);
      return;
    }
    setPanelPath(null);
    writeStorage("sessionStorage", AUTO_KEY, target);
    if (translator.current?.tag === apiTag) {
      begin(translator.current.instance, apiTag);
      return;
    }
    creation.current?.abort();
    const controller = new AbortController();
    creation.current = controller;
    setPhase(support === "available" ? "preparing" : "downloading");
    setDownload(0);
    let created: Promise<TranslatorInstance>;
    try {
      created = api.create({
        sourceLanguage: "en",
        targetLanguage: apiTag,
        signal: controller.signal,
        monitor(monitor) {
          monitor.addEventListener("downloadprogress", (event) => {
            if (controller.signal.aborted) return;
            setPhase("downloading");
            setDownload(downloadFraction(event));
          });
        },
      });
    } catch (error) {
      created = Promise.reject(error);
    }
    created.then(
      (instance) => {
        if (controller.signal.aborted) {
          instance.destroy();
          return;
        }
        creation.current = null;
        translator.current?.instance.destroy();
        translator.current = { tag: apiTag, instance };
        setResolved({ target, support: "available", tag: apiTag });
        begin(instance, apiTag);
      },
      () => {
        if (controller.signal.aborted) return;
        creation.current = null;
        setPhase("error");
      },
    );
  }, [apiTag, begin, pathname, support, target]);

  /** Back to English, and no more automatic translation this visit. */
  const showOriginal = useCallback(() => {
    creation.current?.abort();
    creation.current = null;
    engine.current?.stop();
    engine.current = null;
    writeStorage("sessionStorage", AUTO_KEY, null);
    setPhase("idle");
    setProgress({ done: 0, total: 0 });
  }, []);

  // The reader asked for this language earlier in the visit: translate this
  // page too. Only when the model is already on the device, since starting a
  // download needs a click.
  useEffect(() => {
    if (!target || support !== "available" || engine.current || creation.current) return;
    if (readStorage("sessionStorage", AUTO_KEY) !== target) return;
    const timer = window.setTimeout(translate, 0);
    return () => window.clearTimeout(timer);
  }, [support, target, translate]);

  // Leaving the docs: stop, and free the model.
  useEffect(() => {
    const refs = { creation, engine, translator };
    return () => {
      refs.creation.current?.abort();
      refs.engine.current?.stop();
      refs.engine.current = null;
      refs.translator.current?.instance.destroy();
      refs.translator.current = null;
    };
  }, []);

  if (!target) return null;

  const ui = uiLocale(target);
  const m = messages[ui] ?? messages.en;
  const language = languageName(target, ui);
  const working = phase === "preparing" || phase === "downloading" || phase === "translating";
  const panelOpen = panelPath === pathname;
  const bannerVisible = !dismissed && phase === "idle" && !panelOpen;

  const dismiss = () => {
    writeStorage("localStorage", BANNER_KEY, "1");
    window.dispatchEvent(new Event(BANNER_EVENT));
  };

  const reason =
    phase === "error"
      ? m.failed
      : support === "none"
        ? m.unsupported
        : support === "unavailable"
          ? fill(m.unavailable, { language })
          : null;

  let status: string;
  if (phase === "preparing") status = m.preparing;
  else if (phase === "downloading") status = fill(m.downloading, { percent: Math.round(download * 100) });
  else if (phase === "translating") status = fill(m.translating, { done: Math.min(progress.done + 1, progress.total), total: progress.total });
  else if (phase === "translated") status = fill(m.translated, { language });
  else if (phase === "error") status = m.failed;
  else status = m.translate;

  return (
    <div ref={rootRef} className={styles.dock} lang={LOCALE_INFO[ui].tag} translate="no" data-docs-translate-ui>
      {panelOpen ? (
        <section className={styles.panel} id={panelId} aria-labelledby={`${panelId}-title`}>
          <header className={styles.panelHead}>
            <p className={styles.panelTitle} id={`${panelId}-title`}>
              {m.fallbackTitle}
            </p>
            <button type="button" className={styles.iconButton} aria-label={m.close} title={m.close} onClick={() => setPanelPath(null)}>
              <Icon glyph={cancel01} />
            </button>
          </header>
          {reason ? <p className={styles.reason}>{reason}</p> : null}
          <p>{m.howTo[browserFamily()]}</p>
          <a
            className={styles.google}
            href={googleTranslateUrl(`${SITE_URL}${pathname}${window.location.search}${window.location.hash}`, target)}
            target="_blank"
            rel="noopener noreferrer"
          >
            {m.google}
            <Icon glyph={linkSquare02} />
          </a>
          <p className={styles.small}>{m.googleNote}</p>
        </section>
      ) : null}

      {bannerVisible ? (
        <div className={styles.card} role="region" aria-label={m.translate} data-docs-translate-banner>
          <Icon glyph={translateGlyph} className={styles.glyph} />
          <p className={styles.text}>{m.bannerText}</p>
          <div className={styles.actions}>
            <button type="button" className={styles.primary} title={fill(m.into, { language })} onClick={translate}>
              {m.bannerAction}
            </button>
            <button type="button" className={styles.iconButton} aria-label={m.dismiss} title={m.dismiss} onClick={dismiss}>
              <Icon glyph={cancel01} />
            </button>
          </div>
        </div>
      ) : (
        <div className={styles.card} data-docs-translate-control data-phase={phase}>
          <Icon glyph={translateGlyph} className={styles.glyph} />
          {phase === "idle" ? (
            <button
              type="button"
              className={styles.primary}
              title={fill(m.into, { language })}
              aria-expanded={support === "none" || support === "unavailable" ? panelOpen : undefined}
              aria-controls={panelOpen ? panelId : undefined}
              onClick={translate}
            >
              {m.translate}
            </button>
          ) : (
            <p className={styles.text} role="status">
              {status}
            </p>
          )}
          {working || phase === "translated" || phase === "error" ? (
            <div className={styles.actions}>
              {phase === "error" ? (
                <>
                  <button type="button" className={styles.primary} onClick={translate}>
                    {m.retry}
                  </button>
                  <button type="button" className={styles.secondary} onClick={() => setPanelPath(pathname)}>
                    {m.options}
                  </button>
                </>
              ) : (
                <button type="button" className={phase === "translated" ? styles.primary : styles.secondary} onClick={showOriginal}>
                  {phase === "translated" ? m.showOriginal : m.stop}
                </button>
              )}
            </div>
          ) : null}
          {phase === "downloading" ? (
            <span className={styles.meter} aria-hidden="true">
              <span style={{ width: `${Math.round(download * 100)}%` }} />
            </span>
          ) : null}
          {working || phase === "translated" ? <p className={styles.small}>{phase === "translated" ? m.auto : m.note}</p> : null}
        </div>
      )}
    </div>
  );
}
