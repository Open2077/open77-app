---
title: "Smarter NPC fights, Xbox launcher support, and a huge Light RP casino drop"
date: "2026-11-04"
description: "OPEN//77 improves Cyberpunk 2077 multiplayer combat sync, adds Xbox launcher support, and drops a massive Light RP casino and TCG update."
tags: ["cyberpunk-2077-multiplayer", "cp2077-multiplayer", "cyberpunk-2077-online", "cyberpunk-2077-rp-server", "dedicated-server"]
---
Today’s work touched three player-facing areas at once: core combat sync in OPEN//77, launcher compatibility, and a huge content push for Light RP. The headline is better PvE behavior in Cyberpunk 2077 multiplayer, but there is also a lot here for players who live in Night City’s social spaces and server owners planning a Cyberpunk 2077 dedicated server.

## Better PvE combat sync in Cyberpunk 2077 multiplayer

One of the hardest parts of a Cyberpunk 2077 multiplayer mod is making hostile NPCs behave consistently for everyone in the fight. A single-player game assumes one local truth. OPEN//77 has to make that same fight look and feel correct across multiple clients.

Today’s progress focused on exactly that. NPCs now agree more reliably on who they are fighting, observers follow the authority’s target correctly, and victims report their own incoming hits more accurately. That matters because it makes firefights feel less random. If an NPC is shooting at a remote player, the damage result is now much more likely to land on the right person at the right time.

Grenades also got a big cleanup. Previously, replicated NPC copies could create messy situations where explosions looked like they belonged to the local player or where one throw could effectively turn into several. That has been tightened so one NPC throw becomes one synchronized event for the fight.

Movement and handoff behavior improved too. NPC copies now stay much closer to the authority during combat, face their targets more naturally, and avoid several classic multiplayer failure cases like snap-backs, drift, and getting stuck far from the real combat position. If a copy cannot close the gap for too long, the system now recovers more gracefully instead of letting the mismatch linger.

For admins and testers, new NPC debug tools were added to help visualize ownership, health, drift, and combat state in the world. That is not a player feature by itself, but it should speed up the path toward more stable co-op and PvE encounters in Cyberpunk 2077 online.

## Pedestrian-free zones for busy hubs

Another important fix came from crowded spawn areas. On a busy RP server, too many ambient pedestrians near the spawn hub can consume the client’s dynamic entity budget. When that happens, player-relevant devices and interactions can be delayed or time out.

OPEN//77 now supports pedestrian exclusion zones. Inside those areas, civilians will not spawn, sit, visit, or wander through. The immediate win is cleaner, more reliable hubs where actual player activity takes priority over background crowd simulation.

That is especially useful for a Cyberpunk 2077 RP server with a dense social spawn, event square, or custom plaza.

## Bigger UI payloads and smoother complex interfaces

The WebUI bridge can now handle much larger page messages. In plain language, that means in-game interfaces are less likely to hit silent limits when they need to send a lot of state at once.

This work directly helped some of the Light RP interfaces below, especially systems with large catalogs, rich panels, or busy live boards. It is one of those foundational improvements that quietly makes OPEN//77 feel more capable as CP2077 multiplayer keeps adding deeper systems.

## Launcher now supports approved Xbox Windows installs

The launcher now accepts approved Xbox Windows game installs alongside Steam and GOG. That widens the supported ways to get into OPEN//77 and removes one more compatibility headache for players.

There is also a small but useful quality-of-life change: switching update channels now triggers an immediate update review, so players do not have to wait around wondering whether a new build is available.

## Light RP gets a major casino rebuild

Light RP had one of its biggest content days in a while. The casino experience received a broad visual and gameplay overhaul with upgraded Night City art, improved interactions, and brand-new activities.

The headline additions are a pool table with server-simulated shots, more polished blackjack pacing, better board games, premium slot machine and wheel art, and a refreshed casino map. Table collisions were improved so props feel solid in the world, and the interaction flow was rebuilt several times into something closer to what players expect: better seated views, clearer prompts, a bottom action bar, clickable marks, placement helpers, and support for staff management.

Tables also now render from much farther away using levels of detail, which reduces immersion-breaking pop-in when approaching the casino floor.

On the RP side, player markers evolved from simple dots into proper Light RP nameplates, with voice feedback while nearby players speak. Those nameplates can now also be hidden in PvP or chase contexts where readability and fairness matter more than social convenience.

## Ripperdocs become easier to find and safer to use

Light RP’s ripperdoc system received a major usability pass. All 14 base-game ripperdoc clinics are now marked on the maps, with GPS guidance and better clinic naming.

The interface itself became much more resilient. Several bugs that could leave players staring at a non-responsive page or, worse, stuck without input were fixed. The system now gives focus back safely if the interface does not answer as expected.

There is also a new clinic guide for first-time visitors, plus a surgery preview that shows capacity impact, money cost, street cred requirements, and swap outcomes before committing. That makes cyberware upgrades easier to understand without trial and error.

## A full Cyberpunk TCG arrives in Light RP

The wildest addition of the day is a standalone in-game trading card system integrated into Light RP. Players can collect cards, open physical booster packs, manage a binder, use special shops, and interact with cards in the world.

The feature includes visible pack opening, support for boosters and display boxes as real inventory items, a dedicated Kabuki map marker for the NEON DECK shop, and upgraded official-looking card presentation. It is exactly the kind of side activity that makes Night City online feel like a place instead of just a combat sandbox.

## Why this day matters

The best OPEN//77 updates are the ones that improve both the foundations and the fantasy. Today did both.

Core multiplayer work made PvE fights more trustworthy, which is essential for Cyberpunk 2077 co-op and any future combat-heavy server. At the same time, Light RP pushed deeper into the "living city" vision with richer social spaces, cleaner interfaces, more activities, and more reasons to stay in-world.

That combination is the real goal: stable systems underneath, stylish Night City chaos on top.

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
