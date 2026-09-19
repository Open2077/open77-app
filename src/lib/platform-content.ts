/**
 * Content for the "How OPEN//77 works" page.
 *
 * Lifted out of the route so three consumers can share one copy: the rendered
 * page, the `FAQPage` structured data, and the Markdown projection served at
 * `/docs/platform.md` for agents and answer engines. Keeping them in one place
 * is the only way the machine-readable version cannot quietly diverge from what
 * a human reads.
 */

import {
  GAME_BUILD,
  GAME_EXPANSION,
  PLAYER_REQUIREMENTS,
  SERVER_REQUIREMENTS,
} from "@/lib/requirements";

export const PLATFORM_TITLE = "How OPEN//77 works";

export const PLATFORM_DESCRIPTION =
  "Overview of the OPEN//77 multiplayer platform, player requirements, dedicated servers and Lua resources.";

export const PLATFORM_LEDE =
  "Connect players to community-operated Cyberpunk 2077 servers and build gameplay with Lua resources.";

export const PLATFORM_OVERVIEW =
  "OPEN//77 is a multiplayer platform for Cyberpunk 2077. Each community operates its own dedicated server, gamemode and rules.";

export const IS_NOT = [
  "One official multiplayer server run by us",
  "A fixed game mode you have to play",
  "A peer-to-peer co-op session mod",
  "A product of CD PROJEKT RED",
];

export const IS = [
  "The infrastructure that lets anyone run a Cyberpunk 2077 server",
  "A client that discovers and connects you to community servers",
  "A creator toolkit for building custom game modes and systems",
  "Common ground for players, server owners and developers",
];

export const REQUIREMENTS_INTRO =
  "Players need a legal copy of Cyberpunk 2077 at the exact supported game build, with Phantom Liberty installed. Newer game builds are not automatically compatible; see the requirements below.";

export const REQUIREMENTS_SERVER_INTRO =
  "The dedicated server runs independently of the game and does not require game assets.";

export const PLAYER_STEPS = [
  {
    title: "Own the game",
    body: `OPEN//77 requires your own legal copy of Cyberpunk 2077, at build ${GAME_BUILD}, with ${GAME_EXPANSION}. The platform never distributes game content. It builds on the game you bought. Pirated or cracked copies are not supported and not welcome.`,
  },
  {
    title: "Install the client",
    body: "The OPEN//77 client runs alongside your installation. Your single-player game, saves and mods stay untouched.",
  },
  {
    title: "Browse the servers",
    body: "Open the server browser, filter by game mode or language, read a server's page, and pick the world you want to live in tonight.",
  },
  {
    title: "Connect & play",
    body: "The client fetches that server's resource set, verifies its signature and content hashes, and drops you into Night City alongside everyone else on that server.",
  },
];

export const SERVER_POINTS = [
  {
    title: "Persistent worlds",
    body: "The world keeps running when you log off. Economies, factions and stories continue. The server remembers.",
  },
  {
    title: "Authoritative state",
    body: "Positions, inventories, vehicles, loot, time and weather: the server decides what is true, and clients render approved state. That is what makes real economies and fair PvP possible.",
  },
  {
    title: "Operated by communities",
    body: "Everyone with Alpha access can download the Windows or Linux server, configure their platform license and build their own worlds. No separate developer application is required. Players need Alpha access to join.",
  },
];

export const DEDICATED_INTRO =
  "A dedicated server owns shared world state and accepts player connections. OPEN//77 does not use peer-to-peer sessions.";

/**
 * Split around its one inline link so the page and the Markdown projection are
 * built from the same words instead of two copies that drift.
 */
export const RESOURCES_INTRO_PARTS = {
  lead: "Gameplay is packaged as ",
  linkLabel: "resources",
  linkHref: "/docs/server-resources",
  tail: ": self-contained directories with a manifest, Lua scripts, declared permissions, dependencies and optional web interfaces. The server picks the resource set for a session; connecting clients download it, verify its signature and content hashes, and activate it before entering the world.",
} as const;

export const RESOURCES_INTRO =
  RESOURCES_INTRO_PARTS.lead + RESOURCES_INTRO_PARTS.linkLabel + RESOURCES_INTRO_PARTS.tail;

/**
 * The scriptable surfaces, each pointing at the guide that documents it.
 *
 * The pre-port page listed aspirational categories ("jobs, factions,
 * reputation") that nothing in the codebase backed. These are the systems the
 * wiki actually documents, which is the difference between a feature list and a
 * wish list.
 */
