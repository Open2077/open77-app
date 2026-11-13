---
title: "Smoother animations, leaner WebUI, better launcher"
date: "2026-11-13"
description: "OPEN//77 improved Cyberpunk 2077 multiplayer with faster animations, better vehicle sync, lower WebUI overhead, and a more polished launcher."
tags: ["cyberpunk-2077-multiplayer", "cp2077-multiplayer", "cyberpunk-2077-online", "launcher", "performance"]
---
OPEN//77 made a strong quality-of-life pass today across the game client and launcher. The headline changes for **Cyberpunk 2077 multiplayer** are faster, smoother animations, several fixes for player movement getting stuck, better remote vehicle behavior, a large WebUI performance win, and a more polished native launcher.

## Faster animation starts for Cyberpunk 2077 multiplayer

Animation playback now feels much more immediate. Before this update, some RP actions and placed animation scenes could wait on a network round trip or visibly snap into position before the animation began. That created a clunky, obviously multiplayer feeling.

The new behavior starts animations right away, blends from the current pose, and avoids the old teleport-like pop when entering a scene. There is also support for an `instant` mode when a server or resource truly wants a hard cut instead of a blend.

For players, the result is simple: emotes, RP scenes, and other body-driven actions should look more natural and react faster. For a **Cyberpunk 2077 RP server**, that matters a lot because timing and presentation are part of the experience.

## Third-person body is ready before first use

The first request for third-person presentation in a session used to have a noticeable delay. That meant the first perspective switch or first animation needing that body could leave a brief dead moment before anything appeared.

OPEN//77 now prepares that third-person body ahead of time and keeps it ready in the background. This removes much of the awkward first-use wait and helps interactions feel more consistent during play.

This is a small technical change with a very visible payoff for **Cyberpunk 2077 co-op** and RP-focused play, where body presentation is constantly on screen.

## More movement freeze bugs eliminated

Several player-stuck cases were fixed in this batch. The team resolved movement restrictions lingering after body switching, character creator flows, noclip use, and certain edge-case stat checks.

That means fewer sessions where a player joins, exits a setup flow, tests a tool, and suddenly cannot move. Fixes like this are important because they remove the kind of bug that breaks trust in a multiplayer build, even when the rest of the session is working.

Another round of session cleanup also removed stray single-player style interruptions during multiplayer play, including random holocall ringing and the "Entering a new area" banner. Repeated keycard notifications caused by body switching were also stopped.

## Better remote vehicle audio and behavior

Vehicle replication got a meaningful polish pass. Other players should now hear the proper engine sound for a remote car instead of a less accurate fallback. That helps traffic, convoys, and street scenes sound more believable.

Brake-light behavior was also improved, and the game will no longer automatically switch seats in situations where that behavior was getting in the way.

For a **Cyberpunk 2077 online** experience, this kind of sensory polish matters more than it might seem on paper. Sound, motion, and small vehicle details are part of what makes Night City feel alive when multiple players share the same space.

## Big WebUI performance gains, especially on Wine and Proton

One of the most important changes today is a major optimization pass for WebUI surfaces. These browser-powered screens are used for many modern interfaces, and under Wine/Proton they could consume too much memory and CPU.

The new work focuses on smarter transport, better sharing of rendering resources, and more aggressive cleanup when a page becomes empty. In practical terms, menus and other WebUI-driven surfaces should leave a much smaller footprint, especially after opening large interfaces and closing them again.

This kind of optimization is not flashy, but it is a major win for stability and performance in a **Cyberpunk 2077 multiplayer mod**. Lower overhead means more headroom for the actual game, fewer bad edge cases, and a better baseline for long sessions.

## Native launcher 0.2.9 feels more polished

The native launcher also moved forward with preview version 0.2.9. Download handling, recovery actions, and storage management were unified, making the install and update flow easier to understand.

On Windows, the launcher can now check for the required Visual C++ 2013 runtime and offer repair help if it is missing or broken. Importantly, the warning is no longer a hard wall; players can still attempt a server connection if they want to try anyway.

Server mod prompts were simplified, with optional extra details instead of overwhelming players up front. The connection flow also received a visual overhaul with immersive artwork, smooth motion, crossfades, and animated backgrounds.

For future **Cyberpunk 2077 dedicated server** communities, this matters too. A cleaner launcher and clearer connection flow reduce player confusion before they even enter Night City.

## Why this update matters

Today was less about adding a giant new headline feature and more about making OPEN//77 feel better moment to moment. Animations start faster, perspective changes are less awkward, movement bugs are disappearing, vehicle scenes sound better, and the UI stack is getting much lighter.

That is exactly the kind of work that turns a promising prototype into a believable **Night City online** experience. The flashy features bring people in, but smooth sessions keep them playing.

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
