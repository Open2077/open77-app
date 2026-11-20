---
title: "Movement got a huge upgrade"
date: "2026-11-20"
description: "OPEN//77 improved Cyberpunk 2077 multiplayer movement, traversal, and launcher reliability, with anti-cheat progress for safer online sessions."
tags: ["cyberpunk-2077-multiplayer", "cp2077-multiplayer", "cyberpunk-2077-online", "launcher", "anti-cheat"]
---
Today’s work was all about making OPEN//77 feel better in motion. The team landed a major movement upgrade for both male and female bodies, improved third-person camera and traversal behavior, and shipped launcher fixes that prevent painful server-switch dead ends. For anyone following Cyberpunk 2077 multiplayer progress, this is one of those updates that quietly lifts the whole experience.

## Better third-person movement across the board

The biggest change is a much larger locomotion set now wired into multiplayer presentation for both body types. That means more animation coverage for the moments players notice most: starting to move, stopping, changing pace, entering a sprint, leaving a sprint, and moving across stairs.

Why this matters: placeholder movement can make even good networking feel rough. When starts and stops are abrupt, stairs look wrong, or feet do not settle properly on the ground, players read the whole character as unfinished. Expanding the locomotion bank gives OPEN//77 much more room to present movement in a believable way.

For players waiting on a polished Cyberpunk 2077 co-op or Cyberpunk 2077 online experience, this is the kind of foundation work that pays off everywhere. Freeroam looks better, roleplay looks better, and any future combat or social scene benefits from characters that move like they belong in Night City.

## Stairs, foot placement, and traversal now look more natural

This update did not just add more run cycles. It also improved some of the trickier parts of character presentation: stair movement, foot IK, and traversal support.

In plain language, feet should behave more convincingly on uneven ground and stairs, and the body has better support for actions like climbing or vaulting over obstacles. Traversal is especially important for a Cyberpunk 2077 multiplayer mod because Night City is dense with geometry, elevation changes, ledges, barriers, and clutter. Characters need to handle all of that without looking robotic.

The team also cleaned up how movement recovers after ragdoll handoff, which helps the body settle back into normal motion more cleanly after physics-heavy moments. That is a small detail on paper, but it matters a lot in actual play.

## Explore mode feels better to control

Third-person explore movement also got a feel pass. When a character is unarmed or holstered, the body now faces the direction of travel more naturally instead of feeling disconnected from movement. Sprinting also leans more convincingly into turns, which adds a lot to the sense of momentum.

The camera follow was smoothed out as well, and sprint behavior on stairs was adjusted so movement there is more sensible. None of these changes are flashy alone, but together they make walking and running around Night City feel much more cohesive.

This is exactly the kind of work that helps a Cyberpunk 2077 RP server or social freeroam server feel good before deeper gameplay systems even enter the picture.

## Launcher fixes remove a nasty server-switch trap

Outside the game client itself, the launcher received an important reliability pass. The main player-facing win is that changing server setups or bouncing between channels is now much less likely to leave someone stuck behind a mod conflict error.

That issue was especially frustrating because it could block launch even when the player had done nothing wrong. The updated launcher is better at tracking which server owns which files, handling overlaps safely, and recovering from interrupted changes. In practice, that means less manual cleanup, fewer confusing dead ends, and a smoother path into a Cyberpunk 2077 dedicated server session.

Launcher 0.2.24 and 0.2.25 were released with these improvements.

## Anti-cheat and session trust keep moving forward

There was also meaningful progress on the anti-cheat side, although much of that work is intentionally not very visible. The short version is that session readiness checks and integrity coverage improved, giving operators stronger signals before and during play.

For players, the important part is not the implementation details. It is the outcome: more trustworthy sessions and a stronger backbone for fair public play. For server owners, better readiness checks can mean fewer bad sessions making it to players in the first place.

## Why this update matters

A lot of multiplayer progress is invisible until several systems click together. This was one of those days. Better locomotion, smoother third-person presentation, safer traversal, and more reliable launcher behavior all support the same goal: making OPEN//77 feel like a real CP2077 multiplayer experience instead of a tech demo.

If you are waiting for Cyberpunk 2077 multiplayer, the headline is simple: characters are moving better, the launcher is getting more dependable, and the platform underneath Night City online is getting stronger.

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
