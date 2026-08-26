---
title: "Animated vehicle entry, new gamemodes, and a second server"
date: "2026-08-26"
description: "OPEN//77 added real-time animated vehicle entry, new gamemodes, and a second Cyberpunk 2077 dedicated server for Pursuit."
tags: ["cyberpunk 2077 multiplayer", "cyberpunk 2077 dedicated server", "cp2077 multiplayer", "night city online", "cyberpunk 2077 online"]
---
OPEN//77 had a very real “game-feel meets game-systems” kind of day. The latest work improves how **Cyberpunk 2077 multiplayer** looks moment to moment, while also adding new playable structures behind the scenes: better vehicle entry replication, sharper world UI, two gamemode examples, and a second live server.

## Real-time vehicle entry and exit now looks far more natural

One of the most noticeable upgrades in this batch is vehicle entry and exit replication. Other players should now see your seat transition begin when it actually begins, instead of learning about it late and seeing a rough approximation.

That matters a lot in a **Cyberpunk 2077 online** experience. Vehicles are social spaces in multiplayer: piling into a car, jumping out at a stop, or reacting to a chase all need to read clearly to everyone nearby. The new work moves OPEN//77 closer to that goal by synchronizing the start of those actions in real time.

The presentation of remote players entering vehicles also got better. Instead of a visible snap into the seat, the system now masks that attach step behind the animation. The result should be a cleaner, more believable entry sequence for anyone watching from outside the car.

## World UI now keeps up during fast camera movement

Another strong visual improvement landed in the world-overlay path. Nameplates, interaction prompts, and ground markers are now drawn in the same frame that presents them.

Before this, fast camera movement could make those elements visibly lag behind the player or object they belonged to. During a quick whip of the camera, a label could appear far away from the character it was supposed to track. That kind of mismatch breaks immersion fast, especially in **CP2077 multiplayer** where players rely on labels and prompts to understand what is happening around them.

The new approach keeps those overlays much better aligned with the world. It is the kind of fix many players will not describe in technical terms, but they will absolutely feel it the first time they spin the camera in a crowded scene.

## Stability fixes for clients and servers

This update was not just about visuals. Several changes should make sessions more reliable.

A delayed client crash related to cleaning up remote player proxies was fixed. That kind of issue is especially frustrating because it can hit after the original event is already out of sight. Removing that crash point is a solid quality-of-life win for regular testing and future public play.

The shared resource cache was also made safer when multiple OPEN//77 clients use the same game installation. In practical terms, that reduces the chance of clients stepping on each other when handling downloaded data.

On the server side, the logic that tracks player visibility no longer treats an old position snapshot as if the player disconnected. That should reduce cases where visibility state gets dropped for the wrong reason.

## Shared gamemode building blocks arrive

A big systems milestone landed for future content: shared gameplay primitives that any gamemode can use. The new set includes zones, world UI, and ground-circle markers.

That may sound simple, but it is an important step for a **Cyberpunk 2077 multiplayer mod**. Reusable building blocks mean each new mode does not have to reinvent the same basic tools. That speeds up development, improves consistency, and makes it easier to support more than one style of server over time.

There was also work on fairness in the scripting scheduler, helping resources share frame time more evenly. For players, that is the kind of under-the-hood improvement that supports smoother behavior when more systems are active at once.

## Pursuit and Race expand the playable future

OPEN//77 now has two new gamemode examples built on those shared systems.

**Pursuit** is the headline addition: a server-authoritative cops-and-runners mode set in Night City. It includes role-based play, match cars, scanner information, roadblocks, arena bounds, and server-owned win conditions. That makes it more than a toy example. It is a genuine proof that OPEN//77 can support structured multiplayer rules beyond simple freeroam.

**Race** is a smaller checkpoint mode where players join at the start line and place by finish time. It is intentionally less polished, but that is part of the point. It exists to prove the new primitives are not locked to one design. A system that supports both a cops-and-runners loop and a checkpoint race is a healthier foundation for future **Cyberpunk 2077 RP server** ideas and other custom modes.

## Dedicated servers are branching out

The platform backend rolled out op77.7 with support for the new vehicle-entry protocol, the Pursuit gamemode, and resource state continuity.

Just as importantly, OPEN//77 now has a second live dedicated server running alongside freeroam, with Pursuit getting its own separate deployment. For anyone following the project as a future host or community organizer, that is a meaningful sign of direction. OPEN//77 is not only becoming more playable; it is becoming more multi-server.

Server owners also got a useful quality-of-life feature in the form of startup command lists. Dedicated servers can now automatically run chosen commands at boot, making it easier to bring a server online with the state and settings you actually want.

## Why this day matters

This update combined three things that matter for a real multiplayer experience: better animation clarity, stronger stability, and more evidence that multiple game types can exist on top of the same foundation.

That is good news whether you are waiting for **Night City online**, hoping for proper **Cyberpunk 2077 co-op** moments with friends, or already thinking about what kind of dedicated server you would want to run. OPEN//77 still has plenty of road ahead, but today’s work made the project look more alive, feel more responsive, and act more like a platform instead of a prototype.

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
