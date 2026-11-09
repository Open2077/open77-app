"use client";

import { usePathname } from "next/navigation";
import { createContext, useContext, useMemo, type ReactNode } from "react";

import { DEFAULT_LOCALE, localizeHref, splitLocalePath, type Locale } from "./config";
import type { Messages } from "./types";

type I18nValue = { locale: Locale; messages: Partial<Messages> };

const I18nContext = createContext<I18nValue>({ locale: DEFAULT_LOCALE, messages: {} });

/**
 * Hands the page language and the message namespaces a subtree needs to client
 * components. Providers nest: a page adds its own namespaces on top of the
 * site chrome the root layout provides, so no page ships every string.
 */
export function I18nProvider({
  locale,
  messages,
  children,
}: {
  locale: Locale;
  messages: Partial<Messages>;
  children: ReactNode;
}) {
  const parent = useContext(I18nContext);
  const value = useMemo(
    () => ({ locale, messages: parent.locale === locale ? { ...parent.messages, ...messages } : messages }),
    [locale, messages, parent],
  );
  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

/** The language of the page being rendered (from its route). */
export function useLocale(): Locale {
  return useContext(I18nContext).locale;
}

/** One message namespace. Throws if no provider above supplied it: a wiring bug, not a missing translation. */
export function useMessages<K extends keyof Messages>(namespace: K): Messages[K] {
  const value = useContext(I18nContext).messages[namespace];
  if (!value) throw new Error(`i18n: namespace "${String(namespace)}" is not provided here`);
  return value as Messages[K];
}

/** Like {@link useMessages}, but null when the namespace is not provided (shared components). */
export function useOptionalMessages<K extends keyof Messages>(namespace: K): Messages[K] | null {
  return (useContext(I18nContext).messages[namespace] as Messages[K] | undefined) ?? null;
}

/** Turns an English path into this page's language when that page exists in it. */
export function useLocalizeHref(): (href: string) => string {
  const locale = useLocale();
  return (href: string) => localizeHref(href, locale);
}

/**
 * The current path without its language prefix (`/fr/servers` → `/servers`),
 * for code that compares routes: active links, page tones, home detection.
 */
export function useRoutePath(): string {
  return splitLocalePath(usePathname() ?? "/").path;
}
