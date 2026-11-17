---
title: "Server checks arrive before launch"
date: "2026-11-17"
description: "OPEN//77 adds a pre-launch server check for Cyberpunk 2077 multiplayer, plus server performance upgrades and cleaner Discord-linked identity support."
tags: ["cyberpunk-2077-multiplayer", "cyberpunk-2077-rp-server", "cyberpunk-2077-dedicated-server", "cp2077-multiplayer", "launcher"]
---
OPEN//77 just made joining a server much clearer. The launcher can now talk to a game server before Cyberpunk 2077 multiplayer actually starts, so players see welcome pages, rules, maintenance notices, whitelist steps, or a clear refusal message up front instead of hitting a vague failure later.

On top of that, today’s work improves server performance, cleans up moderation flow around whitelist requests, and adds safer Discord-linked identity data for communities that use Discord as part of their setup.

## A better front door for Cyberpunk 2077 multiplayer

The biggest change is a new **connection preflight** system in the launcher and game server. In simple terms, the launcher now asks the server, “Can this player join, and what should they see first?” before the game fully proceeds.

That creates a much better experience for **Cyberpunk 2077 online** play. A server can now show:

- a welcome screen
- a rules page
- a maintenance notice
- whitelist application steps
- a clear ban or access refusal message

For players, the value is obvious: fewer confusing dead ends and more useful information during the join flow. Instead of being kicked into a generic error, the launcher can now present the server’s own explanation and next step.

## Default server check included for every server

This is not a feature that only custom server owners get after extra setup. OPEN//77 now ships with a built-in default preflight resource, so servers have a working join check experience out of the box.

That default flow covers the practical things most communities need from day one: access control, maintenance state, rules acceptance, and whitelist handling. The team also polished the presentation so refusal pages do not awkwardly repeat information the launcher already shows above them.

Another nice touch: the system now handles some door-list and whitelist outcomes in a more player-friendly way. If a player is banned or not yet allowed in, the server can present that decision directly rather than letting it feel like a random failure.

## Custom server style without replacing the logic

For server owners, especially **Cyberpunk 2077 RP server** communities, the exciting part is flexibility. The default preflight system can now be restyled with custom screens and greetings without forcing owners to replace the access logic underneath.

That means communities can keep the built-in handling for bans, maintenance, whitelist requests, and rules, while still giving the launcher flow their own look and tone. The Light RP framework already picked this up and now presents the launcher server check in its own design.

This matters because branding and onboarding are a big part of roleplay servers. A polished first impression makes a dedicated server feel real before the player even spawns into Night City.

## Cleaner moderation and whitelist management

Today’s update also tightens the admin side of access control.

If a player had a pending whitelist request and then got banned, that request now closes automatically instead of sitting around as a misleading “pending” item. Admins can also forget or remove whitelist requests more cleanly. That keeps moderation queues easier to trust and reduces clutter in access tools.

For server staff, that means less manual cleanup and fewer edge cases where the system says one thing while the actual server door says another.

## Verified Discord identity support

OPEN//77 also added support for passing a **master-verified Discord ID** to server Lua during connection, when a player has linked Discord on their account and the receiving server is allowed to use that information.

The important part for the community is not the packet format. The important part is what this enables: better Discord-aware server features with less guesswork. For example, future or custom server scripts can more confidently match an in-game connection to a verified community identity.

This is especially useful for communities building structured onboarding, Discord-based role assignment, or account-linked perks in a **Cyberpunk 2077 dedicated server** environment.

## Performance and stability gains for busy servers

The other big win today is server health.

The team landed a performance pass that reduces per-tick overhead, improves scaling behavior, and fixes a Lua-related memory leak. There were also improvements around how the server handles player scope and internal work distribution under load.

In practical terms, this should help long-running servers stay healthier and make larger sessions more realistic. That is an important step for **CP2077 multiplayer**, where server performance is one of the biggest gates between a cool prototype and a dependable public experience.

## Launcher 0.2.22 smooths profile recovery

The launcher also moved to version 0.2.22, adding direct recovery for interrupted profile switches. If a profile change gets interrupted, the launcher can now help recover more cleanly instead of leaving the player in a confusing state.

That is a smaller feature than connection preflight, but it is exactly the kind of quality-of-life improvement that makes the full OPEN//77 stack feel more solid over time.

## Why this day matters

This was a strong “player experience meets server maturity” update. The new pre-launch server check makes joining feel intentional, readable, and community-driven. The default implementation means servers benefit immediately. The customization hooks give RP communities room to build identity. And the performance pass keeps moving OPEN//77 toward a more stable **Cyberpunk 2077 multiplayer mod** foundation.

For players waiting to jump into Night City online, this is the kind of progress that makes the future experience easier to understand and easier to trust.

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
