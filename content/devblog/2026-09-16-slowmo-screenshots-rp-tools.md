---
title: "Slow-mo, screenshots, RP poses, and a smarter admin kit"
date: "2026-09-16"
description: "OPEN//77 added safe slow-motion, screenshots, RP poses, NPC tools, and better admin controls for Cyberpunk 2077 multiplayer servers."
tags: ["cyberpunk 2077 multiplayer", "cp2077 multiplayer", "cyberpunk 2077 dedicated server", "cyberpunk 2077 rp server", "night city online"]
---
OPEN//77 had a very feature-heavy day, with new tools for players, roleplay servers, and admins all landing together. The biggest themes were safe slow-motion in multiplayer sessions, screenshot and mugshot support, richer RP scene tools, and a major Warden admin upgrade. For anyone tracking the path toward a real **Cyberpunk 2077 multiplayer mod**, this was one of those days where a lot of important pieces moved at once.

## Session-safe slow motion for Cyberpunk 2077 multiplayer

One of the standout additions is world time scaling support. OPEN//77 now has a controlled way for resources to request time scale changes on the client, and the server can replicate time scale by routing bucket as well.

That matters because slow motion is one of the trickiest effects to adapt to a shared-world game. In single-player, dramatic time dilation is easy to take for granted. In **Cyberpunk 2077 co-op** or a full multiplayer session, it has to be managed carefully so one effect does not desync everybody else or break simulation.

The team also spent time validating how the game behaves in-session, not just offline. That research directly fed into the new implementation and into the Reflex Overdrive work. In practical terms, the result is that servers now have a safer foundation for cinematic effects, ability moments, and event scripting that touch the game clock.

## Reflex Overdrive got more usable and more stable

Reflex Overdrive itself kept improving. The ability now has a proper card inside the cyberware lab panel, so testers no longer need awkward workarounds to grant it. Activation is also now a real key binding instead of a hardcoded input poll, which means players can rebind it.

Just as importantly, a nasty observer-side issue was fixed. During earlier combat-tier demos, the boosted player could hit self-view runaway protection because the temporary speed increase crossed an internal threshold. That caused the player body to disappear for observers. The fix makes the overdrive own its extra speed the same way dash-style movement does, and live verification confirmed the vanishing issue is gone.

Presentation also improved earlier in this work: better visual composition, better long-range readability, and a fix for nameplates dropping out mid-boost. That all adds up to a cyberware effect that reads more clearly in a multiplayer session.

## Better roleplay scene tools: placed postures, 3D text, and cinematic bars

RP and event tooling got a big bump. Servers can now place portable posture animations at exact coordinates, including a chair-height sit, a wall lean, and a lying pose. These are not generic emotes fired in place; they can be anchored into the world, which is much more useful for scenes, social hubs, screenshots, and scripted encounters.

The UI kit also gained floating 3D text and cinematic bars. Floating text is useful for scene labels, interaction hints, temporary event signage, and guided experiences. Cinematic bars give server owners a lightweight way to create cutscene-style presentation for missions or announcements without building a full custom UI flow every time.

Together, these additions are a meaningful step toward better **Cyberpunk 2077 RP server** experiences. They give creators more ways to stage scenes, guide players, and make Night City feel intentionally directed rather than improvised.

## Screenshot capture, mugshots, and moderation workflows

OPEN//77 now supports in-process screenshot capture on the client, plus upload flows, surface capture, mugshots, and server-requested screenshots.

This is useful for much more than pretty pictures. For admins, screenshot requests can support moderation workflows. For character-driven servers, mugshots can support profiles, records, or custom systems. For event teams, image capture opens up cleaner documentation, marketing shots, and scene tools.

The implementation also includes scaling options so smaller captures can be generated when a full-size image is not necessary. That should help keep the feature flexible for different server needs.

## Warden admin tools took a big step forward

Warden received one of the day’s most practical upgrades: a richer Players tab with player actions built in. Admins can now see more useful player information and perform actions such as heal, freeze, teleport, and bring from the panel.

For a **Cyberpunk 2077 dedicated server**, this kind of control surface matters a lot. It reduces friction for live support, events, moderation, and debugging. Instead of stitching together console commands and guesswork, operators get a clearer view of who is online and what state they are in.

This same wave also improved related control systems and documentation, making the admin stack easier to understand and use.

## NPC, vehicle, and combat systems also moved forward

Several supporting gameplay systems advanced too:

- NPC interaction prompts can now notify the server when a player uses them.
- NPCs can be told to speak and can have visible equipment changed.
- Weapon components and gadgets are now scriptable, including gadget consumption events.
- A bundled fuel sample resource shipped for servers that want fuel gameplay.
- Server-side ground-height queries were added by relaying observations from nearby clients.
- Fall-damage shielding and ragdoll controls were expanded.
- A FiveM-style invincibility compatibility alias was added for server scripting parity.

These are the kinds of systems that make custom game modes more realistic to build. They do not just add surface polish; they expand what server owners can actually prototype in **Cyberpunk 2077 online**.

## Stability fixes and release progress

Outside the big feature list, there were also quality improvements to camera alignment, wardrobe framing, noclip, and readiness recovery. Those fixes are less flashy than screenshots or slow motion, but they matter because they make regular testing and admin workflows feel more dependable.

On the platform side, the docs site was updated heavily to reflect the new APIs and guides, and the daily digest system was hardened after a failed post caused by an empty repository edge case. New dedicated server releases also went out, continuing the steady march toward a more complete OPEN//77 stack.

## Why this day matters

This update was not one feature in isolation. It was a broad push across player abilities, admin power, RP tools, documentation, and server capabilities.

That is a big deal for OPEN//77 because a believable **Night City online** experience needs all of those layers working together. Players need cool abilities that hold up in multiplayer. Admins need moderation tools. Server owners need scripting power. RP communities need scene-building tools. Yesterday moved all four.

If you have been waiting for signs that OPEN//77 is becoming more than a technical prototype, this is one of the clearest signals yet.

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
