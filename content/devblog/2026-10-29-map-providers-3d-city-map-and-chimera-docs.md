---
title: "A 3D city map arrives, and the pause menu learns to open it"
date: "2026-10-29"
description: "OPEN//77 Unstable 164 to 167 bring a 3D city map with GPS to freeroam, custom maps in the pause menu, numpad key bindings, a bootstrap fix and full docs for the Chimera boss."
tags: ["cyberpunk-2077-multiplayer", "cp2077-multiplayer", "cyberpunk-2077-online", "cyberpunk-2077-dedicated-server"]
---
Today was a busy day on the Unstable channel: four builds, from 164 to 167, all pointing at the same idea. Night City now has a 3D city map that servers can make their own, and the pause menu knows how to open it. Along the way, numpad keys became bindable, a packaging mistake was caught and fixed the same day, and the Chimera boss got the documentation server owners were waiting for.

## A 3D map of Night City, with GPS

The headline is `op77_map3d`, a 3D map of the whole city built from the game's own map data: terrain, roads, metro, landmarks and the building volumes of every district, Dogtown included. It replaces the game's map and minimap while it runs.

You can orbit, tilt and zoom like in a modern maps app, search for places and blips, and double-click to set a waypoint. The GPS computes routes on the game's own traffic network and draws them as an animated ribbon on the map and the minimap, with turn-by-turn hints, rerouting and an arrival event. A small holographic route overlay can follow you while you drive.

For server owners, everything is an API: blips from client or server scripts, waypoints, route events, themes and colors, minimap layout, and even "jamming" that drowns the map in static for a blackout, a scrambler or an unmapped zone.

Freeroam already uses it. When a server runs the map next to freeroam, it switches to freeroam's cyan look and shows freeroam's destinations and spawn points as blips. Our Unstable test server in Germany runs that combination today. From the next server release, the map is included in the server package next to freeroam.

## The pause menu's CITY MAP can open your map

Until now, **CITY MAP** in the pause menu always opened the game's map. Unstable 164 introduced **map providers**: a resource registers itself, and the menu opens its map instead. The highest priority wins, and if a provider does not answer within 1.5 seconds, players still get the game's map, so nobody is left staring at nothing.

Unstable 166 completed the picture. The client runs two script hosts, one for its own system resources (the pause menu lives there) and one for the resources downloaded from the server. Map provider events now travel between the two, which is what lets a server resource like the 3D map become the CITY MAP.

## Numpad keys are now bindable

Unstable 167 accepts the numeric keypad in key mappings: `NUMPAD0` to `NUMPAD9`, plus the keypad's plus, minus, multiply, divide and decimal keys. They are separate keys from the main row, so a resource can use numpad `+` and `-` without stealing the regular ones. The 3D map uses them to zoom the minimap, and falls back to Page Up and Page Down on older clients.

## A quick bootstrap fix

Unstable 164 went out with an older copy of the pause menu inside the client package, so CITY MAP could fail with a "map unavailable" message. Unstable 165 shipped the right files the same day. The release process now checks every built-in resource of the client package against its source before anything is published, so this kind of mismatch is stopped before it reaches players.

## Chimera, documented

The Chimera boss encounter landed yesterday. Today it gets a full guide for server owners: how to install it, the export API for creating and controlling bosses, the four phases and the repair cycle, weak spots, difficulty scaling for bigger squads, forced targeting, the staff lab menu, and a complete example of building a raid around the fight.

## New documentation

- [3D city map, minimap and GPS (op77_map3d)](/docs/map3d)
- [Custom city maps (map providers)](/docs/map-providers)
- [Chimera boss encounter (PvE)](/docs/chimera)
- [Key mappings](/docs/keybindings), now with the numpad names

## Why this matters

A map is one of those things every player touches every session. Giving servers a map they can theme, fill with their own places and plug into the pause menu makes each Cyberpunk 2077 multiplayer server feel like its own version of Night City. Add a documented boss fight that scales with the group, and the toolbox for co-op and RP servers just got noticeably bigger.

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
