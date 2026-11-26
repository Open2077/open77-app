---
title: "Big server stability pass, plus a new ragdoll system \ud83d\udca5"
date: "2026-11-26"
description: "OPEN//77 made major server stability gains and added new ragdoll groundwork for its Cyberpunk 2077 multiplayer mod and dedicated server stack."
tags: ["cyberpunk-2077-multiplayer", "cp2077-multiplayer", "dedicated-server", "rp-server", "night-city-online"]
---
OPEN//77 had a backend-focused day, but the kind that matters for everyone waiting on **Cyberpunk 2077 multiplayer**. The big story is better stability on the new Rust dedicated server path, plus a new server-controlled ragdoll system that opens the door for better knockdowns, impacts, and scripted gameplay moments in Night City online.

A lot of the work this round was about removing long-session problems: memory that could keep growing, state that was not always cleaned up after disconnects, and edge cases where heavy scripting activity could trip over active gameplay systems.

## A major stability pass for the Rust dedicated server

The largest player-facing win is a broad cleanup pass across sessions, scripting, authorities, and transport. In plain language: the team found and fixed several places where a busy server could slowly hold onto data longer than it should.

That includes combat and damage records from disconnected players, stale state linked to entities that no longer exist, and pooled network buffers that could grow too much during bursts like joins or heavy event traffic. These are the kinds of bugs that do not always show up in a quick test, but they matter a lot for a real **Cyberpunk 2077 dedicated server** that stays online for hours with lots of players.

There were also fixes for script-driven actions happening during active session processing. Some gameplay scripts can fire events, drop players, ban players, or trigger client events while the server is already in the middle of handling packets. That kind of overlap is exactly where nasty edge-case failures can hide. The new handling is safer and more controlled, which should mean fewer strange stalls or crashes under pressure.

## Better cleanup when players disconnect

Another important improvement is disconnect cleanup. When a player leaves, the server now clears more of the temporary gameplay state tied to that player.

This matters for combat-heavy servers and future **Cyberpunk 2077 RP server** setups, because lingering damage history, hit windows, or authority state can slowly add noise and overhead if left behind. Fixing cleanup now helps long-running servers stay healthy and predictable.

The same idea applies to state bags and other entity-linked data. If an entity is gone, the server now does a better job of making sure old script state does not keep hanging around in the background.

## New server-authoritative ragdoll support

The most gameplay-flavored update of the day is new ragdoll support on the Rust server path. Server resources can now start, stop, and manage an active ragdoll state with the server staying in charge.

That might sound small, but it is a strong building block for a **Cyberpunk 2077 multiplayer mod**. Server authority is what helps keep effects consistent between players instead of becoming purely local visual chaos. Ragdolls can be useful for knockdowns, heavy impacts, scripted takedowns, special abilities, and cinematic event moments.

This does not automatically mean full polished gameplay around it yet, but it is exactly the kind of foundation feature that makes later systems easier to build well.

## Warden keeps evolving for server owners

Server owners also got visible progress in Warden, the OPEN//77 admin panel. The desktop-style interface received another visual redesign pass, this time aligning more closely with the open2077.net visual language.

This is not a feature expansion so much as a presentation upgrade, but it matters because Warden is shaping up as the face of server management: setup, remote administration, performance views, resource handling, and day-to-day control in one place.

## The bigger picture for CP2077 multiplayer

The Rust server work this round was huge in scope, with major pieces of the platform now assembled across networking, scripting, remote administration, setup, resource hosting, discovery, and performance tooling. Most players will not feel that immediately in a flashy trailer moment, but it is exactly the kind of progress that turns a prototype into a real **Cyberpunk 2077 online** platform.

The honest version: this is still foundation-heavy work. The exciting version: the foundation is getting much more complete, much more battle-tested, and much more suited for busy public servers.

That means fewer invisible problems later, better scaling for packed sessions, and stronger building blocks for co-op, freeroam, and roleplay experiences across Night City.

More soon. 🚀

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
