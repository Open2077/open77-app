---
title: "Big combat sync pass, smarter NPCs, safer prediction"
date: "2026-09-30"
description: "A major Cyberpunk 2077 multiplayer mod update improves combat sync, NPC behavior, prediction controls, doors and vehicle handovers."
tags: ["cyberpunk-2077-multiplayer", "cp2077-multiplayer", "cyberpunk-2077-online", "cyberpunk-2077-dedicated-server", "cyberpunk-2077-rp-server"]
---
Today’s work was a big quality pass on the parts of OPEN//77 that decide whether **Cyberpunk 2077 multiplayer** feels smooth or messy: combat, NPC life, prediction, doors, and vehicle authority. A lot of this update is about making the client feel responsive while keeping the server as the final judge, which is critical for a fair **Cyberpunk 2077 online** experience.

## Better prediction without losing server authority

A large part of the day focused on prediction: the fast local feedback that lets an action feel instant before the server confirms it.

The team tightened up predicted melee hits, slam effects, hacking knockdowns, and door actions. The important player-facing result is simple: when an action is valid, it starts feeling immediate; when it is refused, the fake version cleans itself up faster and more cleanly instead of hanging on screen too long.

That matters because bad prediction is worse than no prediction. A false knockdown, a target standing back up too early, or a door animation continuing after a refusal all make multiplayer look broken even if the server state is technically correct.

There is also a new control layer for server owners. Prediction families can now be managed individually, with a ping ceiling and telemetry support. Safe defaults remain built in, and the optional `open77_prediction` resource exists to expose tuning and admin control rather than to make prediction work in the first place.

## Combat and explosions are syncing more convincingly

Explosions got a meaningful step forward for **CP2077 multiplayer**.

Grenade and blast events are now relayed more reliably through the platform, which means the effects of a detonation are no longer trapped on just one client. In practice, that improves shared outcomes like vehicle pushes and NPC knockdowns. Follow-up fixes also improved edge cases around blast timing, safe-zone checks, and grenade crediting, especially for recharging grenade systems.

Handheld weapon evidence also got stronger server validation. Certain NPC and vehicle damage reports now need matching proof that a real discharge happened, and later fixes made sure each hit is matched to the correct shot instead of any recent shot. That is good for fairness, for future anti-abuse work, and for keeping combat outcomes believable on a live server.

## NPC life and damage now follow the server more closely

One of the biggest systemic changes was around NPC health, death, and damage ownership.

The server now has a firmer grip on the life state of network NPCs, so players are less likely to see one copy of an NPC alive while another copy has already died. Several fixes corrected regressions and edge cases where NPCs could stay standing locally even after the shared state said they were dead, or where native reactions were blocked when they should still be visible.

The platform-side handling of player damage against Mortal NPCs was also tightened. This path is now opt-in and requires better evidence, including weapon context. That is especially relevant for future **Cyberpunk 2077 RP server** setups, where server owners may want strict trust boundaries around combat and protected NPC behavior.

The same pass also improved how the server handles NPC damage from environment, vehicles, and other non-standard sources, so the ledger of what happened stays consistent even when the local game engine reacts first.

## Car hits, ragdolls, and moving NPCs look more natural

Vehicle-vs-NPC contact was another major focus.

Drivers now get better local prediction for car impacts with network NPCs, while the shared result converges more cleanly after the contact is verified. Observer copies also got fixes for ragdoll availability, impact reaction sharing, and refusal handling. One especially useful cleanup prevents an unverified contact report from instantly killing the driver’s local presentation if the shared result has not caught up yet.

On top of that, moving NPCs should look less wrong to bystanders. Observer copies now follow authoritative movement more closely, with less drift, less snapping toward unreachable goals, and better behavior when tasks fail at locked doors or invalid destinations.

## Doors and vehicles got important multiplayer fixes

Door interactions saw both usability and trust improvements.

Locked network doors now support proper server-authorized force-open, payment and hack flows. That means costs and outcomes line up with the server decision instead of the client pretending success first and being corrected later. Network NPCs can also interact with network doors now, which is important for believable movement in a shared Night City online space.

Vehicles got several authority fixes too. Occupied cars now survive handovers better, drivers reclaim control more reliably, and traffic authority avoids unhealthy or overloaded simulators more often. There were also protections against bad handovers during lag, readiness changes, or merge regressions that could leave cars incorrectly switched off or frozen under the wrong owner.

## Performance and scale work for future dedicated servers

Some of today’s less flashy changes still matter a lot for the future of **Cyberpunk 2077 dedicated server** support.

NPC traffic now fans out more efficiently, and some repeated broadcast payloads are serialized once instead of once per viewer. The team also expanded a headless scale harness for bot-driven lab testing, which helps measure server behavior under larger simulated populations.

That kind of work is what turns a cool prototype into something that can survive busy streets, crowded firefights, and real server populations.

## Docs and server-owner guidance improved too

The website now has a clearer prediction guide, with more timeless wording and a better explanation of what is built in versus what the optional policy resource adds. The RP example repository also includes a reference copy of the prediction policy resource so server owners can inspect how it is meant to be configured.

For people watching OPEN//77 as a **Cyberpunk 2077 multiplayer mod** project, this was a strong foundational day: fewer visual lies, stronger server authority, better NPC behavior, and more control for the people who will eventually run worlds of their own.

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
