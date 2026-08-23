/**
 * Content for the "Server licensing" documentation page (`/docs/server-licensing`).
 *
 * Authored in TypeScript rather than the wiki because it describes the
 * platform (accounts, the keymaster, master authorisation) rather than the
 * server Lua API the wiki covers. The page renders from these constants and
 * its Markdown twin is projected from `licensingToMarkdown()`, exactly as the
 * platform page does.
 */

export const LICENSING_TITLE = "Server licensing";

export const LICENSING_DESCRIPTION =
  "How a server joins the OPEN//77 platform: create an account, mint a license key in the keymaster, put the key in your server config, and how the master authorises the server on boot.";

export const LICENSING_LEDE =
  "Every server on the platform belongs to an account. You create a license key on open2077.net, put it in your server's configuration, and the master authorises the server when it starts — no key, no listing.";

export const LICENSING_OVERVIEW =
  "OPEN//77 works like FiveM's keymaster: a server exists on the platform because a logged-in owner created a key for it. The key ties the server to your account, puts it in the public server browser under your name, and is the switch you use to pull it back off. Anonymous servers are not part of the platform — a server with no valid key is refused by the master and never appears in the browser.";

export const ONBOARDING_STEPS = [
  {
    num: "01",
    title: "Create your account",
    body: "Register on open2077.net with an e-mail and password, then verify your e-mail. One account covers everything — the server browser, your license keys, and your game identities. E-mail verification is required before you can create a key.",
    href: "/account",
    linkText: "Go to your account",
  },
  {
    num: "02",
    title: "Mint a license key",
    body: "In your account, open Server license keys and create one. Give it a label so you can tell your servers apart. The key is shown once — copy it now; the platform only stores a fingerprint and can never show it again.",
    href: "/account/keys",
    linkText: "Open the keymaster",
  },
  {
    num: "03",
    title: "Give the key to your server",
    body: "Point your server config at the key — through the OP77_LICENSE_KEY environment variable (recommended) or the masterServer.licenseKey field. Keep the key out of any file you commit or share.",
    href: "#linking-the-key",
    linkText: "How to link the key",
  },
  {
    num: "04",
    title: "Start the server",
    body: "On boot the server presents its key to the master, is authorised, and appears in the browser under your account. Revoke the key later and the server drops off the platform.",
    href: "#authorisation",
    linkText: "What the master checks",
  },
] as const;

export const KEY_SHAPE =
  "A license key looks like op77_live_ followed by 43 characters. Treat it like a password: anyone holding it can enrol a server against your account. If a key leaks, revoke it in the keymaster and mint a new one.";

export const KEY_FACTS = [
  {
    label: "Shown once",
    body: "The full key is displayed only at creation. The platform stores a one-way fingerprint, so support can never recover it — losing it means revoke and replace.",
  },
  {
    label: "One key, many servers",
    body: "A single key can enrol more than one server. Use separate keys per community or per environment so you can revoke one without taking the others down.",
  },
  {
    label: "Up to twenty active keys",
    body: "Each account can hold twenty active license keys at a time. Revoked keys do not count against the limit.",
  },
  {
    label: "Revocable at any time",
    body: "Revoking a key immediately cuts off every server enrolled with it — the master stops authorising them and they leave the browser.",
  },
] as const;

export const LINKING_INTRO =
  "The server reads the key from its configuration when it starts. There are two ways to supply it; the environment variable is preferred because it keeps the key out of any file you might commit or hand to someone else.";

export const ENV_INTRO =
  "Set OP77_LICENSE_KEY in the server's environment and leave the config credential-free:";

export const ENV_SAMPLE = `# Linux / macOS
export OP77_LICENSE_KEY="op77_live_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"

# Windows (PowerShell)
$env:OP77_LICENSE_KEY = "op77_live_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"`;

export const CONFIG_INTRO =
  "Or put it in the masterServer block of server.jsonc. The masterServer.licenseKeyEnvironmentVariable field lets you rename the variable the server looks for; it defaults to OP77_LICENSE_KEY, and an explicit licenseKey wins when both are set:";

export const CONFIG_SAMPLE = `{
  "masterServer": {
    "enabled": true,
    "url": "https://master.open2077.net/",

    // Prefer the environment variable and leave this null so the file
    // stays safe to commit. Set it here only for a private deployment.
    "licenseKey": null,
    "licenseKeyEnvironmentVariable": "OP77_LICENSE_KEY"
  }
}`;

export const LINKING_OUTRO =
  "Never commit a real key. The tracked server.jsonc should keep licenseKey null and rely on the environment variable; a leaked key should be revoked in the keymaster, not merely rotated in the file.";

export const AUTH_INTRO =
  "When the server starts with a valid key, the master authorises it and keeps it authorised for as long as it stays healthy. You never touch the platform database — everything goes through the key.";

export const AUTH_STEPS = [
  {
    title: "The key is verified",
    body: "The master looks up your key. An unknown key, a revoked key, or a suspended owner is refused with a single error — the server logs \"Master refused the platform license key…\" and does not appear in the browser.",
  },
  {
    title: "The server is bound to your license",
    body: "On success the server is tied to your account and license, and its identity key is registered. That binding is what puts the server under your name in the browser and lets you manage it from your account.",
  },
  {
    title: "It is issued a run lease",
    body: "The master hands the server a short-lived, signed run lease — renewed every heartbeat — that stands as proof the server is licensed and current. Stop heartbeating, or lose the license, and the lease is not renewed.",
  },
  {
    title: "Revocation takes effect immediately",
    body: "Revoke the key in the keymaster and the cascade is instant: the server's credential is cut, no new lease is issued, and it drops out of the browser on its next request.",
  },
] as const;

export const AUTH_NOTE =
  "Player-side enforcement — official clients refusing to complete a handshake with a server whose lease has expired — is still being built. Today the master side is live: no license means no enrolment, no listing and no lease.";

export const MANAGE_INTRO =
  "Your account lists every key you hold, with its label, fingerprint and creation date, and a control to revoke it. Revoking is how you take a server off the platform, retire a community, or respond to a leaked key.";

/** Markdown twin of the page, projected from the same constants. */
export function licensingToMarkdown(): string {
  const lines: string[] = [`# ${LICENSING_TITLE}`, "", LICENSING_LEDE, ""];

  lines.push("## Overview", "", LICENSING_OVERVIEW, "");

  lines.push("## From zero to a listed server", "");
  for (const step of ONBOARDING_STEPS) {
    lines.push(`${step.num}. **${step.title}** — ${step.body}`);
  }
  lines.push("");

  lines.push("## Your license key", "", KEY_SHAPE, "");
  for (const fact of KEY_FACTS) lines.push(`- **${fact.label}** — ${fact.body}`);
  lines.push("");

  lines.push("## Linking the key to your server", "", LINKING_INTRO, "");
  lines.push(ENV_INTRO, "", "```bash", ENV_SAMPLE, "```", "");
  lines.push(CONFIG_INTRO, "", "```jsonc", CONFIG_SAMPLE, "```", "");
  lines.push(LINKING_OUTRO, "");

  lines.push("## How the master authorises your server", "", AUTH_INTRO, "");
  AUTH_STEPS.forEach((step, index) => {
    lines.push(`${index + 1}. **${step.title}** — ${step.body}`);
  });
  lines.push("", `> ${AUTH_NOTE}`, "");

  lines.push("## Managing your keys", "", MANAGE_INTRO, "");

  return `${lines.join("\n")}\n`;
}
