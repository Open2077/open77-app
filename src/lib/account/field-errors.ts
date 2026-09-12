export type FieldErrors = Readonly<Record<string, readonly string[]>>;

/** Bound untrusted gateway/API validation responses before exposing them to forms. */
export function parseFieldErrors(value: unknown): FieldErrors {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  return Object.fromEntries(Object.entries(value)
    .filter(([key, messages]) => /^[a-zA-Z][a-zA-Z0-9_.\[\]-]{0,79}$/.test(key) && Array.isArray(messages))
    .slice(0, 16)
    .map(([key, messages]) => [key, (messages as unknown[]).filter((message): message is string => typeof message === "string" && !!message.trim()).slice(0, 4).map(message => message.slice(0, 500))]));
}
