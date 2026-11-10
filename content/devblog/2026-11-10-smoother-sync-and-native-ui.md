---
title: "Smoother players, sturdier UI, smarter server tools"
date: "2026-11-10"
description: "OPEN//77 improved Cyberpunk 2077 multiplayer with smoother player sync, more stable NativeUI, better moderation tools, and launcher previews."
tags: ["cyberpunk-2077-multiplayer", "cp2077-multiplayer", "cyberpunk-2077-online", "cyberpunk-2077-dedicated-server"]
---
OPEN//77 made Cyberpunk 2077 multiplayer feel better moment to moment today. The biggest wins are smoother replicated player movement, more reliable in-game UI, a crash fix tied to driving AI behavior, and better moderation tools for server owners running a Cyberpunk 2077 dedicated server.

## Replicated players now look much more natural

A large part of today’s work focused on how other players appear on your screen. In any Cyberpunk 2077 online experience, small animation errors stand out fast: a body snaps a few degrees, a character micro-teleports during acceleration, or a jump interrupts a blend and creates a visible pop.

The new replication pass tackles exactly those problems.

Remote players now transition more cleanly when starting to move, stopping, turning, changing heading, or recovering from network fuzz. Position updates use a better motion curve, so movement follows a more believable path instead of producing tiny speed notches or abrupt corrections. When sync falls behind, the system now tries to catch up smoothly instead of relying on noticeable little jumps.

Animation blending also got a cleanup pass. Ground movement fades behave more consistently, jumps no longer break unfinished fades as harshly, and upper-body overlays cross-fade more smoothly. The result is simple to describe even if the work behind it was not: other players should feel less like network puppets and more like actual characters moving through Night City.

## Better turning, better feet, better male walk retargeting

Another visible improvement is turn behavior. Body heading changes now ease in more naturally, and exact turn modes no longer snap as sharply when picked up mid-movement. Turn-in-place behavior for male characters was also improved so the feet participate more convincingly instead of the body looking like it is twisting awkwardly.

The team also corrected a male walk retargeting issue. That fix matters because even subtle errors in the source pose can make locomotion look strangely off, especially in an RP-heavy scene where players spend a lot of time standing, walking, and facing one another. For a Cyberpunk 2077 RP server, this kind of polish adds up quickly.

## NativeUI keeps replacing fragile web layers

OPEN//77 continued moving important HUD elements away from separate web pages and into NativeUI, which is rendered directly by the game. That shift brings tighter integration and removes a class of focus-related weirdness.

Today, the voice HUD moved to NativeUI, and so did the ALT context menu. The context menu change is especially noticeable because it fixes an annoying issue where the menu could close itself after losing focus. Chat and HUD interactions were enough to trigger that before; now the menu behaves more like a proper in-game interface.

For players, the practical benefit is less jank. For server owners and resource creators, NativeUI becoming the standard means UI features are getting more dependable inside the actual game client.

## Linux and Steam Deck visual cleanup

There was also a rendering fix for NativeUI backdrop effects on Proton-based setups, including reported Linux and Steam Deck cases. Those backdrops could flicker because of how the underlying graphics path behaved on some systems.

That issue should now be much cleaner. It is another small but important step toward making CP2077 multiplayer feel stable across more than one platform setup.

## A driving-related crash got fixed

On the stability side, the team fixed a native AI crash that had been seen while driving. Crashes like that are some of the most frustrating bugs in a multiplayer session because they interrupt progress without much warning.

This fix should reduce one more source of hard client failures during normal gameplay, especially in vehicle-heavy sessions.

## Warden moderation tools got more practical

Server administration also improved today. Warden now keeps bans in one server-side source of truth, which makes temporary bans easier to list, review, expire, and lift correctly.

Moderators also get live roster updates, global player search, and dedicated player pages. For anyone planning a Cyberpunk 2077 dedicated server or larger RP community, those are the kinds of quality-of-life tools that make day-to-day management much easier.

## Website adds cross-platform launcher previews

On the website side, preview downloads are now available for the cross-platform Rust launcher. That is not the final onboarding story yet, but it is a meaningful step toward giving players a cleaner way to sign in and launch OPEN//77 across different operating systems.

## Why this day matters

This was not a flashy content-drop day. It was a foundation day, and those matter just as much for a Cyberpunk 2077 multiplayer mod.

Smoother remote movement makes social spaces, co-op driving, and firefights feel more believable. NativeUI migration removes fragile edge cases. Crash fixes protect sessions. Better moderation tools help future communities scale. Put together, these updates move OPEN//77 closer to a Night City online experience that feels solid, readable, and ready for real players.

---

## About OPEN//77

[OPEN//77](https://open2077.net) is a free, in-development **multiplayer mod for
Cyberpunk 2077**: play online with other players in Night City on
community-hosted **dedicated servers**, with synced combat, vehicles and world
state, an account-backed launcher, and Lua-scriptable servers for co-op,
freeroam and RP. Browse [servers](https://open2077.net/servers), read the
[docs](https://open2077.net/docs) to host your own, or join the
[Discord](https://discord.gg/open77) to follow development. This devblog is
published daily, straight from the work the team shipped that day.
