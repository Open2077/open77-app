/**
 * Content for the "Warden" documentation page (`/docs/warden`).
 *
 * Warden is the in-server admin panel — the control room an owner opens in a
 * browser to run a live OPEN//77 server. It is authored in TypeScript, like the
 * hosting and licensing pages, because it describes the platform experience
 * rather than the server Lua API the wiki covers. The page renders from these
 * constants and its Markdown twin is projected from `wardenToMarkdown()`.
 *
 * Warden is being polished in parallel, so this describes it at the capability
 * level — what it lets an owner do — rather than pinning an exact layout that
 * would date quickly.
 */

export const WARDEN_TITLE = "Warden";

export const WARDEN_DESCRIPTION =
  "Warden is the OPEN//77 in-server admin panel: a browser control room for your live server. Stream the console, run commands, hot-reload Lua resources, moderate players, post announcements, edit config and manage admins — without ever restarting.";

export const WARDEN_LEDE =
  "Warden is your live server control room. Open it in a browser from your own PC and run the whole server — console, resources, players and config — while it stays up. It is to an OPEN//77 server what txAdmin is to a FiveM one.";

export const WARDEN_OVERVIEW =
  "A dedicated server is a program on a box somewhere; Warden is the window into it. Instead of tailing a log file over SSH and restarting the process for every change, you open a panel in your browser and drive the running server directly — watch the live console, type commands, reload a resource you just edited, deal with a troublesome player, and push a message to everyone online. Nothing needs a restart, and you never need to be at the machine itself. It is off by default; you turn it on when you want it.";

export const ENABLE_INTRO =
  "Warden ships inside the server build — there is nothing extra to download. You switch it on in server.jsonc by enabling the warden block, then restart the server once so the setting takes effect.";

export const ENABLE_SAMPLE = `{
  "warden": {
    // Off by default. Set to true to serve the admin panel.
    "enabled": true,

    // The address the panel is served on. Default 11780. Keep it bound to
    // localhost (or behind a VPN / SSH tunnel) unless you know what you are
    // exposing — see the security note below.
    "bind": "127.0.0.1:11780"
  }
}`;

export const ENABLE_NOTE =
  "The default panel address is http://<host>:11780. On a machine you sit at, that is http://localhost:11780. On a remote box, reach it over an SSH tunnel or VPN rather than opening the port to the world — Warden is full control of your server.";

export const PIN_INTRO =
  "The first time Warden starts, there is no admin account yet — so it prints a one-time setup PIN to the server log. This is how it proves that whoever creates the first admin actually controls the server machine.";

export const PIN_STEPS = [
  {
    num: "01",
    title: "Read the PIN from the log",
    body: "On the first launch with Warden enabled, the server log prints a one-time setup PIN. It is shown once, in the console output you already have in front of you.",
  },
  {
    num: "02",
    title: "Open the panel and enter it",
    body: "Browse to the Warden address (http://<host>:11780 by default), and it asks for that PIN. Entering it proves you are the operator and unlocks account creation.",
  },
  {
    num: "03",
    title: "Create your admin account",
    body: "Set your admin username and password. This becomes the owner account for the panel — full access to everything Warden can do. The setup PIN is spent and will not work again.",
  },
  {
    num: "04",
    title: "Sign in from anywhere",
    body: "From then on you log in with that account. You can invite more admins and give each of them a role, so your moderators get exactly the access they need and no more.",
  },
] as const;

export const CAPABILITIES_INTRO =
  "Warden is one panel over the whole running server. Everything below happens live, against the server as it is right now — no restart, no redeploy.";

export const CAPABILITIES = [
  {
    icon: "console",
    title: "Live console & commands",
    body: "Watch the server's console stream in real time, and type any server command straight into it — the same commands you would run at the machine, from wherever you are. It is your primary window into what the server is doing.",
  },
  {
    icon: "reload",
    title: "Hot-reload Lua resources",
    body: "Edit a resource, then reload it from the panel and the server picks up the change on the spot — no restart, no dropping the players who are connected. Start, stop and restart individual resources to iterate on a game mode while it is live.",
  },
  {
    icon: "players",
    title: "Player moderation",
    body: "See who is connected and act on them: warn, kick, or ban a player, and manage your ban list, all from the panel. The moderation actions that used to mean digging through commands are buttons next to each player.",
  },
  {
    icon: "announce",
    title: "Announcements",
    body: "Push a message to everyone on the server at once — a scheduled restart warning, an event kickoff, or a rules reminder — without joining the game yourself.",
  },
  {
    icon: "config",
    title: "Config & identity",
    body: "Edit the server's configuration and identity — its name, visibility and public presentation — from the panel, so tuning the server does not mean editing files over SSH and restarting. This is also where the server's icon and banner will be managed.",
  },
  {
    icon: "roles",
    title: "Access & roles",
    body: "Add more admins and give each one a role, so your staff get scoped access — a moderator who can kick and ban without being able to rewrite the config, for instance. You decide who can do what.",
  },
] as const;

export const SECURITY_INTRO =
  "Warden is complete control of your server, so treat access to it accordingly.";

export const SECURITY_POINTS = [
  {
    label: "Off unless you enable it",
    body: "Warden does nothing until you set warden.enabled to true. A server with no Warden block runs exactly as before.",
  },
  {
    label: "Bind it privately",
    body: "Keep the panel on localhost, or behind a VPN or SSH tunnel, rather than exposing its port to the internet. Anyone who can reach the panel and hold an account can run your server.",
  },
  {
    label: "The setup PIN is one-time",
    body: "The PIN only exists to bootstrap the first admin, and it is spent the moment that account is created. After that, access is your admin accounts and their roles.",
  },
] as const;

/** Markdown twin of the page, projected from the same constants. */
export function wardenToMarkdown(): string {
  const lines: string[] = [`# ${WARDEN_TITLE}`, "", WARDEN_LEDE, ""];

  lines.push("## Overview", "", WARDEN_OVERVIEW, "");

  lines.push("## Enabling Warden", "", ENABLE_INTRO, "");
  lines.push("```jsonc", ENABLE_SAMPLE, "```", "");
  lines.push(`> ${ENABLE_NOTE}`, "");

  lines.push("## First run: the setup PIN", "", PIN_INTRO, "");
  for (const step of PIN_STEPS) {
    lines.push(`${step.num}. **${step.title}** — ${step.body}`);
  }
  lines.push("");

  lines.push("## What you can do", "", CAPABILITIES_INTRO, "");
  for (const cap of CAPABILITIES) lines.push(`- **${cap.title}** — ${cap.body}`);
  lines.push("");

  lines.push("## Keeping Warden secure", "", SECURITY_INTRO, "");
  for (const point of SECURITY_POINTS) lines.push(`- **${point.label}** — ${point.body}`);
  lines.push("");

  return `${lines.join("\n")}\n`;
}
