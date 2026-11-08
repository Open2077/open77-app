---
title: "Big stability pass for busy servers"
date: "2026-11-07"
description: "A big stability pass improves Cyberpunk 2077 multiplayer servers, fixes weapon snapshot bugs, and makes Light RP smoother at high player counts."
tags: ["cyberpunk-2077-multiplayer", "cyberpunk-2077-rp-server", "cyberpunk-2077-dedicated-server", "cp2077-multiplayer", "light-rp"]
---
Today’s work focused on one thing: keeping OPEN//77 stable when Night City gets crowded. This update improves **Cyberpunk 2077 multiplayer** reliability at high player counts, fixes a nasty weapon snapshot bug, and adds several player-facing quality-of-life upgrades in Light RP.

## A major stability pass for busy servers

The biggest change today is a broad optimization and recovery pass across the core platform and Light RP. Recent testing exposed a pattern: once servers got into the 70 to 90+ player range, several systems were doing too much work in a single moment. That could trigger Lua instruction limits, stall gamemode tasks, or in the worst cases bring a resource down.

The fixes were not one single miracle patch. Instead, the team went through the hot paths that matter during real sessions: online player list updates, board game state pushes, parkour ticking, Maneki streaming, and character loading and switching. Heavy work now happens in a much more controlled way, with less waste and fewer giant bursts.

For players, the result is simple: fewer spikes, fewer broken interactions, and a much better chance that a packed **Cyberpunk 2077 RP server** keeps running smoothly through join waves and busy gameplay.

## Better recovery when something goes wrong

The platform itself is now more forgiving when Lua resources hit runtime problems. Server owners can set much larger Lua memory limits than before, or disable the memory cap entirely if they really need to. The default remains conservative, but the ceiling is now much more realistic for large, feature-rich servers.

There is also a practical safety net now: if a resource stops because of a runtime error, it can restart on its own. That matters a lot for a **Cyberpunk 2077 dedicated server**, because a temporary script failure no longer has to mean a dead gamemode until a human notices.

Light RP also learned how to recover better from that situation. If the gamemode starts or restarts while players are already connected, it can now adopt those players instead of leaving them in a broken in-between state.

On Linux hosts, the team also fixed a Lua quota crash path that could abort the server runtime. That is not a flashy feature, but it is exactly the sort of low-level stability work that makes **Cyberpunk 2077 online** sessions more dependable.

## Weapon snapshot fixes remove a chain reaction

One bug caused a surprising amount of pain: certain melee and knife setups could make the weapon snapshot system refuse the entire snapshot. In plain English, one awkward item state could poison the full weapon update.

That had knock-on effects in Light RP and especially in Gun Game. It could freeze weapon HUD information, trigger repeated kit re-deliveries, and create unnecessary performance cost during matches.

The core snapshot handling is now more tolerant, and Light RP also adjusted Gun Game behavior so knife loadouts do not keep poking that weak spot. Some weapon swaps are lighter too, which reduces extra work during rapid progression.

The result is smoother combat behavior, cleaner HUD updates, and fewer weird kit loops during minigames.

## Light RP quality-of-life upgrades

Several player-facing fixes landed alongside the stability work.

Vehicle rentals now last 1 hour instead of 30 minutes, and rentals can be extended. That gives players more room for actual roleplay and less pressure to babysit a timer. Fuel consumption was also reduced to one-third of the previous rate, so normal city driving is far less punishing.

Parkour starts are cleaner now too. The countdown waits until the start area has fully loaded, so players no longer lose precious seconds behind a loading screen.

The TCG experience got a nicer on-ramp. New characters now begin with 3 boosters in their inventory, and the NEON DECK vendor now introduces the system with a welcome guide when a player approaches for the first time.

There are also smaller but meaningful fixes: the death presentation hides the awkward first-person collapse, chat handles apostrophes properly, the Coastview courier was restored, and a stuck TCG preview issue was fixed.

## Character and admin safety improvements

An appearance restore edge case could previously leave a player effectively locked out if a restore verification partially matched but still failed. That failure is no longer allowed to latch in the same way, which should prevent a frustrating login or spawn issue.

Admin tools are safer too. Missing targets no longer default to the admin who typed the command, and self-kick or self-ban mistakes are blocked. Staff messages are also clearer, while "Go to" is now discreet instead of announcing itself to the target.

## Why this update matters

This was not a glam update full of giant new headline systems. It was the kind of work that makes a **Cyberpunk 2077 multiplayer mod** feel real: fewer crash paths, smarter load handling, more graceful recovery, and less friction in day-to-day play.

For players waiting on OPEN//77, this is the foundation work that helps Night City feel alive under real population. For future server owners, this is a strong sign that OPEN//77 is getting better at surviving the messy reality of live multiplayer, not just ideal test cases.

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
