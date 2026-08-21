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
  "What OPEN//77 is and is not, how players connect, why it is built on dedicated servers rather than peer-to-peer sessions, what server creators can change, the project roadmap, and answers to the questions people ask most.";

export const PLATFORM_LEDE =
  "The platform, the architecture, and the creator toolkit — documented in the open as the pre-alpha evolves. Design intent, not shipped software.";

export const PLATFORM_OVERVIEW =
  "OPEN//77 is an open platform that brings community-run multiplayer servers to Cyberpunk 2077 — the way FiveM opened GTA V. Not one server: an ecosystem of them, each with its own game mode, rules and community.";

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
  `Two of these are stricter than the usual "you need the game" line, so they are worth stating plainly: the client is built against game build ${GAME_BUILD} specifically rather than that version or newer, and ${GAME_EXPANSION} is required rather than recommended.`;

export const REQUIREMENTS_SERVER_INTRO =
  "Hosting is a different list. A dedicated server is a normal server process and has no relationship with the game at all.";

export const PLAYER_STEPS = [
  {
    title: "Own the game",
    body: `OPEN//77 requires your own legal copy of Cyberpunk 2077, at build ${GAME_BUILD}, with ${GAME_EXPANSION}. The platform never distributes game content — it builds on the game you already have.`,
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
    body: "The world keeps running when you log off. Economies, factions and stories continue — the server remembers.",
  },
  {
    title: "Authoritative state",
    body: "Positions, inventories, vehicles, loot, time and weather: the server decides what is true, and clients render approved state. That is what makes real economies and fair PvP possible.",
  },
  {
    title: "Operated by communities",
    body: "Anyone will be able to run the server software — on their own hardware or a rented machine — and set their world's rules, resources and moderation.",
  },
];

export const DEDICATED_INTRO =
  "OPEN//77 is built around real dedicated servers, not peer-to-peer sessions. A server is a persistent process that a community operates — it holds the authoritative state of its world, and players connect to it.";

/**
 * Split around its one inline link so the page and the Markdown projection are
 * built from the same words instead of two copies that drift.
 */
export const RESOURCES_INTRO_PARTS = {
  lead: "A server is only as interesting as what runs on it. Gameplay is packaged as ",
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
  "That is the real API, not a sketch — every registered function is listed in the Lua API reference at /docs/api, separated by runtime so a client projection is never mistaken for server authority. The surface will still change while the project is in pre-alpha.";

export const ROADMAP_INTRO =
  "OPEN//77 is in pre-alpha. There is no public build, no live server list, and no release date — and we will not invent any. Here is the honest shape of the road.";

export const ROADMAP = [
  {
    stage: "NOW",
    chip: "PRE-ALPHA",
    title: "Core multiplayer foundations",
    body: "Client/server architecture, session handling, and synchronizing players inside the same world — the unglamorous groundwork everything else depends on.",
  },
  {
    stage: "NEXT",
    title: "Dedicated server & resource system",
    body: "The self-hostable server build, the resource format, and automatic resource delivery to connecting clients.",
  },
  {
    stage: "THEN",
    title: "Server browser & creator SDK",
    body: "Public server discovery, server pages, and a documented scripting API so the first community worlds can open their doors.",
  },
  {
    stage: "BEYOND",
    title: "The ecosystem",
    body: "Featured communities, server reputation, resource sharing between servers — the parts that only matter once real worlds exist. The community will shape these.",
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
      "No. OPEN//77 is an independent community project. It is not affiliated with, endorsed by, or supported by CD PROJEKT RED. Cyberpunk 2077 is the property of CD PROJEKT S.A. — we build alongside the game, not on their behalf.",
  },
  {
    question: "Do I need to own Cyberpunk 2077?",
    answer:
      `Yes, always. OPEN//77 never distributes the game or its assets. You need your own legal copy of Cyberpunk 2077 on 64-bit Windows, at game build ${GAME_BUILD}, with ${GAME_EXPANSION} installed. The platform adds multiplayer infrastructure on top of it.`,
  },
  {
    question: `Is ${GAME_EXPANSION} required, or only recommended?`,
    answer:
      `Required. The expansion ships as the EP1 content set, and the world the client loads when you connect to a server is an EP1 save — without the expansion installed there is nothing for it to load. The base game on its own is not enough.`,
  },
  {
    question: "Do I need Cyberpunk 2077 to host a server?",
    answer:
      `No. A dedicated server runs independently of Cyberpunk 2077, REDengine and the client plugin — it is a standalone .NET process on 64-bit Windows and never loads game content. Everyone who connects to it still needs their own Cyberpunk 2077 ${GAME_BUILD} installation with ${GAME_EXPANSION}.`,
  },
  {
    question: "So is this one big multiplayer server?",
    answer:
      "No — and this is the core idea. OPEN//77 is the platform underneath many servers. Communities run their own independent worlds with their own game modes and rules; the client lets you browse and join them. If FiveM's model for GTA V is familiar, that is the shape.",
  },
  {
    question: "Can I play it right now?",
    answer:
      "Not yet. The project is in pre-alpha and there is no public build. We publish development progress openly rather than promising dates — when a build is ready for testing, it will be announced through the project's channels.",
  },
  {
    question: "Will I be able to host my own server?",
    answer:
      "That is the whole design. The dedicated server software will be self-hostable, so you can run your world on your own hardware or a rented machine, moderate it your way, and list it in the public browser.",
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
      "OPEN//77 is a community project, not a storefront. The platform itself is intended to be free to play on. Beyond that, honest answer: sustainability decisions come after a working platform, and they will be discussed in the open.",
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
    lines.push(`${index + 1}. **${step.title}** — ${step.body}`);
  });
  lines.push("");

  lines.push("## Requirements", "", REQUIREMENTS_INTRO, "");
  lines.push("### To play", "");
  for (const item of PLAYER_REQUIREMENTS) lines.push(`- **${item.label}** — ${item.body}`);
  lines.push("", "### To host a server", "", REQUIREMENTS_SERVER_INTRO, "");
  for (const item of SERVER_REQUIREMENTS) lines.push(`- **${item.label}** — ${item.body}`);
  lines.push("");

  lines.push("## Dedicated servers", "", DEDICATED_INTRO, "");
  for (const point of SERVER_POINTS) lines.push(`- **${point.title}** — ${point.body}`);
  lines.push("");

  lines.push("## Resources and scripting", "", RESOURCES_INTRO, "");
  lines.push("Documented systems:", "");
  for (const item of SCRIPTABLE) lines.push(`- **${item.label}** (${item.href}) — ${item.body}`);
  lines.push("", "Resource manifest (`resources/hello/cyberm.lua`):", "");
  lines.push("```lua", MANIFEST_SAMPLE, "```", "");
  lines.push("Server entry point (`resources/hello/server/main.lua`):", "");
  lines.push("```lua", SERVER_SAMPLE, "```", "");
  lines.push(RESOURCES_OUTRO, "");

  lines.push("## Roadmap", "", ROADMAP_INTRO, "");
  for (const item of ROADMAP) {
    lines.push(`### ${item.stage}${item.chip ? ` (${item.chip})` : ""} — ${item.title}`, "", item.body, "");
  }

  lines.push("## FAQ", "");
  for (const entry of FAQ) {
    lines.push(`### ${entry.question}`, "", entry.answer, "");
  }

  return `${lines.join("\n")}\n`;
}
