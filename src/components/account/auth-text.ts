"use client";

import { useLocale, useMessages } from "@/i18n/client";
import type { Locale } from "@/i18n/config";
import type { Messages } from "@/i18n/types";
import { MasterApiError } from "@/lib/account/api";

export type AuthMessages = Messages["auth"];

/** The sign-in funnel's strings and the page language. */
export function useAuthText(): { m: AuthMessages; locale: Locale } {
  return { m: useMessages("auth"), locale: useLocale() };
}

/**
 * What to show for a master error. The master answers in English with a stable
 * `code`; a translated page shows its own sentence for the codes it knows and
 * falls back to the master's message for the rest. English pages keep the
 * master's wording, which can be more specific (a quota's actual wait).
 */
export function masterMessage(error: unknown, m: AuthMessages, locale: Locale, fallback: string = m.generic): string {
  if (!(error instanceof MasterApiError)) return fallback;
  if (locale === "en") return error.message;
  return (m.errors as Record<string, string>)[error.code] ?? error.message;
}
