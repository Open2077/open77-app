---
title: "Night City\u2019s crowd just got a lot more alive"
date: "2026-10-09"
description: "OPEN//77 adds a more natural living crowd, better multiplayer NPC sync, Stable 132, and major NCWE upgrades for Cyberpunk 2077 multiplayer servers."
tags: ["cyberpunk-2077-multiplayer", "cp2077-multiplayer", "cyberpunk-2077-dedicated-server", "cyberpunk-2077-rp-server", "night-city-online"]
---
OPEN//77 made a big immersion push today. The latest work improves how pedestrians behave and sync in **Cyberpunk 2077 multiplayer**, while Stable 132 is now live for the client and dedicated servers. On top of that, NCWE took a major leap forward for creators building custom spaces for a **Cyberpunk 2077 RP server** or freeroam world.

## A more believable living crowd in Night City

The biggest visible change is the pedestrian crowd. OPEN//77 now lets walkers use the game’s own pedestrian traffic systems instead of relying on a custom route presentation layer. That means pedestrians can follow native walking flow, react with the game’s own fear behavior, visit world spots more naturally, and respect traffic logic like crossings and lights.

For players, the result is simple: the city feels less like a test map and more like Night City. Walkers can move with the world instead of looking like scripted decorations. The crowd around players is starting to feel like part of the simulation.

This update also includes support for more crowd variety. Pedestrians can visibly carry props such as phones, cigarettes, bags, cans, umbrellas, and tablets, and those props now appear correctly for other nearby players too. Small details like that do a lot for the illusion of a real **Cyberpunk 2077 online** world.

## Better multiplayer sync for pedestrians and NPCs

Getting a living crowd to work in multiplayer is not just about spawning walkers. The hard part is making sure different players see the same thing.

A lot of today’s work focused on that. Crowd walkers are now hosted more cleanly, handovers between hosts are less disruptive, and replayed pedestrians behave more reliably after interruptions. Several long-standing edge cases were also fixed: some walkers could get stuck with no host, some could resume badly after being interrupted, some could snap awkwardly into seats, and some could choose paths that looked wrong or doubled back.

Vehicle impacts were another major problem area. A pedestrian hit by a car could previously desync between players, leaving one player seeing a recovery while another saw a body stuck in the wrong state. That has now been tightened up so knockdowns are shared more consistently, and lethal outcomes are handled in a common way when appropriate.

Crosswalk behavior also got smarter. Walkers can now wait at red lights instead of marching through intersections. That is a small detail on paper, but in motion it adds a lot to the feel of a believable **Cyberpunk 2077 co-op** city.

## More room for busy scenes

The NPC budget per resource has been increased to 1024, while the overall global cap remains in place. This matters for larger scenes where seated civilians and walking pedestrians need to coexist without starving each other of slots.

In practical terms, this gives OPEN//77 more headroom for denser public spaces and more active urban areas without needing to choose between “people sitting around” and “people moving through the city.”

## Pause menu and scripting improvements

The in-game pause experience also moved forward. Native settings, mouse bindings, and a more responsive retained UI are now included. That is not as flashy as the crowd work, but it makes test builds feel much closer to a usable game client instead of a rough prototype.

For server owners and scripters, Lua runtime validation was strengthened around RTTI calls, hooks, and resource lifetimes. The player-facing benefit is stability: fewer bad scripts turning into confusing runtime failures or harder-to-diagnose crashes.

## Stable 132 is now published

Stable 132 has been released for both the client and **Cyberpunk 2077 dedicated server** builds. That gives players and future server owners a clear stable target, and it gives the rest of the platform a firmer base for testing and deployment.

## NCWE keeps growing fast for custom worlds

NCWE had a huge day as well. The world editor received meaningful upgrades across terrain, roads, materials, exports, and general usability.

Terrain sculpting is smoother and easier to read while editing. Roads now preview before placement, connect more naturally, support loops and better end connections, and generate smarter junctions where roads cross or meet. Junctions also shape terrain and inherit better road materials, which should make custom streets feel much closer to the base game.

Material editing is also more powerful now. Creators can manage material slots more cleanly, assign materials to more kinds of meshes, and work on edited game meshes with fewer visual surprises. Exporting is clearer too, thanks to a dedicated progress window.

Finally, the editor itself got a workflow polish pass: better branding, improved splash behavior, a radial shortcut menu, and a much more usable keyboard shortcuts window. For anyone building custom districts, interiors, or server-specific map edits, those quality-of-life changes matter every day.

## Why this day matters

Today was about turning systems into something players can actually feel. A city crowd that walks naturally, reacts better, and stays in sync across clients is a major milestone for a **Cyberpunk 2077 multiplayer mod**. At the same time, better creator tools move OPEN//77 closer to a future where custom servers can shape their own version of Night City.

That is the exciting part of this phase: one side is making **Night City online** feel alive, and the other side is giving builders the tools to reshape it.

---

## About OPEN//77

[OPEN//77](https://open2077.net) is a free, in-development **multiplayer mod for
Cyberpunk 2077**: play online with other players in Night City on
community-hosted **dedicated servers**, with synced combat, vehicles and world
state, an account-backed launcher, and Lua-scriptable servers for co-op,
freeroam and RP. Browse [servers](https://open2077.net/servers), read the
[docs](https://open2077.net/docs) to host your own, or join the
[Discord](https://discord.open2077.net) to follow development. This devblog is
published daily, straight from the work the team shipped that day.
