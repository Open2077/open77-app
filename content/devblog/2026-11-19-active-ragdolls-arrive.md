---
title: "Active ragdolls crash into Night City"
date: "2026-11-19"
description: "OPEN//77 adds active ragdolls to Cyberpunk 2077 multiplayer, plus smoother knockdown camera work and stronger anti-cheat enforcement."
tags: ["cyberpunk-2077-multiplayer", "cp2077-multiplayer", "cyberpunk-2077-online", "anti-cheat"]
---
OPEN//77 had a very gameplay-heavy day. The big feature is active ragdolls for players and NPCs, backed by a lot of polish for camera behavior, death flow, and default server setup. On top of that, Sentinel anti-cheat moved forward with stronger live enforcement and stability protections that matter for real multiplayer sessions.

## Active ragdolls make knockdowns feel physical

The standout change is a new active ragdoll system in the core multiplayer game. In plain language, this means a falling body is no longer just switching to a limp animation state. The body now tries to react to what actually happened, so impacts, pushes, and knockdowns can look much more grounded and dramatic.

For a **Cyberpunk 2077 multiplayer mod**, this matters a lot. Combat readability, vehicle collisions, rooftop chaos, and even simple shove-like moments all become more believable when characters seem to have weight. It is the kind of feature players notice instantly, even if they do not know the tech behind it.

This also applies to NPCs, not just players, which helps Night City feel more alive during shared action. The result is less “animation snap” and more “that hit really connected.”

## Better camera behavior during local ragdolls

A good ragdoll system can still feel bad if the camera turns into a mess. That got attention too.

When the local player ragdolls, OPEN//77 now keeps the view in a smooth third-person camera that rides with the body. The camera eases toward the body instead of snapping harshly, and it is built to behave better around walls and cramped corners. That should make knockdowns much easier to read and far less disorienting.

For **Cyberpunk 2077 co-op** and online firefights, camera clarity is a huge quality-of-life improvement. Players need to understand what just happened, where the body ended up, and when control is coming back. A smoother camera makes the system feel intentional instead of chaotic in the bad way.

## Visual cleanup and respawn fixes

The team also cleaned up one of the ugliest immersion breakers: the duplicate-body look during local ragdolls. That odd “standing version plus fallen version” problem is gone, so the presentation is much more convincing.

There is also an important death-flow fix. Previously, the corpse could interfere with respawn and effectively pull the player back into a broken dead state or a bad position. That kind of bug can ruin a session fast, especially on a busy **Cyberpunk 2077 online** server. The new fix separates the respawned player from the old corpse state properly, which should make recovery much more reliable.

These are not glamorous patch-note items, but they are exactly the kind of fixes that make new features usable in live play.

## Server templates now include the ragdoll system

This is a small line item with a big practical effect for server owners: the active ragdoll system is now included in server templates by default.

That means new or updated **Cyberpunk 2077 dedicated server** setups should get the feature without extra guesswork. For future server owners, this is the ideal kind of infrastructure change: less manual setup, fewer missing pieces, and a better chance that what players see in development updates is what they actually get when they spin up a server.

The team also expanded internal ragdoll testing with directional pushes, which should help tune reactions and edge cases over time.

## Sentinel anti-cheat takes a serious step forward

Outside of physics, the other important update is Sentinel. The anti-cheat stack gained stronger enforcement tied to scan trust, plus new protections around abuse and component liveness.

Without getting into sensitive implementation details, the practical takeaway is simple: OPEN//77 is pushing further into server-authoritative, reviewable enforcement instead of trusting the client too much. The latest work adds more checks for suspicious runtime conditions, better handling for abusive request patterns, and watchdog-style protections that help detect when critical pieces stop behaving correctly.

That matters for any future **Cyberpunk 2077 RP server** or public freeroam server. Fairness is not only about catching cheats; it is also about keeping important systems responsive and dependable when real players are connected.

## Why this update matters

This was a strong “feel of the game” update. Active ragdolls make Night City online look and behave more like a physical world, not a set of canned reactions. The camera improvements and respawn fixes make that feature practical for real sessions, not just cool in clips. And the anti-cheat work continues to build confidence that OPEN//77 can support stable, fair multiplayer over time.

For players waiting to jump into **CP2077 multiplayer**, today’s progress is easy to picture: harder hits, better falls, cleaner recovery, and stronger guardrails behind the scenes. That is a good day in Night City.

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
