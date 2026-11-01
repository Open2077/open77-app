---
title: "Smoother joins, better bodies, and server web powers"
date: "2026-11-01"
description: "Today\u2019s OPEN//77 update improves Cyberpunk 2077 multiplayer joins, body animation, server stability, and adds Lua HTTP tools for dedicated servers."
tags: ["cyberpunk-2077-multiplayer", "cp2077-multiplayer", "cyberpunk-2077-dedicated-server", "cyberpunk-2077-rp-server"]
---
Today’s work improves the feel of moment-to-moment play in **Cyberpunk 2077 multiplayer** while also unlocking a major new capability for server owners. The short version: player bodies look more natural, joining is more reliable, ambient NPC behavior is cleaner, and **Cyberpunk 2077 dedicated server** scripting can now talk to web services directly.

## Better-looking player bodies in third person

A lot of immersion in a **Cyberpunk 2077 multiplayer mod** comes down to body language. Small animation problems stand out immediately when another player is standing right in front of you.

Male bodies now use a more natural idle stance instead of the stiff placeholder-style pose players were seeing before. Ground movement transitions were also smoothed out, so changes between locomotion states feel less abrupt and less robotic.

There was also a replication fix for third-person presentation: remote bodies no longer briefly turn with the sender’s camera while the player is standing still. That strange “body snaps toward head look direction, then corrects itself” moment should now be gone.

Self-view got a practical fix too. On moving lifts and elevators, the visible third-person body could float, shake, or look detached from the floor. That presentation now stays grounded properly, which makes interior movement feel much more solid.

## Night City crowds behave more naturally

Ambient population matters for the feeling of Night City online. One bug made crowd interaction spots behave awkwardly: an NPC could leave a bench or railing, but the spot was not considered free quickly enough for everyone watching. The result was weird overlap and unnatural spacing as another walker appeared almost on top of that same location.

That spot availability now updates at the right moment. In plain terms, when an NPC leaves, the world treats the place as available again right away, which helps benches, rails, and other crowd actions look cleaner from the player perspective.

## More reliable joins in Light RP

Joining a server should feel clear and responsive. In Light RP, some players could end up staring at the loading cover long after the game had actually progressed in the background. One case left the screen stuck at full progress, and another could freeze around mid-load for a long time even though the player character was already moving toward a ready state behind the overlay.

Those cases were fixed by making the loading flow react better to the real game state during the final handoff into the session. For players, the important part is simple: joining a **Cyberpunk 2077 RP server** should now be less likely to feel stalled, misleading, or frozen.

## New HTTP tools for server owners

This is the biggest server-side feature of the day. OPEN//77 servers can now make outbound HTTP requests directly from Lua resources.

That includes the common web methods developers expect, along with uploads, downloads, callback-based usage, and await-style usage. For server owners, this opens up a huge range of possibilities:

- connecting to websites and account services
- integrating Discord or community tools
- talking to economy backends or dashboards
- uploading generated files
- downloading external data for live server features

This is the kind of feature that expands what a **Cyberpunk 2077 online** server can do without forcing everything into one monolithic backend. It gives creators more room to build custom experiences around their servers.

## Stability work for dedicated servers

Not every important change is flashy, but some of the most valuable ones are the hardest to show in a screenshot.

The server received fixes for two critical script and simulation edge cases found during audit work. The direct player benefit is better protection against server instability caused by runaway or badly behaving scripts. The goal here is simple: keep the simulation healthy and prevent a bad situation from snowballing into a broken session.

This kind of work is especially important as OPEN//77 keeps moving toward broader public play and more community-hosted worlds.

## Launcher highlights and platform updates

The launcher and platform also gained support for scheduled highlights. That means featured messages or campaigns can appear automatically at the right time, with actions that can send players to a server or a web page.

This is a smaller feature from the player point of view, but it helps the platform surface events, server promotions, and important updates in a cleaner way.

## Why this update matters

This was a strong “quality plus capability” day. Players get smoother presentation, cleaner crowds, and less frustrating joins. Server owners get a meaningful new scripting power that can support richer features across the wider **CP2077 multiplayer** ecosystem.

That combination matters. Great multiplayer is not just about adding new systems. It is also about making Night City feel believable when you look at another player, step into an elevator, walk past a bench, or load into a busy server without wondering if the game got stuck.

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
