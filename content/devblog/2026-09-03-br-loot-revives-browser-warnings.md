---
title: "Battle Royale gets real-world loot, revives, and browser warnings"
date: "2026-09-03"
description: "OPEN//77\u2019s Cyberpunk 2077 multiplayer mod added working BR loot, revives, shields, a new map, and unsecured server warnings."
tags: ["cyberpunk 2077 multiplayer", "cyberpunk 2077 multiplayer mod", "cyberpunk 2077 dedicated server", "cp2077 multiplayer", "night city online"]
---
OPEN//77 made several player-visible steps forward today. The biggest wins for this Cyberpunk 2077 multiplayer mod were working Battle Royale loot, confirmed revives between real players, a clearer world boundary, and better safety warnings for community servers.

## Battle Royale props and loot now behave like real game objects

One of the biggest problems in recent Battle Royale testing was simple but brutal: some server-created objects existed logically, but did not show up correctly for players. That made crates and other mode-owned props feel broken even when the server thought everything was fine.

That gap is now fixed. Server-spawned props are reaching players properly, which is important for every object the mode owns directly: loot crates, boundary elements, and future authored map objects.

The loot chain also moved from “almost there” to much closer to complete. Prompted interactions were using the wrong key label before, so players were being told to press the wrong button. That was corrected, seeded crates are now published properly, and the team also proved the activation flow in automated runs instead of depending on a human pressing a key at the right moment.

For a Cyberpunk 2077 online experience, this matters a lot. Loot is one of the core loops of any battle royale or survival-style mode. If players cannot trust what they see on the ground, the whole match feels fake. Today's changes make the world more believable and much more testable.

## Combat, kill credit, and revives improved in live matches

Combat also got a real cleanup pass. Bot and NPC hit reporting was fixed, which means shooting bots now actually damages them reliably. Kill credit was improved too, so the match feed can correctly name the killer instead of producing confusing fallback entries.

The result is a new live kill feed that better reflects what actually happened in the match. That is a small feature on paper, but in a competitive mode it matters for clarity, spectator understanding, and confidence that the game state is correct.

Squad play made equally important progress. Downed players are now treated as out of the fight instead of staying in a weird half-alive state, and revive flow was pushed much further. The team confirmed a real player reviving another real player in a live match, then followed that up with a complete two-player extraction sequence.

That is a meaningful milestone for Cyberpunk 2077 co-op and squad-based testing. It proves the mode is not just spawning players into the same map, but supporting a real team loop: fight, go down, recover, and finish the round together.

## Shields, safer lobbies, and better match flow

Battle Royale also gained equippable shields. In gameplay terms, that adds another layer to fights and gives the mode a more recognizable BR rhythm: chip damage, armor break, then lethal follow-up.

The team also fixed some lobby and safe-area behavior. A previous attempt at movement restrictions caused serious client-side problems and was withdrawn, while the surviving safe-area suppression path was properly claimed and verified. That makes the Afterlife lobby more playable without carrying over unwanted vanilla restrictions.

Another practical change: matches no longer need a full lobby to begin. The start threshold was lowered so a server can launch with five queued players instead of waiting for a much larger count. On an early multiplayer project, this is the difference between "nobody can test because the match never starts" and "people can actually get rounds going." Solo is also now the default format, which better fits the current reality of small playtests.

## New map progress for Night City online

Map work moved quickly today. Watson remained the main test bed, but Little China, also called Chinatown in player conversation, was brought online as a usable Battle Royale map with hand-authored landing zones.

That is important because random scatter is only good enough for rough prototypes. The new map tools support hand-placed spawns, loot, and vehicles, which is exactly the sort of control a future Cyberpunk 2077 RP server owner or competitive event host will want from a Cyberpunk 2077 dedicated server setup.

The zone boundary also got a major visual rethink. Instead of relying on a screen-space line that could float awkwardly across buildings or break immersion, the cordon is now represented by physical barricades in the world. That makes the edge easier to read in a dense vertical city and gives the shrinking zone a much more believable presence.

## Better server browser safety for modded worlds

Outside the match itself, OPEN//77 improved how mod requirements are shown across the platform.

The server browser and launcher now understand when a world is marked as unsecured because it requires unverified executable mods. Those servers get an UNSECURED badge, and players are asked to confirm before joining. Required mod information is also carried correctly through the backend catalogue now, so the listing reflects what the world actually needs.

That is a strong quality-of-life improvement for both players and server owners. Players get clearer warnings before they connect, and server operators get more accurate listings for their worlds.

## Why today matters

The headline from today is not just “more features.” It is that several fragile Battle Royale systems crossed over into proven, visible gameplay: world props render, loot can be interacted with, bots can be damaged and credited correctly, revives work between real players, and matches can start more easily on small servers.

For OPEN//77 as a CP2077 multiplayer project, that is exactly the kind of progress that turns a tech demo into a game loop. The world is becoming more trustworthy, the browser is becoming safer, and Night City online is getting closer to feeling like a place where a full match can simply work.

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
