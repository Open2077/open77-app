---
title: "Cordon gets real, launcher gets smoother"
date: "2026-09-05"
description: "OPEN//77 improved Cordon gameplay, smarter launcher networking, and better server controls for the Cyberpunk 2077 multiplayer mod."
tags: ["cyberpunk-2077-multiplayer", "cyberpunk-2077-multiplayer-mod", "cp2077-multiplayer", "cyberpunk-2077-dedicated-server"]
---
OPEN//77 had a strong progress day focused on two things players will feel quickly: sturdier moment-to-moment gameplay in Cordon, and a smoother path from launcher to server. We also added new connection controls for server owners, which is an important step for the long-term shape of **Cyberpunk 2077 multiplayer** and custom communities.

## Cordon combat and match flow got a major stability pass

Most of today’s game-side work landed in **Cordon**, our in-progress combat-focused mode. A lot of the improvements were about making the experience behave more consistently under stress: deployment, loot transactions, sprint behavior in the lobby, HUD refreshes, combat impacts, camp fights, and world boundaries all got updates.

That may sound like a long list of small pieces, but this is exactly the kind of work that makes a mode stop feeling prototype-ish and start feeling dependable. In a fast multiplayer session, players notice when loot does not resolve correctly, when health behaves strangely after recovery, or when a deployment abort leaves the world in a weird state. Today’s fixes target those rough edges directly.

Health and death handling also got extra attention. The team improved how combat health is preserved across recovery acknowledgements, presence changes, routing changes, and scripted lethal damage. In plain language: fewer chances for the server and the client to disagree about who is alive, where they died, or how much health they should have. That kind of consistency matters a lot in a **Cyberpunk 2077 co-op** or competitive environment, because nothing kills trust faster than confusing deaths.

## Better combat feedback inside the zone

The Cordon boundary itself also moved forward. Native visual effects are now part of that boundary behavior, helping the zone feel more like a real gameplay system instead of a placeholder. Camp combat was refined too, and kills from camp defenses are now attributed to guards rather than to the zone itself.

That sounds minor, but good attribution matters for readability. If players are eliminated, the game should communicate *what* beat them. Cleaner combat evidence and more accurate kill ownership make fights easier to understand, easier to learn from, and more satisfying overall.

The team also removed unsupported Cordon invite UI that did not match the current state of the mode. This is one of those changes that improves clarity by subtracting, not adding. A cleaner interface beats a misleading one every time.

## New server-side connection gating for whitelists and bans

Today also brought a meaningful upgrade for future **Cyberpunk 2077 dedicated server** hosts. Servers can now control incoming connections through a join gate, with the ability to hold, admit, or refuse a player and show custom refusal text.

For players, this means clearer feedback when a server does not let them in. For server owners, this opens the door to better whitelist flows, ban handling, and custom join rules. This is important infrastructure for public communities, private friend groups, and eventually more specialized spaces like a **Cyberpunk 2077 RP server**.

This kind of feature is not flashy in a trailer sense, but it is foundational for healthy online communities. If OPEN//77 is going to support a broad **Cyberpunk 2077 online** ecosystem, server operators need practical tools to manage access cleanly.

## Photo mode is now under resource control

Another notable game-side change: native photo mode can now be controlled by resources. Instead of the stock game behavior always being available on its own terms, custom experiences can decide when photo mode should open, close, or be disabled.

That gives server creators and game mode authors more control over immersion, events, restricted interactions, and custom gameplay moments. It is the kind of feature that will matter more and more as OPEN//77 grows beyond basic free-roam expectations and deeper into bespoke multiplayer experiences.

## Launcher fixes: fewer false alarms, faster connections, clearer updates

The launcher saw several player-facing improvements as well. First, the redesign shipped with explicit update consent, giving players a clearer say over update actions instead of silently pushing ahead.

A ready-state issue was also fixed, so stale updater progress should no longer make the launcher appear stuck when it is actually ready. Small issue, big annoyance — and now much less of one.

Another important fix: the launcher no longer mistakes some of Cyberpunk 2077’s own config files for player-installed mods. That false detection could cause players to disable files the game actually needs, which then prevented startup. Fixing that removes a nasty footgun for people just trying to get into **CP2077 multiplayer**.

Networking improved too. The launcher now races IPv6 and IPv4 connections instead of waiting too long on broken IPv6 routes. For players with messy home networking, VPN leftovers, or partially broken adapters, that should mean faster sign-in and fewer long pauses when talking to platform services.

## WebUI behavior is smoother on troublesome setups

Finally, the in-game WebUI got a pair of practical fixes. A live ring display that could appear blank or repeatedly restart now repaints correctly, and CPU-side rendering is capped at 30 FPS when the GPU path is not in use.

The result should be better behavior on affected systems: less wasted performance, fewer confusing visuals, and a more stable overlay experience.

## Why this day matters

Today was not about one giant headline feature. It was about turning several important systems from "mostly there" into "much more trustworthy." That includes combat flow in Cordon, access control for servers, launcher networking, and user-facing reliability.

For an in-development **Cyberpunk 2077 multiplayer mod**, that kind of work is what makes future public testing possible. Less confusion, fewer dead ends, and more confidence in the basics — exactly the kind of progress Night City online needs.

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
