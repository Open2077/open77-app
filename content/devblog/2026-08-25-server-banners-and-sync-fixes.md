---
title: "Server banners, tougher integrity checks, and a smoother Night City"
date: "2026-08-25"
description: "OPEN//77 adds server banners, stronger integrity checks, and world-sync fixes for a smoother Cyberpunk 2077 multiplayer experience."
tags: ["cyberpunk-2077-multiplayer", "cp2077-multiplayer", "cyberpunk-2077-dedicated-server", "night-city-online"]
---
Today’s OPEN//77 update focused on presentation, session quality, and trust. Server owners can now publish wide server banners that show up in the public catalog and on the website, while players should see fewer immersion-breaking desyncs in Cyberpunk 2077 multiplayer sessions.

## Server banners now reach the website and server catalog

One of the most visible changes today is full support for wide server banners. Until now, servers mainly had a square icon to represent themselves. That worked, but it did not give Cyberpunk 2077 RP server communities or themed dedicated server hosts much room to show personality.

The new banner system adds a larger hero image slot for each server. The game server can publish that image, the platform backend accepts and stores it, and the website now displays it in the server detail hero area. If no banner is available, the site still falls back to the icon or demo art, so nothing breaks for existing servers.

For players, this means the server list and detail pages can feel more distinctive and easier to scan. For server owners, this is a much better branding tool. A serious roleplay shard, a combat-heavy public server, and a private community can now look different before a player even clicks join.

## Stronger integrity reporting before connect tickets

Another important step landed in the trust pipeline for Cyberpunk 2077 online play. The client now sends a signed self-integrity report to the platform before it requests a connect ticket.

In plain language, the platform gets a stronger signal that the connecting game client matches what the project expects. No anti-tamper system is magical, and the team is honest about limits, but this closes an important loop between earlier client-side checks and backend-side detection.

That matters because a healthy multiplayer environment needs more than gameplay code. It also needs systems that help identify suspicious clients, support enforcement, and make fair play more realistic over time. Players will not see a flashy menu for this, but it is foundational work for a safer CP2077 multiplayer experience.

## Better world sync: weather, props, and vehicles

Several fixes today target the kind of bugs that make a shared world feel unreliable.

### Weather now keeps trying until it sticks

Previously, if the first weather application failed at just the wrong moment during world startup, one client could stay on its own local weather for the rest of the session. The new behavior keeps retrying until the first successful apply happens.

For players, the result is simple: better odds that everyone in Night City online is actually seeing the same storm, fog, or sunshine.

### Destroyed props should stay destroyed

The team also fixed a stack of causes behind destroyed props unexpectedly reappearing during a session. This was one of those bugs where several small edge cases combined into one very visible problem.

Fixing it improves continuity during firefights, chases, and general sandbox chaos. When something gets smashed, it is much less likely to pop back into existence and ruin the illusion of a shared world.

### Restreamed vehicles should stop self-destructing

Another nasty edge case involved vehicles that streamed back in with bad early health reads. In some situations, that made perfectly normal parked vehicles come back as if they were already destroyed.

That load-in timing problem has now been addressed, so vehicle fleets should behave much more predictably when players move around the map and streamed entities come back into scope.

## Pause menu overlays survive display changes

The pause and session menu redesign is still in progress, but one user-visible problem got fixed today: web-based overlays no longer disappear after changing resolution or switching window mode.

This was the classic frustrating case where the menu was technically open but visually blank or invisible. The overlay system now stays visible across those display changes, which makes the interface much less brittle during real playtesting.

## Small but practical launcher-adjacent quality of life

There was also a practical tweak for local multi-instance testing: the extra-client launch path now uses a lower VRAM safety margin. On some capable systems, the old threshold was so conservative that it blocked launching a second game instance even when there was enough memory left to run it.

That does not change gameplay directly for most players, but it helps testing and local co-op iteration move faster, which usually translates into quicker fixes and better polish.

## Why this update matters

This was not a flashy feature-drop with a giant new gameplay system. It was the kind of day that makes a Cyberpunk 2077 multiplayer mod feel more real.

Server pages now have stronger identity. Session state is more stable. Weather and destruction are more consistent. Vehicles are less error-prone. The trust layer is getting stronger. And the new UI work is becoming less fragile.

For anyone waiting on Cyberpunk 2077 co-op, Cyberpunk 2077 dedicated server support, or a future Night City online experience that feels stable enough to live in for hours, this is exactly the kind of progress that matters.

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
