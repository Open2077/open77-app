---
title: "Clothes fit better, launcher feels faster, Light RP gets a huge drop"
date: "2026-11-06"
description: "OPEN//77 improved character visuals in Cyberpunk 2077 multiplayer, sped up the launcher, and shipped a huge Light RP update."
tags: ["cyberpunk-2077-multiplayer", "cp2077-multiplayer", "cyberpunk-2077-rp-server", "launcher", "night-city-online"]
---
OPEN//77 had a wide-ranging update today: better character visuals in **Cyberpunk 2077 multiplayer**, a smoother launcher and website experience, and a very large Light RP feature drop with minigames, parkour, admin tools, and onboarding improvements.

For players waiting on a polished **Cyberpunk 2077 multiplayer mod**, this is the kind of day that matters. A lot of the work was not flashy tech for its own sake; it was the kind of cleanup that makes characters look right, makes the game world feel alive, and makes joining servers less frustrating.

## Better character clothing and body-shape sync

The biggest core-game improvement today is on female body morphs and clothing fit.

OPEN//77 now handles body-shape-driven garment fitting much more reliably for other players, not just for your own local character. That matters because multiplayer makes visual mismatches much more obvious: if one player’s body shape is customized, but their outfit on remote clients still behaves like a default body, clothing can look wrong immediately.

Several follow-up fixes landed as part of the same push. Female body layers now consistently use the correct geometry for the chosen size, and morphed layers are recomputed when needed so the game does not keep using stale shape data. The end result is simple to describe even if the problem was not: tops should fit more like they are supposed to, and cases where chest details, tattoos, or other body elements poked through clothing should be much rarer.

There was also an important stability fix for outfit changes. In a specific edge case, if clothing reattached at the wrong moment during a strip-and-refit sequence, the character could get stuck hidden in a preparing state. That should now recover correctly instead of soft-locking the presentation.

## Noclip no longer freezes the city around you

Another important core fix improves admin movement and world streaming.

While hovering in noclip, the old behavior repeatedly used teleport-style movement, and that interfered with nearby entity spawning. In practice, that meant players and NPCs around a hovering admin might simply fail to appear, making the city feel empty or frozen.

That behavior has now been corrected. Noclip hovering no longer blocks nearby spawns, so admins can observe the world without accidentally suppressing it. For a future **Cyberpunk 2077 dedicated server** ecosystem, small fixes like this matter a lot because staff tools need to stay invisible to normal gameplay.

## Launcher and website feel more modern and responsive

The launcher also got meaningful usability work.

The server directory has been cleaned up with compact rows and simpler descriptions, and players can browse while the game is already running. That sounds small, but it removes one of the classic annoyances of multiplayer launchers: being forced to stop what you are doing just to compare servers or reconnect.

Installation and connection flow were improved too. Heavy background steps no longer make the launcher window feel frozen, and connection progress has been simplified so the path into the game is easier to understand. A release browser with compatibility awareness was also added, helping players make sense of which builds can talk to which servers.

Steam ownership linking was updated for compatibility with the Cyberpunk 2077 2.5 SDK as well.

On the website side, open2077.net now matches the launcher’s newer server-list styling with larger, easier-to-read rows. That keeps the discovery experience more consistent between web and desktop.

## Light RP gets minigames, parkour, and better first-time flow

Light RP had the biggest content update of the day by far.

The headline is a new minigame layer: hosted rooms, six games, rooftop parkour, and an in-game map workflow for staff. This is exactly the kind of system that helps a **Cyberpunk 2077 RP server** feel like a living social world instead of just a place to stand around between scenes.

Parkour received a full package of upgrades beyond the initial release. Courses support starts, checkpoints, finishes, timers, splits, best times, and leaderboards. The run experience got cleaner countdown behavior, better result cards, and multiple rounds of visual fixes so markers actually appear reliably and do not flicker or silently fail in busy sessions.

The onboarding flow improved too. The tutorial now gives players a more reliable route to objectives with stronger guidance, and the ending now leads into a camera tour of The Crossing. Arrival points were also spread out so fresh spawns do not pile directly on top of each other.

Character presentation in roleplay improved as well. Nameplates now show RP character names instead of account names, with optional session IDs for easier staff reference.

## Better admin visibility controls and cleaner UI

Admins received a new ghost mode in Light RP.

Ghost mode combines noclip with hidden presentation: no visible body to other players, no nameplate, and no map presence. For moderation and event support, that is a major quality upgrade. Staff can observe without disrupting scenes or advertising their location.

The chat UI also got a redesign with a fixed-height log pinned to the newest messages, new arrival animations, and auto-hide behavior when idle. Staff announcements were restyled into a more thematic citywide broadcast presentation that fits OPEN//77’s cyberpunk tone much better.

The map experience moved forward too. The 3D city map now defaults to a performance-oriented 2D display mode on first open, aiming for better usability across a wider range of PCs while keeping routing and zone information available. At the same time, player dots were removed from the map and minimap in Light RP, preserving more privacy and roleplay friction.

## Why this day matters

This was a strong “make the whole experience feel better” update.

For **Cyberpunk 2077 online** play, visual correctness matters because players spend so much time looking at each other. For social servers, onboarding and UI matter because first impressions decide whether players stay. And for long-term server hosting, launcher clarity and admin tools matter because every bit of friction gets multiplied.

Today did not deliver one single cinematic headline feature for the base game. Instead, it delivered something almost as valuable: a more believable character presentation, a less annoying path into the game, and a much richer Light RP sandbox for the first wave of Night City stories.

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
