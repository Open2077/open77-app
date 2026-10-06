---
title: "Traffic Upgrade Goes Stable, QBCore Lands"
date: "2026-10-06"
description: "OPEN//77 brings new traffic improvements to stable and adds a major QBCore foundation for Cyberpunk 2077 RP server building."
tags: ["cyberpunk-2077-multiplayer", "cyberpunk-2077-rp-server", "cyberpunk-2077-dedicated-server", "night-city-online", "cp2077-multiplayer"]
---
OPEN//77 had a big platform day: the latest traffic and camera improvements are now in the stable build, and a substantial QBCore port has landed for server creators. For players waiting on **Cyberpunk 2077 multiplayer** and for admins planning a **Cyberpunk 2077 RP server**, both changes matter.

## Traffic and camera improvements move to stable

The headline on the game side is simple: recent improvements to camera behavior, traffic, and automatic mod importing have been promoted to stable.

That does not just mean “merged.” It means these changes are now considered ready for the standard OPEN//77 experience instead of living only in a testing branch. Stable promotions are important because they mark the point where experimental work becomes part of the baseline that players and server owners can rely on.

For players, the exciting part is the world feel. Better traffic behavior helps Night City feel less static and more believable when multiplayer sessions start filling out. Camera improvements and smoother mod importing are also the kind of quality-of-life work that removes friction without asking players to think about it. When this kind of update works well, the game simply feels more polished.

## A major QBCore milestone for Open77 servers

The biggest creator-facing change today is the arrival of a QBCore port to the Open77 Lua API.

For anyone outside the server-building scene, QBCore is one of the most recognizable foundations for roleplay servers. Bringing that style of framework to OPEN//77 matters because it gives creators a familiar starting point for jobs, character systems, inventory, economy, vehicles, and other roleplay essentials.

For OPEN//77 as a **Cyberpunk 2077 multiplayer mod**, this is a practical milestone. It lowers the amount of custom groundwork needed to stand up a serious RP experience in Night City online.

## Character flow, spawning, and basic roleplay UI

The QBCore port now includes core player flow features such as character selection, character creation, and spawn selection.

That means a server can guide players through the first important steps of joining the world with more structure. Instead of dropping into a blank experience, creators can build a proper onboarding flow that feels closer to a complete roleplay server.

On top of that, OPEN//77 now has QBCore-style HUD, menu, and input support. These are the systems players interact with constantly, so getting them in place is a big deal even if they are less flashy than vehicles or combat. Good UI is what makes the basics of a multiplayer session feel readable and dependable.

## Economy, shops, garages, and keys

Several major gameplay systems also arrived in this port.

Banking support is now in place, including branches, ATMs, and shared accounts for server-side economy features. Shops have also been added, connected to the inventory flow so creators can start building reliable buy-and-sell loops.

Vehicles got a meaningful jump as well. Garages and depots are now supported, along with vehicle key systems. That gives server owners more of the expected structure around ownership, access, storage, and recovery. In an RP environment, these systems are not side features — they are part of what makes the world feel persistent.

## Inventory and weapons support bring the framework closer to playable

Inventory is one of the most important pieces of any **Cyberpunk 2077 online** roleplay experience, and the new QBCore port includes a server-authoritative inventory with support for stashes, trunks, dropped items, shops, hotbar behavior, and weapon integration.

That “server-authoritative” part matters. It means the server is treated as the source of truth for item state, which is a big step toward dependable multiplayer behavior in a **Cyberpunk 2077 dedicated server** environment.

Weapons support is also included through the same framework effort, giving creators another key piece of the puzzle for real gameplay loops.

## Why this update matters

Today’s progress is exciting because it helps on both sides of the project.

Players benefit from a stronger stable build with improved traffic and world feel. Server owners benefit from a much larger set of ready-to-use roleplay foundations. Together, those two tracks move OPEN//77 closer to the long-term goal: a convincing, persistent Night City online experience where joining, driving, shopping, storing gear, and building a character all feel like part of one connected world.

There is still more work ahead, of course. But this is the kind of update that turns abstract progress into visible momentum. Better stable features for everyone, and better tools for the people who will build the first great OPEN//77 servers.

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
