---
title: "Better cameras, louder footsteps, and huge mod packs"
date: "2026-11-15"
description: "OPEN//77 improves Cyberpunk 2077 multiplayer with better vehicle cameras, smoother third-person movement, crash fixes, and bigger mod support."
tags: ["cyberpunk 2077 multiplayer", "cp2077 multiplayer", "cyberpunk 2077 dedicated server", "cyberpunk 2077 multiplayer mod"]
---
OPEN//77 had a strong quality-of-life day, with upgrades for moment-to-moment play and a big expansion for server customization. The highlights are better passenger cameras, clearer third-person movement, important stability fixes, and support for much larger required mod setups for Cyberpunk 2077 multiplayer.

## Better passenger cameras in vehicles

Riding as a passenger is now much nicer. OPEN//77 now supports proper exterior passenger camera views, instead of leaving passengers stuck in first person when the game refused to cooperate.

Just as importantly, the game now remembers the last vehicle camera each player selected. If a player prefers a certain chase view, OPEN//77 will keep that preference instead of forcing repeated camera cycling every time a ride starts.

This is one of those features that sounds small until you use it. For a Cyberpunk 2077 co-op experience, cameras matter a lot. Good passenger views make convoys, taxi-style roleplay, and casual cruising through Night City online feel dramatically better.

## Smoother third-person movement and clearer audio

Third-person presentation also got a noticeable lift.

Jump animations were replaced with improved third-person clips, giving jumps a more natural look when watching other players or seeing your own character in third person. The result is cleaner movement, especially during fast traversal.

Footstep audio was also boosted so movement is easier to hear. In earlier builds, footsteps could feel too quiet in third person, both for your own character and for nearby players. Louder footsteps make character movement feel more grounded and readable, which helps a lot in social play, freeroam, and Cyberpunk 2077 RP server scenarios.

These are polish changes, but they matter because multiplayer lives or dies on readability. When movement looks and sounds right, the whole world feels more convincing.

## Stability fixes that remove annoying edge cases

Today also included two very practical fixes.

First, a WebUI-related freeze was fixed. Under the wrong conditions, the game could hang while idle and eventually get killed by the engine watchdog. That issue has been addressed, which should mean better stability around interface-heavy experiences.

Second, a phone issue was cleaned up: refusing a certain quest call could leave the ringtone looping even though the call had already been rejected. That kind of bug is minor compared to a crash, but it is exactly the kind of thing that chips away at immersion if left unresolved.

These fixes are not flashy, but they are important for making CP2077 multiplayer feel dependable during long play sessions.

## In-world screens keep getting better

The team also improved interaction with world screens, the in-game panels and displays that can show WebUI pages inside the world.

Clicks on world screens are now delivered correctly without duplicate input, and pointer tracking is more accurate. That means on-screen buttons, windows, and browser-like interfaces behave more like players expect. Pointer behavior was also improved for tricky embedded-site cases, where older behavior could drift, freeze, or click in the wrong place.

On top of that, OPEN//77 added a new showcase resource: a synchronized cyberpunk desktop displayed on a world screen. Nearby players can see the same shared interface, which helps demonstrate where this system is heading for social spaces, control rooms, shops, terminals, and custom roleplay experiences.

Trusted pages can also show a wider range of external sites inside in-game screens when explicitly allowed. For server builders, this opens up more creative possibilities for immersive interfaces on a Cyberpunk 2077 dedicated server without changing the core idea of a shared world screen.

## Much bigger required mod support for servers

For server owners, this is the biggest practical change of the day.

Required mod lists now support up to 256 mods instead of 64. That increase was rolled through the game server, the launcher, and the server directory so larger custom worlds can actually function end to end.

Required hosted mods can also now be much larger, up to 1 GiB each. This is a major step for ambitious servers using heavier content packs, larger world additions, or richer asset bundles.

The important part is not just the raw number. It means OPEN//77 is becoming more realistic for serious custom setups. A larger Cyberpunk 2077 multiplayer mod ecosystem needs room for full server packs, and this update moves the platform much closer to that goal.

## Launcher updates for larger servers and smoother setup

The launcher was updated several times today to keep pace with these changes.

Support for 256-mod direct-connect manifests is in, large hosted mods are supported, and installation checks were improved. The launcher also got better connection recovery behavior, plus several Linux and Proton fixes around installation detection, cache handling, and script preparation.

There were also fixes for annoying edge cases involving auxiliary files, links, and warning flow behavior. Players should see fewer false setup problems, and Linux users in particular should get a cleaner path to launching the game.

## Why this day matters

This was a very "real progress" kind of day for OPEN//77.

Players got better cameras, stronger third-person presentation, and fixes for frustrating bugs. Server owners got the ability to build much larger modded experiences. And the shared-screen tech keeps moving from prototype territory toward genuinely exciting social features for Cyberpunk 2077 online.

That combination matters. A good Cyberpunk 2077 multiplayer mod is not only about getting more players into Night City. It is about making the world feel better to move through, easier to host, and more believable once everyone is inside.

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
