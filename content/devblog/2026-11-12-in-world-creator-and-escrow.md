---
title: "In-world character creator, body switching, and safer premium assets"
date: "2026-11-12"
description: "OPEN//77 adds an in-world character creator, runtime body switching, and safer protected content for Cyberpunk 2077 multiplayer servers."
tags: ["cyberpunk-2077-multiplayer", "cyberpunk-2077-multiplayer-mod", "cyberpunk-2077-rp-server", "cyberpunk-2077-dedicated-server", "cp2077-multiplayer"]
---
OPEN//77 had a very player-facing day. The team pushed a new in-world character creator, major runtime body switching improvements, clearer server error reporting, and another big step for protected server content in the Cyberpunk 2077 multiplayer mod stack.

## In-world character creation for Freeroam

One of the biggest immersion breaks in any **Cyberpunk 2077 multiplayer** experience is bouncing players back into a single-player style character flow. OPEN//77 is starting to solve that.

Freeroam now supports character creation directly in the world. New players spawn in, then the creator opens automatically once the join spawn is complete. Server owners can also reopen it later with a command. The result is a much more natural first-time experience for **Night City online**: join the server, land in the world, and start shaping the character there.

This was not just a menu swap. The creator now reads from the game’s full character creation catalogue instead of the much more limited set normally exposed outside mirrors. In plain language, that means many more real appearance options are available during multiplayer creation.

## A much better creator interface

The in-world creator also received a full interface pass. The new version includes a more polished frame design, icon-based tabs, clearer body type and action buttons, and a travelling preview camera that makes the whole flow feel closer to a finished game feature than a test menu.

Several quality fixes landed with it. Camera control is more stable during editing, shrinking option lists no longer spam warnings, and saving now consistently gets a response instead of occasionally hanging on “Saving”.

For players waiting on **Cyberpunk 2077 co-op** or RP experiences, this matters because identity is a huge part of multiplayer. A better creator means better first impressions, faster onboarding, and fewer immersion-breaking workarounds.

## Runtime body switching now behaves like a real multiplayer feature

Another standout change is runtime body-family switching. OPEN//77 can now swap a player between body families without forcing a save reload.

That sounds simple on paper, but it touches a lot of tricky systems. Equipment, weapons, appearance data, and player stats all need to survive the swap without breaking. The latest work improved all of those areas:

- runtime bodies now preserve equipment and weapons more reliably
- saved looks can survive reconnects
- body ownership and appearance state are reported more clearly
- stat copying and settling were fixed so players do not get bizarre side effects after switching

The most visible bug fixed here was movement speed doubling after a switch. That could also speed up animations, making the character feel obviously wrong. That issue has now been addressed.

There was also a visual fix for uncensored body presentation. Some looks could flicker into the censored painted-bra version because the wrong body variant was being chosen. The updated handling now respects the correct setting.

For a **Cyberpunk 2077 RP server**, this is important groundwork. It opens the door to cleaner identity systems, better customization flows, and fewer moments where the tech gets in the way of roleplay.

## Better startup errors for server owners

A smaller but very valuable change landed for dedicated server operators. When a resource fails during startup, OPEN//77 now reports which resource failed and where the error happened instead of throwing a vague activation failure.

That saves time immediately. For a **Cyberpunk 2077 dedicated server** owner, the difference between “something broke” and “this exact script failed here” is the difference between a frustrating setup session and a fix in a few minutes.

## Protected assets and client scripts move closer to production

Protected content also took a major step forward.

OPEN//77 continued building its escrow system for paid or otherwise protected resources. In practical terms, escrowed archives are now being mounted in-game successfully, protected client-side scripts can load in encrypted bytecode form, and server packages now include the pieces needed so operators do not have to assemble that setup by hand.

The launcher side improved too. It now avoids caching or restoring decrypted protected files and better cleans up any leftover copies. That is the kind of behind-the-scenes work that matters for creators and server owners who want to distribute premium resources without exposing the original files.

This does not change the player-facing fantasy directly, but it is important platform work for the long-term health of the **Cyberpunk 2077 multiplayer mod** ecosystem.

## Launcher improvements: installs, backups, notifications, and Discord presence

The launcher had a busy day as well.

Support improved for Battle.net and Xbox ownership and install discovery, including better handling for some sign-in and licensing edge cases. Native update notifications were added on Windows and Linux. Discord Rich Presence now reflects real OPEN//77 server sessions with updated branding.

Another notable addition is account-scoped cloud backups with automatic local recovery. That should make the launcher feel more resilient, especially on fresh installs or after local data problems.

## Light RP tuning

Light RP also received gameplay tuning inspired by GTA Online-style flow. Dogtown stake handling now includes banked money, missions are limited to once per day per difficulty, and hunger no longer kills the player outright.

That is a smaller note than the creator and body work, but it shows official gameplay resources continuing to move toward clearer rules and a less punishing baseline.

## Why this update matters

This update is a good snapshot of where OPEN//77 is heading. The project is not just adding raw features. It is turning rough prototypes into usable multiplayer systems: in-world character creation, runtime identity changes that hold together, better dedicated server diagnostics, and stronger support for protected content.

For players, the headline is simple: OPEN//77 is getting better at the stuff you actually feel when you join a server. For server owners, the platform is becoming easier to run and more practical to build on.

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
