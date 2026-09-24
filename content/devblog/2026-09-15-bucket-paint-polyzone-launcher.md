---
title: "Buckets, Paint, PolyZone \u2014 and a Better Launcher"
date: "2026-09-15"
description: "OPEN//77 improves Cyberpunk 2077 multiplayer with bucket fixes, vehicle paint syncing, PolyZone support and a redesigned launcher."
tags: ["cyberpunk-2077-multiplayer", "cp2077-multiplayer", "cyberpunk-2077-dedicated-server", "cyberpunk-2077-rp-server", "night-city-online"]
---
OPEN//77 made a strong stability-and-tools push today. The big wins are better routing bucket behavior, a fix for streamed vehicle paint, new PolyZone support for server owners, and a redesigned launcher experience for players trying to get into Cyberpunk 2077 multiplayer.

## Better routing buckets for Cyberpunk 2077 dedicated server setups

Routing buckets are one of the building blocks for private interiors, mission instances, minigames, and RP scenes. They let a **Cyberpunk 2077 dedicated server** separate groups of players and world states cleanly.

Today’s fixes improve two important edge cases. First, an unconfigured bucket now behaves as empty instead of acting like some old default world state. Second, re-entering a bucket is now handled correctly, which should reduce weird sync problems when players move in and out of server-managed spaces.

This kind of work is not flashy in a trailer, but it matters a lot in a real **Cyberpunk 2077 RP server**. Instancing only feels good when it is predictable. Server owners need confidence that moving a player into a custom scene will not produce strange ambient behavior or leave somebody in the wrong state when they come back.

## Streamed vehicle paint now stays correct

Another visible improvement is vehicle appearance syncing. Streamed vehicles now keep their paint correctly when they appear for other players.

That means fewer moments where a car looks right to one person and wrong to everyone else. In any **Cyberpunk 2077 online** experience, cosmetic consistency matters more than it sounds. Vehicles are a huge part of Night City’s identity, and mismatched appearance immediately makes a multiplayer session feel less believable.

This fix is especially useful for freeroam servers, car meetups, faction fleets, and future roleplay scenarios where vehicle identity matters.

## PolyZone support opens up better custom server gameplay

One of the most exciting additions for server owners is PolyZone support. OPEN//77 now has zone tools for circle, box, polygon, combined zones, and moving-entity zones.

In plain language, this gives creators a much better way to define areas in the world and react to players entering, leaving, or interacting with them. That can power things like:

- safe zones
n- job start areas
- mission triggers
- shop interactions
- faction territory
- moving event zones attached to vehicles or NPCs

For anyone planning a **Cyberpunk 2077 multiplayer mod** server with custom gameplay, this is a very practical upgrade. Zone systems are the glue behind a lot of modern multiplayer design, and having first-class support makes resources cleaner and more reliable.

The team also updated the in-game web UI around zone selection to avoid compatibility problems, which helps keep those tools working smoothly in the shipped client.

## Launcher redesign improves the first-run experience

The launcher also moved forward with a desktop redesign. The new experience focuses on clearer navigation, a more native desktop feel, and smoother account-to-game flow.

Players should also benefit from better update choices, improved diagnostics, clearer connection feedback, and a required-content consent flow. On top of that, local server identity and history handling were fixed, which should make the launcher more dependable when connecting to local or custom setups.

For a project like OPEN//77, the launcher is not just a downloader. It is the front door to **Cyberpunk 2077 co-op** and multiplayer sessions. Every improvement there reduces friction before players even reach Night City.

## Website fixes and workshop polish

A small but important website fix also landed: the site's player download buttons lead to the launcher instead of the Workshop area. That means new visitors are less likely to take a wrong turn when they are trying to sign in and prepare to play.

The Workshop library and its cards also now load cover images eagerly, which prevents blank-looking tiles on first view. It is a modest change, but it makes the resource library feel much more complete and readable.

## Better docs for future server owners

Server-owner documentation got a major quality pass too. Gameplay guides around cyberware-related systems were rewritten as practical how-to pages, and every API reference card now includes a concrete runnable Lua example.

That matters because good docs turn features into actual servers. A powerful function list is useful, but a copyable example is what helps a creator build a command, event, mission, or gameplay loop quickly.

## Quietly important: more live proof, less guesswork

The team also continued expanding in-game validation across shipped features. Recent merged systems like hacking, dash, ground slam recovery, context menus, and player interactions were pushed through live checks, with broad coverage across gameplay rows.

That is exactly the kind of foundation work a serious **CP2077 multiplayer** project needs. Strong proof does not create hype screenshots, but it does create trust: fewer regressions, more confidence, and a better chance that new features will still behave once they reach players.

OPEN//77 is still building toward broader public play, but today’s changes move both sides of the project forward: a better player path through the launcher, and better world-building tools for the people who want to host the next great Night City server.

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
