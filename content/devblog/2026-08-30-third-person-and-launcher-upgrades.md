---
title: "Third-person goes big, launcher gets unstuck"
date: "2026-08-30"
description: "OPEN//77's Cyberpunk 2077 multiplayer mod added major third-person progress, launcher fixes, and new server tools for Cyberpunk 2077 online."
tags: ["cyberpunk-2077-multiplayer", "cyberpunk-2077-multiplayer-mod", "cp2077-multiplayer", "cyberpunk-2077-dedicated-server", "night-city-online"]
---
OPEN//77 had a very player-visible day. The biggest headline is that the new third-person system for our **Cyberpunk 2077 multiplayer mod** has now been merged and verified in live multiplayer sessions, while the launcher also picked up several fixes for failed starts, stuck connecting states, and interrupted downloads.

## Third-person multiplayer is now merged and proven in live sessions

The largest change in this batch is the merge of the full proxy-based third-person feature set into the main game code. This system is not just a camera toggle. It coordinates the camera, the visible player body, the weapon presentation, effects, audio, and control rules so they change together instead of drifting out of sync.

Just as important, this was not treated as “done because it compiled.” The team ran live verification with two game clients, two accounts, and real in-session checks. That matters for **Cyberpunk 2077 co-op** and future social play because a third-person feature is only believable if both the local player and other players see the same thing at the same time.

The work also included a long list of in-game fixes that players would actually notice: camera inversion while aiming down, missing legs and clothing on the local body, weapon placement issues, melee not showing correctly, slide behavior falling back incorrectly, and a missing usable crosshair state in third person.

## Combat rules now match player expectations better

Another important gameplay change is that third-person hip fire is now blocked unless the player is actively aiming. This restores behavior that players expected and turns it into an explicit rule instead of an accidental side effect.

That is a bigger deal than it sounds. OPEN//77 uses authoritative multiplayer logic, so rules around aiming and firing need to be predictable and enforced consistently. The team also continued tightening shot validation and weapon-origin behavior so bullets follow the intended weapon state more closely instead of feeling disconnected from what the player sees on screen.

For a **Cyberpunk 2077 online** experience, combat trust matters. If the screen says one thing and the server decides another, the whole feature feels wrong very quickly. These fixes are about reducing that gap.

## Performance and safety checks were re-verified on the shipped build

A lot of today’s work was about proving the current state in the real build, not relying on memory or earlier test notes. Frame-time impact, VRAM usage, live thresholds, free orbit behavior, and gameplay safety checks were all re-read on the shipped build.

That may sound less exciting than a new feature, but it is exactly the kind of work that makes a multiplayer feature survive contact with real players. Third person in a single-player game can be rough around the edges. Third person in a **CP2077 multiplayer** environment has to stay stable under session load, account sync, and remote visibility.

The arbiter and fallback logic were also exercised more thoroughly, including a full fault-injection pass. In plain language: the team deliberately pushed bad or conflicting situations and checked whether the game recovered cleanly instead of leaving players in a broken perspective state.

## New game modes and better server tools

For server owners and future event hosts, OPEN//77 also expanded its authoritative multiplayer game mode support with Race and Deathmatch resources.

That does not just mean “some scripts were added.” The value here is that these modes are tied into server-authoritative systems, presentation, and admin-facing tools. This is the kind of groundwork that makes future **Cyberpunk 2077 RP server** events, competitive sessions, or organized custom worlds more practical to run.

Admins also gained a simple but useful power: giving a player a loaded, ready-to-fire weapon directly from the admin menu. That should make organized testing, moderation, demos, and event setup much smoother.

Another helpful server-side improvement is optional persistence for command-created props. Server owners can choose to keep those props across restarts instead of rebuilding them every boot. For anyone experimenting with a **Cyberpunk 2077 dedicated server**, that is a nice quality-of-life upgrade.

## Launcher fixes that remove real pain points

The launcher had one of its most practical update days yet.

First, interrupted downloads can now resume instead of restarting huge files from zero. That is especially important for players on unstable connections, and it removes one of the most frustrating failure cases during install or update.

Second, when the redscript preflight detects that a player-installed mod is the thing blocking startup, the launcher can now offer a one-click way to set that mod aside and retry. That is much better than throwing an error and expecting players to manually dig through files.

Third, the connecting screen should no longer hang forever with no explanation. The launcher now makes sure that this state ends and reports a real outcome instead of leaving the player stuck in limbo.

Finally, stale or ghost Cyberpunk processes are handled more safely. If a leftover process was blocking a fresh start, the launcher is now less likely to trap the player in a failed launch loop.

## Website and access management improvements

On the web side, the team added an admin page for managing closed alpha access. That makes it easier to grant or revoke account access cleanly without treating alpha entry like a staff permission.

This is a smaller change than the gameplay and launcher work, but it helps the project operate more smoothly as testing access expands.

## What this means for OPEN//77 players

The short version: today was about turning big features into believable ones.

The third-person system for OPEN//77’s **Cyberpunk 2077 multiplayer** is no longer just a promising branch with cool clips. It has been merged, tested in live sessions, and hardened against the exact rough edges players found while using it. At the same time, the launcher got more resilient, and server owners gained tools that make custom multiplayer sessions easier to run.

That is the kind of progress that gets Night City closer to feeling properly shared. 🔥

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