export const SCRIPTABLE = [
  {
    label: "Vehicles",
    href: "/docs/vehicles",
    body: "network identity, streaming, authority leases, seats, doors and damage",
  },
  {
    label: "NPCs",
    href: "/docs/npcs",
    body: "server-owned templates, streaming, task queues and life state",
  },
  { label: "Loot", href: "/docs/loot", body: "authoritative ground drops and validated pickups" },
  {
    label: "Time and weather",
    href: "/docs/weather",
    body: "synchronised session time and weather presets",
  },
  {
    label: "Elevators",
    href: "/docs/elevators",
    body: "server-authoritative native lifts with late-join catch-up",
  },
  {
    label: "Interactions",
    href: "/docs/interactions",
    body: "contextual world and NPC prompts with action keys",
  },
  {
    label: "Custom UI",
    href: "/docs/notifications",
    body: "WebUI pages, toasts, blips and map pins",
  },
  {
    label: "Identity and ACL",
    href: "/docs/server-acl",
    body: "durable player ids, whitelists and restricted commands",
  },
];

export const MANIFEST_SAMPLE = `resource "hello"
version "1.0.0"
auto_start true

client_script "client/main.lua"
server_script "server/main.lua"

permissions { "network.events", "world.loot" }`;

export const SERVER_SAMPLE = `RegisterCommand("hello", function(source, args)
    print(("player %d said hello"):format(source))
end, false)`;

export const RESOURCES_OUTRO =
  "Every registered function is listed in the Lua API reference at /docs/api, separated by runtime so a client projection is never mistaken for server authority. APIs can change during Alpha; read each guide's limitations before depending on a feature.";

export const ROADMAP_INTRO =
  "Alpha members can play, download the server and build custom gamemodes now. Development priorities include reliability, compatibility and the resource ecosystem; release dates are not guaranteed.";

export const ROADMAP = [
  {
    stage: "NOW",
    chip: "ALPHA",
    title: "Build and test today",
    body: "Launcher and Windows/Linux server packages, Freeroam, a live server browser, WebUI and documented client/server Lua APIs. Everyone with Alpha access can start building without a separate developer application.",
  },
  {
    stage: "NEXT",
    title: "Reliability and developer feedback",
    body: "Broader fresh-install and multiplayer validation, reconnect and animation fixes, clearer diagnostics and improved hosting workflows.",
  },
  {
    stage: "THEN",
    title: "Compatibility and capacity",
    body: "Measure representative server workloads and hardware, reduce breaking changes, and document supported combinations as they are validated.",
  },
  {
    stage: "BEYOND",
    title: "The ecosystem",
    body: "Featured communities, server reputation, resource sharing between servers: the parts that only matter once real worlds exist. The community will shape these.",
  },
];

/**
 * The FAQ.
 *
 * The rendered `<details>` list and the `FAQPage` structured data are generated
 * from this array, so the answer a search engine quotes is always the answer on
 * the page. Answers are plain prose for the same reason.
 */
