---
title: "Gorilla Arms hit Night City co-op"
date: "2026-09-13"
description: "OPEN//77 adds Gorilla Arms, smoother vehicles, synced doors, and lipsync upgrades for the Cyberpunk 2077 multiplayer mod."
tags: ["cyberpunk 2077 multiplayer", "cyberpunk 2077 multiplayer mod", "cyberpunk 2077 co-op", "cp2077 multiplayer"]
---
OPEN//77 had a very gameplay-heavy day. The biggest addition is multiplayer Gorilla Arms, backed up by several movement and vehicle fixes that make shared scenes in Night City feel more believable. Voice also picked up a useful upgrade with Lua-controlled lip sync and better recovery when playback stalls.

## Multiplayer Gorilla Arms enter OPEN//77

The headline feature is full Gorilla Arms groundwork for the Cyberpunk 2077 multiplayer mod. This is more than a cosmetic toggle. The system now covers implant installation, cyberware grades, proper arm presentation on the player, validated melee behavior, bounded knockback, effects, audio, and persistence.

In plain language: players are getting closer to cyberware that behaves like a real multiplayer gameplay system instead of a local-only fantasy. Hits need to be accepted correctly, reactions need to stay fair, and the result needs to survive beyond a single moment. That combination matters a lot for any future Cyberpunk 2077 co-op or RP experience where body upgrades are part of progression and identity.

The team also exposed reusable Lua hooks around this work, with permission controls for server-side use. For future server owners, that is the interesting part under the hood. It means custom rules, progression, and gameplay logic around cyberware are becoming more realistic without every server needing one-off hacks.

## Smoother movement for Cyberpunk 2077 online moments

A lot of today's work focused on the small failures that break immersion in Cyberpunk 2077 online play.

Automatic doors now synchronize correctly, so players are less likely to see different world states when moving through the city together. Elevator occupants were also stabilized, which should reduce strange behavior during vertical travel.

Another important fix improves how remote players are handled when standing on moving vehicle surfaces. Those scenes are hard in any multiplayer game because the game has to keep movement readable while another object is moving underneath the player. This update adds compensation for those riders, helping shared vehicle moments feel less floaty and less broken.

These are the kinds of fixes that do not always look flashy in a changelog, but they matter a lot for a believable Night City online experience.

## Better seat transitions and more reliable driving

Vehicle ownership and seat changes got a targeted quality pass. Driver controls are now preserved during passenger seat transitions, which should cut down on cases where vehicles felt unresponsive or briefly confused when players changed seats.

For a Cyberpunk 2077 dedicated server environment, this kind of stability is essential. Co-op driving, passenger swapping, and shared combat vehicles only feel good when the active driver keeps control without odd interruptions.

It is another step away from "prototype multiplayer" and toward something that can support more natural group play.

## Voice gets lip sync control and playback recovery

Voice features also moved forward today. Servers can now control player lip sync through Lua, and stalled playback can recover instead of remaining stuck.

For players, the immediate benefit is presentation. Conversations, roleplay, and social scenes can look more alive when character mouths can be driven intentionally. For server owners building a Cyberpunk 2077 RP server, this opens the door to more polished scripted scenes and interactions.

The playback recovery side is just as important. Voice systems only feel good when they fail gracefully, and recovering from a stall is much better than leaving someone silently broken until a reconnect.

## Guides and release channel cleanup

The website side was updated to match the new features. New guides were published for Gorilla Arms, synchronized attachments, player interactions, and lip sync, along with API reference cards for the voice-related client features.

Downloads were also cleaned up by release channel, with live versions refreshed. That should make it easier for players to understand what build track they are on and for testing groups to grab the correct version.

## Why this update matters

Today’s progress combined flashy and practical work in a good way. Gorilla Arms give OPEN//77 a new piece of recognizable Cyberpunk identity, while the synchronization and vehicle fixes improve the minute-to-minute feel of multiplayer sessions.

That mix is important for the long road to CP2077 multiplayer. Big features bring excitement, but stable doors, elevators, vehicles, and voice are what make a Cyberpunk 2077 multiplayer experience actually playable with friends.

OPEN//77 is still in development, but this update pushes both fantasy and function forward at the same time.

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
