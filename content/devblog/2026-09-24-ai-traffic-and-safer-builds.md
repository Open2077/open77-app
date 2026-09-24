---
title: "AI traffic rolls into Night City"
date: "2026-09-24"
description: "OPEN//77 adds synced AI traffic, faster nearby spawning, and stable/unstable release channels for this Cyberpunk 2077 multiplayer mod."
tags: ["cyberpunk-2077-multiplayer", "cp2077-multiplayer", "night-city-online", "dedicated-server", "rp-server"]
---
Today’s OPEN//77 work pushed two big things forward: Night City feels more alive thanks to synced AI traffic, and testing gets safer thanks to separated stable and unstable release channels. On top of that, a long list of networking, combat, and vehicle fixes makes the moment-to-moment experience more solid for players and easier to manage for server owners.

## Synced AI traffic starts filling the streets

The headline feature is synchronized AI traffic. OPEN//77 can now run traffic cars that actually join traffic behavior and stay shared between nearby players. That matters because a **Cyberpunk 2077 multiplayer** world needs more than player avatars to feel alive. Empty roads make the city feel like a test map. Shared moving traffic makes it feel closer to Night City.

This update adds the traffic resource and the networking support needed to push car movement cleanly enough for other players to see the same thing. The important player-facing result is simple: streets can now have believable moving vehicles instead of only static scenery and human players.

This is also a meaningful step for future **Cyberpunk 2077 online** and RP experiences. Traffic creates background life, affects navigation, and gives events on the street more texture.

## Faster nearby spawning and better streaming under bad latency

A lot of today’s work was about reducing the feeling that the game is "late" to show you what is right in front of you.

Nearby players now take a faster spawn lane, which means close-range arrivals should become visible sooner instead of sitting hidden for several seconds. That directly improves first impressions in crowded scenes, meetups, and busy server hubs.

The client also got a fallback for moments when observer timing becomes unreliable during lag spikes or packet loss. Before this change, bad timing data could cause remote players and vehicles to be held back from presentation. Now the game can recover more gracefully instead of acting like everyone around you vanished.

Together, those changes help **Cyberpunk 2077 co-op** and social play feel more immediate. Seeing the people and cars around you at the right time is one of the foundations of believable multiplayer.

## Combat and vehicle impacts are getting judged more fairly

Another large block of work focused on hit validation and vehicle contacts.

OPEN//77 now supports a more exact hit presentation path, where the server can evaluate a shot using timing information about what the attacker was actually shown, within strict server-side limits. In practical terms, this improves fairness without blindly trusting the client. For players, that means fewer weird outcomes where timing disagreement makes a hit feel wrong.

Vehicle impact handling also got stronger. The server can now identify the vehicle and driver behind a car strike more reliably, and several gaps around crashes, explosions, duplicate reports, and replayed reports were closed. That reduces nonsense outcomes like repeated contact effects from the same incident or invalid edge cases slipping through.

This matters for PvP, free roam chaos, and any future **Cyberpunk 2077 RP server** where vehicle violence and street incidents need clear ownership and cleaner rules.

## Better vehicle behavior and fewer immersion-breaking bugs

Vehicle replication got several practical fixes.

Parked owned cars no longer keep sending frequent updates unless they are actually moving. That should reduce waste in scenes full of idle vehicles and help the network spend more time on things players really notice.

A separate fix stops contact prediction from pushing the striker’s own car around in odd ways, which should make collisions look less strange from the driver’s side.

On the player presentation side, one especially visible bug was fixed: the hidden local body double could reappear standing up through a car roof while seated in heavy scenes. That kind of glitch is memorable for all the wrong reasons, so it is good to see it gone.

There were also fixes for overlapping remote player blockers, knocked-down movement recovery, AV tire-slip observer behavior, and some unnecessary replica-side effects. Most players will not name those systems, but they will feel the result as fewer odd animations, fewer physics hiccups, and cleaner vehicle observation.

## Safer release channels for players and server owners

Outside the game client itself, OPEN//77 now has clearer release separation.

The launcher adds safe stable and unstable client update channels. On the platform and website side, stable and unstable publication are now isolated, and unstable server downloads are presented as a deliberate opt-in instead of being mixed into the normal path.

That is good for everyone. Players who want the safest experience can stay on stable. Testers and server owners who want the newest work can opt into unstable knowingly. For an in-development **Cyberpunk 2077 dedicated server** ecosystem, that kind of release hygiene is a big deal.

## Why this day matters

This was not just a feature day or just a cleanup day. It was both.

Synced AI traffic makes Night City feel more alive. Faster nearby spawning and better timing fallback make the world feel more responsive. Fairer hit rewind and stronger vehicle impact validation make multiplayer outcomes more trustworthy. Stable versus unstable channels make the whole project easier to test without confusing the broader player base.

That combination is exactly what a serious **Cyberpunk 2077 multiplayer mod** needs: visible progress for players, plus the less glamorous fixes that make the visible progress hold up once more people log in.

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
