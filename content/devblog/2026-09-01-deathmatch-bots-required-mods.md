---
title: "Deathmatch just became real"
date: "2026-09-01"
description: "OPEN//77 added real Cyberpunk 2077 multiplayer deathmatch with bots, ratings, and smoother required mod installs for dedicated servers."
tags: ["cyberpunk-2077-multiplayer", "cp2077-multiplayer", "cyberpunk-2077-dedicated-server", "cyberpunk-2077-rp-server", "night-city-online"]
---
OPEN//77 had a very big day: the PvP prototype grew into a real playable deathmatch experience, and the platform added a much smoother required-mod flow for server owners and players. For anyone following Cyberpunk 2077 multiplayer, this is one of those updates where separate systems finally start feeling like one product.

## Cyberpunk 2077 multiplayer deathmatch gets a real gameplay loop

The headline change is simple: deathmatch is no longer just a bare-bones test. OPEN//77 now has a much more complete PvP loop with arenas, bots, scoring, HUD support, map tools, and career progression.

The team spent the last stretch proving the ugly but important pieces: how rounds load, how players get placed, how arena boundaries behave, how deaths are counted, how standings update, and how match information actually appears on the HUD. That work does not sound flashy on paper, but it is the difference between "a few systems exist" and "a match can run from start to finish."

Kabuki was a major focus for this work. Real spawn locations were captured in-game, playable spaces were surveyed, and multiple arena sections now use grounded volumes instead of rough placeholder footprints. That means formats can use more accurate spaces rather than forcing every mode into the same generic area.

The result is a much stronger base for Cyberpunk 2077 co-op and PvP experimentation alike, because combat modes need reliable placement, boundaries, and match state before anything else can feel good.

## Bots now use native combat AI

One of the coolest upgrades in this batch is bot combat. Earlier bot behavior relied on scripted targeting and scripted damage. That was enough to test round flow, but not enough to feel believable.

Bots now fight using the game engine’s own combat AI. That matters for two reasons. First, it should make fights look and feel far more natural inside Night City. Second, it removes a lot of fake combat logic that would always be fragile compared with the systems the game already uses for enemies.

This does not magically finish all PvP combat work, but it is a major step toward OPEN//77 feeling like Cyberpunk 2077 online instead of a simulation layered on top.

## Ratings and career stats arrive for multiple formats

Career stats are in, and now rating joins them. The new rating system is tracked per format, which is important because a player’s performance in a duel should not mean exactly the same thing as performance in a larger free-for-all.

Free-for-all rating is a harder problem than standard two-team matchmaking, because there are more than two outcomes to evaluate. The team implemented a format that reads final standings and turns them into pairwise results between participants. In plain language: placement in a larger match now feeds a rating system in a sensible way instead of being ignored.

That gives OPEN//77 a better long-term foundation for competitive Cyberpunk 2077 multiplayer mod play, while still being useful for casual server communities that want persistent stats.

## Better tools for building arenas in Night City

A lot of today’s progress came from better admin and survey tools.

Noclip was improved so moving around the city feels less restricted, and admins can now travel much more directly while surveying future arenas. There is also a world map travel shortcut for admins, which makes moving between test locations much faster.

These changes sound small, but they save a huge amount of time when walking locations, capturing spawn points, checking boundaries, and validating match spaces. Better tools are one reason the team was able to convert Kabuki from a survey target into a real FFA-ready location.

## Required mods become much smoother for server owners

The other major story today is server-required mods.

Servers can now declare which mods players must have before joining. The platform side verifies approved mod hashes rather than acting like a public file mirror, while the game server can host the bytes needed for its own players. That separation matters for both practicality and policy: server operators control what they require, while the platform confirms what has been approved.

On the player side, the launcher now resolves a world’s required mods before the game boots. That is a big usability win. Instead of connecting, discovering a missing requirement, and then bouncing through a restart, the launcher can prepare the install first and then start the game ready to join.

For anyone interested in running a Cyberpunk 2077 dedicated server or a Cyberpunk 2077 RP server later on, this is one of the first really important quality-of-life milestones. Modded servers only work at scale if joining them is understandable and low-friction.

## Stability fixes that mattered immediately

Not every important change was a feature. The team also fixed a nasty client deployment issue where stale script data from another build could break installs. There were also release corrections to ensure the actual PvP client shipped correctly and that packaged mod bytes matched what the launcher expected.

That kind of cleanup is worth calling out because launcher, client, and server features only matter if players can actually press Connect and get the right build.

## What this means for OPEN//77

This update pushed OPEN//77 much closer to a believable first public slice of CP2077 multiplayer. The project now has a stronger PvP core, smarter bots, persistent ratings, more accurate arenas, and a much better required-mod workflow.

There is still plenty to build, but this was a meaningful "prototype to product" kind of day. For players waiting on Cyberpunk 2077 multiplayer, and for future server owners planning their own Night City online spaces, that is exactly the kind of progress that counts.

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
