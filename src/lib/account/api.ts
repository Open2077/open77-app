/**
 * Browser client for the OPEN//77 master's account API.
 *
 * The master is the single source of truth for accounts and license keys; the
 * site is a pure API consumer of it — no second user store, no proxying
 * through Next. Every call here runs in the browser and carries the opaque
 * session token as a bearer header.
 *
 * All errors surface as `MasterApiError` with the master's own `{code,
 * message}` body, so components can branch on `code` and fall back to the
 * human message for anything they don't specifically know.
 */

const DEFAULT_MASTER_URL = "http://127.0.0.1:8090";

/** Base URL of the master API, without a trailing slash. */
export const MASTER_URL = (
  process.env.NEXT_PUBLIC_OP77_MASTER_URL ?? DEFAULT_MASTER_URL
).replace(/\/$/, "");

export class MasterApiError extends Error {
  readonly code: string;
  readonly status: number;

  constructor(code: string, message: string, status: number) {
    super(message);
    this.name = "MasterApiError";
    this.code = code;
    this.status = status;
  }
}

/** True when the failure means "the master is not reachable at all". */
export function isOffline(error: unknown): boolean {
  return error instanceof MasterApiError && error.code === "network";
}

export type RegisterResult = {
  accountId: string;
  email: string;
  /** Present only where the master has no mailer (local dev); null in production. */
  verificationToken: string | null;
};

export type LoginResult = {
  token: string;
  expiresAtUtc: string;
  accountId: string;
  displayName: string;
  role: string;
  emailVerified: boolean;
};

export type LinkedIdentity = {
  userId: string;
  displayName: string;
  linkedAtUtc: string;
};

export type Account = {
  accountId: string;
  email: string;
  emailVerified: boolean;
  displayName: string;
  role: string;
  identities: LinkedIdentity[];
};

export type License = {
  licenseId: string;
  label: string;
  keyHint: string;
  createdAtUtc: string;
  revokedAtUtc: string | null;
};

export type CreatedLicense = {
  licenseId: string;
  label: string;
  /** The full op77_live_ key. Shown exactly once; the master keeps only a hash. */
  key: string;
  keyHint: string;
  createdAtUtc: string;
};

/** Shared request core, also the base of the admin client in admin-api.ts. */
export async function masterCall<T>(
  path: string,
  init: { method?: string; token?: string; body?: unknown } = {},
): Promise<T> {
  let response: Response;
  try {
    response = await fetch(`${MASTER_URL}${path}`, {
      method: init.method ?? "GET",
      headers: {
        ...(init.body !== undefined ? { "Content-Type": "application/json" } : {}),
        ...(init.token ? { Authorization: `Bearer ${init.token}` } : {}),
      },
      ...(init.body !== undefined ? { body: JSON.stringify(init.body) } : {}),
    });
  } catch {
    throw new MasterApiError(
      "network",
      "The master server is not reachable. Check your connection and try again.",
      0,
    );
  }

  if (response.status === 429) {
    throw new MasterApiError(
      "rate_limited",
      "Too many attempts — wait a minute and try again.",
      429,
    );
  }
  if (!response.ok) {
    let code = "unknown";
    let message = `The master server answered ${response.status}.`;
    try {
      const body = (await response.json()) as { code?: string; message?: string };
      if (body.code) code = body.code;
      if (body.message) message = body.message;
    } catch {
      // A non-JSON error body keeps the fallback message.
    }
    throw new MasterApiError(code, message, response.status);
  }
  if (response.status === 204) {
    return undefined as T;
  }
  return (await response.json()) as T;
}

export function register(input: {
  email: string;
  password: string;
  displayName: string;
}): Promise<RegisterResult> {
  return masterCall("/api/v1/accounts/register", { method: "POST", body: input });
}

export function verifyEmail(input: { email: string; token: string }): Promise<void> {
  return masterCall("/api/v1/accounts/verify-email", { method: "POST", body: input });
}

export function login(input: { email: string; password: string }): Promise<LoginResult> {
  return masterCall("/api/v1/accounts/login", { method: "POST", body: input });
}

export function logout(token: string): Promise<void> {
  return masterCall("/api/v1/accounts/logout", { method: "POST", token });
}

export function me(token: string): Promise<Account> {
  return masterCall("/api/v1/accounts/me", { token });
}

export function listLicenses(token: string): Promise<License[]> {
  return masterCall("/api/v1/accounts/licenses", { token });
}

export function createLicense(token: string, label: string): Promise<CreatedLicense> {
  return masterCall("/api/v1/accounts/licenses", { method: "POST", token, body: { label } });
}

export function revokeLicense(token: string, licenseId: string): Promise<void> {
  return masterCall(`/api/v1/accounts/licenses/${licenseId}/revoke`, { method: "POST", token });
}

export type LauncherAuthorization = {
  /** The one-time code to hand back to the launcher's loopback callback. */
  code: string;
  expiresAtUtc: string;
};

/**
 * Mints a single-use, PKCE-bound authorization code for the desktop launcher.
 * The launcher opened this page with its `code_challenge`; the master ties the
 * code to that challenge and to this account, and the launcher later exchanges
 * it (with its verifier) for its own session — no password crosses the wire.
 */
export function authorizeLauncher(
  token: string,
  codeChallenge: string,
): Promise<LauncherAuthorization> {
  return masterCall("/api/v1/accounts/launcher/authorize", {
    method: "POST",
    token,
    body: { codeChallenge },
  });
}
