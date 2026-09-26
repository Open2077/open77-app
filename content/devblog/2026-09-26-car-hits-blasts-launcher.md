---
title: "Car hits, blast knockdowns, and a smarter launcher"
date: "2026-09-26"
description: "OPEN//77 improved Cyberpunk 2077 multiplayer with better car-hit reactions, faster blast feedback, smoother account setup, and persistent favorites."
tags: ["cyberpunk-2077-multiplayer", "cyberpunk-2077-online", "cp2077-multiplayer", "launcher", "dedicated-server"]
---
OPEN//77 made Cyberpunk 2077 multiplayer feel more responsive today, especially around vehicle impacts and explosive combat. The launcher also got a welcome round of quality-of-life upgrades, with easier account setup, persistent favorites, and more reliable server joins.

## Better feedback for car hits in Cyberpunk 2077 multiplayer

One of the rough edges in any fast-moving Cyberpunk 2077 co-op or online experience is when a hit technically happens, but the player who caused it does not really see the result. That was happening with car impacts: a driver could hit someone, but not always see the victim fall correctly on their own screen.

That has now been improved. Driver-side car-hit prediction is enabled by default, and follow-up work made sure the proper fall reaction can still appear for the driver even when other gameplay rules would previously block the expected cue. The practical result is simple: if you hit someone with a vehicle, the reaction is much more likely to look immediate and believable.

This matters because vehicle chaos is a big part of Night City online. When drivers, passengers, and bystanders all see something different, multiplayer starts to feel mushy. Tightening that feedback loop makes collisions easier to read and more satisfying in motion.

## Explosive blasts now read better for players and NPCs

Explosive force was another area where network delay could make combat feel soft. In some cases, a blast hitting a vehicle or a player controlled by somebody else had to travel through too many steps before the local player saw the result. That meant the shooter could experience a noticeable pause before the knockback or fall showed up.

Today’s update adds shooter-side prediction for those blasts. In plain language, the game now shows the likely reaction sooner on the attacking player’s screen instead of making that player wait for the full network round trip.

The team also improved how blast knockdowns work on networked NPCs. Before, an NPC reaction could look correct only on the machine that happened to own that character, while everybody else saw less convincing behavior. Now those blast knockdowns are being shown across all copies much more reliably.

For a Cyberpunk 2077 multiplayer mod, this kind of work is not flashy in a trailer, but it is exactly what makes gunfights feel more real. Better visual agreement between players means less confusion, fewer “what just happened?” moments, and stronger combat readability.

## Small gameplay fixes that help movement feel normal again

There was also a useful third-person gameplay fix in today’s work: nearby native interactions and upright climbing were restored. That is the kind of change many players will not notice in patch notes, but they will absolutely feel when moving around the city.

When interactions and traversal behave as expected, the whole game feels less brittle. That is especially important for a Cyberpunk 2077 RP server or any social server where players spend a lot of time exploring, climbing, and interacting with the world rather than only fighting.

## Launcher improvements: less friction, faster setup

Outside the game client, the OPEN//77 launcher had a strong quality-of-life pass.

The biggest onboarding change is that store linking is now optional during account setup. Players can sign in and move forward without being forced through that extra step right away. If they want to link later, they can come back to it. That lowers friction for new players who just want to get started.

Epic account linking was also added and polished, with the setup staying inside the launcher workspace instead of feeling like a disconnected handoff. On top of that, layout fixes improved how the account-linking flow presents itself.

This is a big deal for accessibility. The best launcher is the one that gets out of the way, and these changes move OPEN//77 closer to that goal.

## Server browser and join reliability upgrades

Today also brought a few practical improvements for people jumping between servers in this Cyberpunk 2077 dedicated server ecosystem.

Server favorites now persist between sessions and remain available offline. That means players can keep a list of favorite worlds without rebuilding it every time, and server owners benefit because it is easier for returning players to find their communities again.

Diagnostics also got fixed so it no longer gets stuck after successful connections, and required server mods are now activated and verified more reliably before joining. That should reduce failed joins and cut down on confusing pre-connection problems.

## Account rollout and compatibility

The backend and game platform also moved forward on account admission and account-link support with compatibility in mind for existing servers. The important player-facing part is straightforward: smoother sign-in options are arriving without forcing a hard break for older live environments.

That kind of compatibility work matters for OPEN//77 as a Cyberpunk 2077 online platform. It helps the project keep shipping improvements without making every update feel disruptive for players or future server owners.

## Why this update matters

Today’s progress was about feel. Vehicle hits look more convincing to the driver. Explosive combat reacts faster and more consistently. NPC knockdowns read better for everyone. The launcher wastes less of the player’s time.

That is not a headline built around one giant feature drop. It is the kind of work that makes a Cyberpunk 2077 multiplayer mod feel solid enough to trust in moment-to-moment play. And when the goal is a believable Night City online experience, that trust is everything.

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
