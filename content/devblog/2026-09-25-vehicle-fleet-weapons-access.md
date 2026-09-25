---
title: "Big vehicle tests, weapon workshop, and smoother account access"
date: "2026-09-25"
description: "OPEN//77 improves Cyberpunk 2077 multiplayer with heavy vehicle stress fixes, weapon tuning tools, and smoother account and launcher access."
tags: ["cyberpunk-2077-multiplayer", "cp2077-multiplayer", "cyberpunk-2077-online", "cyberpunk-2077-rp-server"]
---
OPEN//77 made progress across three important fronts today: heavier multiplayer vehicle stress testing, deeper weapon gameplay support, and a smoother path from verified account to launcher to server. It is the kind of update that matters for long-term quality in a **Cyberpunk 2077 multiplayer mod**, even when some of the work started life as internal testing.

## Bigger vehicle stress runs are paying off

The headline engineering push today was vehicle scale. The team expanded its multiplayer driving fleet tests dramatically, including runs that reached 200 cars. That does not mean public servers are about to become 200-car demolition derbies overnight, but it does mean OPEN//77 is pushing much harder on the systems that need to survive busy scenes in Night City online.

Those fleet runs helped uncover and fix several problems that players would absolutely notice. One fix prevents seated character rendering updates from overflowing at very high car counts. Another cleans up the lingering “ghost driver” problem where a departing player’s body could remain visible in a seat for a short time after the vehicle was already gone.

Vehicle control handling also became more forgiving. Previously, if a player tried to claim vehicle control at the wrong moment and the server did not have a fresh enough movement snapshot, the result could be a disconnect. That flow now fails safely instead of kicking the player, which is a much better outcome for real sessions.

The team also improved vehicle and crowd authority behavior under heavy load. Door authority stays alive more reliably in dense scenes, and cancelled population registrations are reclaimed before spawning. That kind of work sounds invisible on paper, but it is exactly what helps a **Cyberpunk 2077 dedicated server** feel solid when a lot is happening at once.

## Third-person knockdowns and ragdolls look more believable

Another visible quality win landed in third-person presentation. Vehicle knockdowns now behave more naturally from the player camera, so the view stays readable while the character falls instead of producing a messy perspective shift.

Remote ragdolls also got a meaningful improvement. Fallen bodies now remain in ragdoll until the proper canonical recovery state arrives, instead of popping out of it too early. For players, that means fewer strange snap-backs during chaotic scenes. For future **Cyberpunk 2077 co-op** and RP experiences, it is one more piece of the illusion holding together when multiple clients are watching the same event.

There was also a camera-related fix to stop pooled workspot camera references from bleeding across actors. In normal language: interactions and camera-driven sequences are being made safer so one actor’s setup does not accidentally affect another.

## Weapon tuning gets a real workshop example

Today also brought a nice gameplay-facing step for server builders: native weapon tuning support, plus an English-language weapon workshop example in the roleplay example content.

That matters because weapon systems become much more useful when they are not just exposed as raw functionality, but shown in a working gameplay loop. Server owners can now look at a concrete workshop-style implementation instead of starting from zero.

The team also added support for approved weapon blasts that can launch networked characters. This is not a blanket arcade switch for every weapon, but it is a real physical reaction feature that can power custom events, special weapons, or stylized server gameplay. In the context of a future **Cyberpunk 2077 RP server**, these examples are valuable because they show where combat scripting can go beyond basic damage and hit markers.

The web docs were updated alongside this work, including notes about current weapon-restoration edge cases. That transparency is useful for builders planning content on top of the latest systems.

## Verified ownership and approved access are getting smoother

Outside the game client itself, OPEN//77 also improved account and access handling. Verified Steam and GOG ownership links are now persisted, which makes genuine-player verification more reliable over time. On the admin side, there is now better support for permanent game access management and signed manual approval.

This is especially relevant for community operators who want tighter control over who joins test environments or curated servers. It is a quality-of-life improvement for both staff and players, because fewer access decisions need to be repeated and the system has a clearer memory of verified ownership.

## Launcher and downloads are more resilient

The launcher picked up several practical improvements as well. Proton setup support is now shipped, which is good news for players running through Linux compatibility layers. Profile recovery is also safer, reducing the chance that a local issue turns into a frustrating re-setup.

On top of that, release delivery moved to a new verified CDN, with the website and launcher aligned around the updated download flow. The player-facing takeaway is simple: cleaner updates and more reliable delivery for future client and server builds.

## Why this day matters

This was not a single flashy feature drop. It was a systems day, and those days are how **Cyberpunk 2077 online** starts feeling real instead of experimental.

OPEN//77 now has stronger evidence from larger vehicle runs, better third-person knockdown presentation, more believable multiplayer ragdolls, more useful weapon-building examples, and smoother account-to-launcher access. For anyone watching the road to **CP2077 multiplayer**, that is a strong kind of progress: less glamorous than a trailer moment, but much closer to the kind of stability players and server owners will care about when Night City opens up.

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
