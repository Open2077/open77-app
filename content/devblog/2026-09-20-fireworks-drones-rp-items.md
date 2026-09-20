---
title: "Shared fireworks, drone shows, and smoother RP props"
date: "2026-09-20"
description: "OPEN//77 adds synchronized fireworks, drone show support, smoother RP item handling, and cleaner map UX for Cyberpunk 2077 multiplayer."
tags: ["cyberpunk 2077 multiplayer", "cyberpunk 2077 rp server", "cp2077 multiplayer", "night city online"]
---
OPEN//77’s latest update is all about spectacle and feel. Today’s work adds synchronized live-event tools for Cyberpunk 2077 multiplayer, improves roleplay item behavior while moving, and makes several visual systems look much smoother in actual play.

## Bigger live events for Cyberpunk 2077 online

The headline feature is a new set of server-driven celebration tools. Admins can now launch synchronized fireworks sequences instead of triggering single effects one by one. That matters because big public moments only feel good when everybody sees the same thing at the same time.

The new system supports repeated volleys for quick celebrations and also supports scripted shows built from timed cues. In practice, that means a server owner can stage a proper New Year countdown, a race finish, a concert finale, or a citywide event with much better timing and much less manual setup.

Just as importantly, the team cleaned up the first round of rough edges. Early fixes focused on making fireworks read more like fireworks, stopping lingering smoke and spark clutter, placing shows in the correct spot, and respecting client effect limits so finales do not overrun what the game can display. The result is more reliable spectacle, not just more spectacle.

## Drone shows join the admin event toolkit

OPEN//77 also added menu access for drone shows. The drone swarm logic itself is provided through example resources for server owners, but this update plugs those shows into the admin surfaces where event operators already expect to find them.

For players, the exciting part is what this unlocks for future events in Night City online: not only fireworks overhead, but coordinated light formations in the sky. For server owners looking at a Cyberpunk 2077 dedicated server setup, it is another sign that OPEN//77 is building toward memorable live moments instead of just basic multiplayer sync.

The example drone resource is also honest about cost. It is designed as a high-end showcase and comes with performance measurements, so server owners can judge whether that kind of event fits their hardware and player counts.

## Smoother RP item handling while walking, fighting, and switching views

Roleplay actions got a meaningful quality pass today. Held items used during walking animations are now managed more directly by the server runtime, which should make them behave more consistently in multiplayer.

Several visible problems were addressed at the same time:

- held items now sit better on presented bodies
- posture masks were restored correctly after combat and view changes
- item state survives presentation changes and resource restarts more safely
- first-person arm behavior was improved for supported item actions
- mouth-contact placement was adapted for supported RP actions

In plain language: props used for smoking, drinking, carrying, and similar RP scenes should look less brittle and recover more gracefully when normal gameplay interrupts the moment.

That is a big deal for any future Cyberpunk 2077 RP server. Small visual errors in props and posture can break immersion fast. Fixing those edge cases makes social scenes and walk-and-talk roleplay feel much more natural.

## World effects now glide instead of snapping

Another nice improvement landed on the client side: moved world visual effects now interpolate between updates instead of teleporting from one reported position to the next.

This is one of those changes players may not name directly, but they will feel it. If a resource updates the position of an effect several times per second, hard snapping looks artificial. Smoothing those updates makes moving effects feel more grounded and more cinematic, which helps everything from event spectacle to environmental tricks.

## Cleaner map behavior and better server discovery presentation

On the gameplay side, resource blips now stay visible more reliably, and the native map legend groups entries more cleanly. That should make custom server content easier to read from the map without important markers mysteriously disappearing.

On the website side, the server directory and profiles were polished further. Searchable profiles are being presented more cleanly, server profiles are retained in the directory flow, and a few visual issues around loading and selection were fixed. That is not a flashy feature drop, but it helps future players browse the growing OPEN//77 ecosystem with less friction.

## Why this update matters

This was a strong “make it feel real” day for the Cyberpunk 2077 multiplayer mod. The team did not just add features. The team added event tools that make public moments feel shared, visual smoothing that makes motion feel less fake, and RP item fixes that protect immersion during ordinary play.

For players waiting for Cyberpunk 2077 co-op or broader CP2077 multiplayer, the takeaway is simple: OPEN//77 keeps getting better at the things that make an online world feel alive. For server owners, the toolkit for running celebrations, social spaces, and standout events just got much more interesting.

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