export const FAQ = [
  {
    question: "Is OPEN//77 official? Is CD PROJEKT RED involved?",
    answer:
      "No. OPEN//77 is an independent community project. It is not affiliated with, endorsed by, or supported by CD PROJEKT RED. Cyberpunk 2077 is the property of CD PROJEKT S.A. We build alongside the game, not on their behalf.",
  },
  {
    question: "Do I need to own Cyberpunk 2077?",
    answer:
      `Yes, always. OPEN//77 never distributes the game or its assets. You need your own legal copy of Cyberpunk 2077 on 64-bit Windows, at game build ${GAME_BUILD}, with ${GAME_EXPANSION} installed. The platform adds multiplayer infrastructure on top of it.`,
  },
  {
    question: "Does OPEN//77 work with pirated or cracked copies?",
    answer:
      "No. A legal copy of Cyberpunk 2077 and its required expansion is mandatory. Pirated or cracked installations are unsupported.",
  },
  {
    question: `Is ${GAME_EXPANSION} required, or only recommended?`,
    answer:
      `Required. The expansion ships as the EP1 content set, and the world the client loads when you connect to a server is an EP1 save. Without the expansion installed there is nothing for it to load. The base game on its own is not enough.`,
  },
  {
    question: "Do I need Cyberpunk 2077 to host a server?",
    answer:
      `No. The dedicated server runs independently of Cyberpunk 2077 on Windows x64 or Linux x64. Both published packages include the .NET runtime. Everyone who connects still needs their own Cyberpunk 2077 ${GAME_BUILD} installation with ${GAME_EXPANSION}.`,
  },
  {
    question: "So is this one big multiplayer server?",
    answer:
      "No, and this is the core idea. OPEN//77 is the platform underneath many servers. Communities run their own independent worlds with their own game modes and rules; the client lets you browse and join them. If FiveM's model for GTA V is familiar, that is the shape.",
  },
  {
    question: "Can I play it right now?",
    answer:
      "Yes, with Alpha access. Download the launcher and sign in with your approved OPEN//77 account to join a server. Need access? Use the bot command /alpha apply in any channel on our official Discord. Alpha can still have bugs, crashes and incomplete features; this is not a stable release.",
  },
  {
    question: "Can I host my own server?",
    answer:
      "Yes. Everyone with Alpha access can download the Windows or Linux server and start developing, with no separate developer application or special access required. The Freeroam template and system resources are included. Follow the hosting guide, configure your license and reachable endpoints, and invite other Alpha players.",
  },
  {
    question: "What can server creators actually customize?",
    answer:
      "Servers run resources: packages of server-side and client-side Lua with a manifest, declared permissions and optional web interfaces. The documented systems today include vehicles, NPCs, loot, time and weather, elevators, contextual interactions, chat, notifications, blips and visual effects. A pure racing server and a hardcore roleplay city can both be OPEN//77 servers.",
  },
  {
    question: "Will it break my single-player game or saves?",
    answer:
      "The client is designed to run alongside your installation without touching your single-player saves or mod setup. Multiplayer state lives on the server you join.",
  },
  {
    question: "How much will it cost?",
    answer:
      "The platform is intended to be free to use. Players must purchase Cyberpunk 2077 and the required expansion; server owners cover their hosting costs.",
  },
];

/** Markdown projection of the page, served at `/docs/platform.md`. */
export function platformToMarkdown(): string {
  const lines: string[] = [`# ${PLATFORM_TITLE}`, "", PLATFORM_LEDE, ""];

  lines.push("## Overview", "", PLATFORM_OVERVIEW, "");
  lines.push("### OPEN//77 is not", "");
  for (const item of IS_NOT) lines.push(`- ${item}`);
  lines.push("", "### OPEN//77 is", "");
  for (const item of IS) lines.push(`- ${item}`);
  lines.push("");

  lines.push("## How it works (for players)", "");
  PLAYER_STEPS.forEach((step, index) => {
    lines.push(`${index + 1}. **${step.title}**: ${step.body}`);
  });
  lines.push("");

  lines.push("## Requirements", "", REQUIREMENTS_INTRO, "");
  lines.push("### To play", "");
  for (const item of PLAYER_REQUIREMENTS) lines.push(`- **${item.label}**: ${item.body}`);
  lines.push("", "### To host a server", "", REQUIREMENTS_SERVER_INTRO, "");
  for (const item of SERVER_REQUIREMENTS) lines.push(`- **${item.label}**: ${item.body}`);
  lines.push("");

  lines.push("## Dedicated servers", "", DEDICATED_INTRO, "");
  for (const point of SERVER_POINTS) lines.push(`- **${point.title}**: ${point.body}`);
  lines.push("");

  lines.push("## Resources and scripting", "", RESOURCES_INTRO, "");
  lines.push("Documented systems:", "");
  for (const item of SCRIPTABLE) lines.push(`- **${item.label}** (${item.href}): ${item.body}`);
  lines.push("", "Resource manifest (`resources/hello/open77.lua`):", "");
  lines.push("```lua", MANIFEST_SAMPLE, "```", "");
  lines.push("Server entry point (`resources/hello/server/main.lua`):", "");
  lines.push("```lua", SERVER_SAMPLE, "```", "");
  lines.push(RESOURCES_OUTRO, "");

  lines.push("## Roadmap", "", ROADMAP_INTRO, "");
  for (const item of ROADMAP) {
    lines.push(`### ${item.stage}${item.chip ? ` (${item.chip})` : ""}: ${item.title}`, "", item.body, "");
  }

  lines.push("## FAQ", "");
  for (const entry of FAQ) {
    lines.push(`### ${entry.question}`, "", entry.answer, "");
  }

  return `${lines.join("\n")}\n`;
}
