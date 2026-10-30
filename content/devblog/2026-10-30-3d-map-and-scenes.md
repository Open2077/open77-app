---
title: "3D City Map and RP Scenes Land"
date: "2026-10-30"
description: "OPEN//77 adds a 3D city map, numpad keybind support, and synced RP scenes, improving Cyberpunk 2077 multiplayer and dedicated servers."
tags: ["cyberpunk-2077-multiplayer", "cp2077-multiplayer", "cyberpunk-2077-dedicated-server", "cyberpunk-2077-rp-server"]
---
OPEN//77 made two big player-facing steps today: a proper 3D city map is now integrated into Freeroam and server packages, and early synced RP scenes are now bundled into the game build. On top of that, keypad keybind support was cleaned up, which is a small fix that removes a real annoyance for players and server owners.

For anyone following the path toward **Cyberpunk 2077 multiplayer**, this is the kind of update that matters: clearer navigation, smoother controls, and more believable shared interactions.

## A 3D city map that feels native to Night City online

The new 3D map is now part of the Freeroam experience with an OPEN//77-styled blue theme, matching the wider visual identity instead of looking like a separate tool. The map includes a custom title, legend, and mirrored blips, so information shown on the map lines up better with what players already see in the world.

More importantly, the map now works through the pause menu map flow as intended. That means the CITY MAP entry can correctly receive data from a map provider resource, which is the practical difference between “the feature exists” and “players can actually use it naturally.”

This matters for a future **Cyberpunk 2077 online** experience because navigation is a huge part of Night City. A city this dense needs more than a flat menu screen if players are going to organize meetups, routes, activities, or RP scenes without friction.

## Better server packaging for the 3D map

The 3D map is not just a local experiment anymore. It is now included in Freeroam server content and expected in server packaging, which is great news for future operators.

In plain language: server owners should have less manual setup to do, and players are less likely to run into missing-content problems. The packaging changes also make sure the map's published data actually ships with the server resources that need it.

That kind of boring-sounding release work is what turns a cool prototype into something that can support a real **Cyberpunk 2077 dedicated server** ecosystem.

## Numpad keybind support is finally cleaned up

A smaller but very practical win today: numeric keypad keys are now recognized properly for key mapping.

Before this, players could hit a frustrating edge case where the game understood keypad input in some places, but custom bindings using those names could still be rejected. That mismatch has now been fixed, so keypad-based layouts should behave like normal keybinds.

This is especially useful for players who like unusual control setups, and for advanced users building personal control schemes for driving, menus, camera tools, or RP shortcuts.

## Synced RP chair scenes are now in the build

The other major feature today is early support for packaged RP scenes. A ripperdoc-style chair interaction was added with a full flow: approach, sit down, hold the seated pose, and stand back up.

That may sound simple, but shared scenes are one of the hardest things to make feel convincing in a multiplayer game. The scene has to start in the right place, line up the character correctly, stay stable while it plays, and still look right to nearby players.

OPEN//77 also added checks around replication and late joins, plus extra handling for temporary visibility problems during remote presentation. The result is not “infinite RP animation freedom” yet, but it is a meaningful step toward dependable shared interactions for a future **Cyberpunk 2077 RP server**.

## Why this update is exciting

Today's changes are not about flashy combat systems or giant feature reveals. They are about making the world easier to use and easier to believe.

A good 3D map helps players move through Night City with less friction. Stable keypad binds remove an unnecessary control problem. Synced scenes make social spaces and roleplay interactions feel more human.

That is exactly the kind of foundation a serious **Cyberpunk 2077 multiplayer mod** needs. If OPEN//77 is going to support co-op, freeroam, and RP at scale, the experience has to be convenient as well as impressive.

## What server owners should care about

For server owners, the biggest win is packaging. The 3D map resource is now part of the server release flow, and the new scene assets are also being treated as required build content.

That means less guesswork, less manual copying, and fewer chances to ship a broken setup to players. As OPEN//77 grows, this kind of standardization will matter more and more.

## The short version

Today was about turning cool systems into usable systems. The 3D city map is now integrated and shippable, numpad keybinds behave properly, and synced RP chair scenes are now bundled with stronger multiplayer handling.

For players waiting on **Cyberpunk 2077 co-op** and broader Night City online features, it is another solid step toward a smoother, more immersive OPEN//77 build.

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
