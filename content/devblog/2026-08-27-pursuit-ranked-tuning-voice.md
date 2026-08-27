---
title: "Pursuit gets ranked, tuning, and voice chat"
date: "2026-08-27"
description: "OPEN//77 added ranked Pursuit, server tuning, better joins, and native voice chat integration for Cyberpunk 2077 multiplayer."
tags: ["cyberpunk-2077-multiplayer", "cp2077-multiplayer", "cyberpunk-2077-online", "cyberpunk-2077-dedicated-server", "night-city-online"]
---
OPEN//77 had a big quality-of-life and feature day, with major upgrades for Pursuit, better server controls, and native voice chat integration in the latest client release. For anyone following Cyberpunk 2077 multiplayer or waiting for a stronger Cyberpunk 2077 online experience, this update moves several important pieces closer to a playable live environment.

## Pursuit now has real progression

Pursuit took a major step from prototype toward full game mode. The biggest change is a persistent ranked ladder using Elo-style rating. That means match results are no longer just a local memory of who won the last round. Players can now gain or lose rating over time, and that progression survives across sessions.

That persistence matters because ranked play only feels meaningful if the ladder lasts longer than a single restart. The team also fixed an issue that could stop that rating from being saved properly, so the live server can actually hold onto match history the way players expect.

For a Cyberpunk 2077 multiplayer mod, this is an important milestone. A social sandbox is fun, but a mode with progression gives players a reason to return, improve, and compete.

## Pursuit matches are less predictable and more fair

The mode rules also changed in ways that should make matches feel better instead of merely longer. Pursuit now uses a bust meter, supports an instant escape at 100 meters, and plays as a two-round match.

The whole map is now available as the arena. The old out-of-bounds restriction is disabled, so Night City itself becomes the chase space. That should make sessions feel more organic and much less boxed in.

The scanner was toned down too. In playtests, it was behaving too much like a live tracking tool instead of a memory aid. Sweeps are now slower, and nameplates no longer leak the runner’s exact live location. That should preserve tension and make evasive driving matter more.

Vehicle flow was improved as well. Instead of every match using the same hardcoded pair of cars, players can now choose from a curated roster. Pursuit reads that choice, and the lobby flow supports it too. A roster speed cap was also added, which helps keep vehicle selection under control for mode balance.

## Better joins and fewer broken pre-game states

A lot of work this day focused on something less flashy but extremely important: not doing things to a player before that player is truly ready.

OPEN//77 now has a stronger join-time readiness gate. In plain terms, the platform and game resources can hold back gameplay actions until character creation, loading, and incarnation are actually complete. Before this work, a mode like Pursuit could place or move a player while appearance setup was still in progress.

That led to the kind of bugs players immediately notice: being teleported too early, being pulled out of character creation, or getting stranded behind loading screens with no clean way back.

Several pre-game failure cases were closed in this pass, and join placement now retries on a timer instead of relying on a one-shot event that may never come back around. For players, the result should be simple: fewer weird joins, fewer stuck states, and a smoother first minute after connecting.

## New tools for Cyberpunk 2077 dedicated server owners

Server operators got a meaningful set of upgrades too. Warden, the operator panel, now exposes tuning controls and branding controls directly in the UI.

The tuning system is especially useful for a Cyberpunk 2077 dedicated server setup. Pursuit now declares a large set of operator-adjustable values, which means many gameplay settings can be changed at runtime without editing scripts or reloading resources. Chase settings, lobby timings, rematch flow, and similar values can now be adjusted from the panel.

That is the kind of feature future server owners care about because balancing a live mode is rarely finished on day one. Faster iteration means better public playtests.

Admins also got a more practical workflow: in-game admin rights can now be granted or revoked from the player list. That replaces a much more awkward manual process and makes live moderation easier.

## Server branding is finally looking like a real platform

Pursuit also received proper catalogue artwork, and the wider branding pipeline improved. Server icons and banners now behave as a single budgeted pair, can be updated without a restart, and display correctly on the website.

On the web side, the server list now resolves those image URLs properly, so players should see actual server branding instead of broken paths or placeholder visuals.

This may sound cosmetic, but presentation matters for discovery. A Cyberpunk 2077 RP server, event server, or competitive server is much easier to recognize when it has distinct artwork in the directory.

## Native voice chat lands in the client

One of the biggest headline additions in the latest client build is native voice chat integration. Voice is a huge piece of any believable Night City online experience, especially for co-op sessions, roleplay, and social hangouts.

This commit set does not expose all the user-facing details yet, but the integration is now part of the released client work. That makes it one of the clearest signs that OPEN//77 is building beyond basic replication and into the features players expect from a modern Cyberpunk 2077 co-op and online platform.

## Why this update matters

This was not just a “more code” day. It was a “more playable” day.

Pursuit now has progression, more flexible rules, better balance tools, and cleaner joins. Server owners have better control over live gameplay and branding. Players get a stronger path into matches and a client that is gaining major social features.

That combination is exactly what helps a Cyberpunk 2077 multiplayer mod grow from experiments into a real ecosystem: stable entry, replayable modes, recognizable servers, and richer communication inside Night City.

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
