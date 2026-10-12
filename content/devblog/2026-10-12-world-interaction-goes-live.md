---
title: "World interaction just got real"
date: "2026-10-12"
description: "OPEN//77 made a major Cyberpunk 2077 multiplayer mod leap with world interaction, RP jobs, public server resources and better seating/UI fixes."
tags: ["cyberpunk-2077-multiplayer", "cyberpunk-2077-rp-server", "cyberpunk-2077-dedicated-server", "night-city-online", "cp2077-multiplayer"]
---
OPEN//77 took a big step toward real shared-world gameplay today. The headline is a new world interaction foundation for the **Cyberpunk 2077 multiplayer mod**, plus the first live-proven reference jobs built on top of it, better seating and UI behavior for players, and a much better setup for server owners who want to build their own **Cyberpunk 2077 dedicated server** experience.

## A real foundation for shared world interaction

A large part of today’s work was about making world interactions behave like proper multiplayer systems instead of loose local tricks.

The new interaction stack adds server-owned action flow, prop carrying, containers, furniture data, seating support, and an experimental durable transaction layer. That sounds technical, but the player-facing benefit is simple: when two people try to use the same thing, the server can decide who gets it, what gets reserved, what gets cancelled, and what actually commits.

That is the kind of plumbing a serious **Cyberpunk 2077 online** world needs. It reduces weird edge cases, prevents duplicate outcomes, and opens the door to more believable jobs, shops, service stations and public interactions across Night City.

## Players can now use more job-style animations

Nine ambient workspot profiles were promoted into the player-facing catalogue. That includes welding, kneeling and standing drilling, two desk keyboard setups, and several cooking and grill roles.

This matters for both roleplay and gameplay. It gives players more believable ways to perform jobs in the world, and it gives server creators ready-made building blocks for scenes like repair bays, kitchens, food stalls and market corners.

The team also promoted bar seat profiles for players and added a more flexible arrival radius option for server-controlled interaction placement. In practice, that helps interactions feel less brittle and more natural when a player moves into position.

## Seating, beds and UI flow got cleaner

A lot of small but important quality-of-life fixes landed around the same systems.

Bar seats now approach from where the player is standing, which fixes cases where a seat interaction tried to route through bad geometry and failed. Beds were verified to work properly on both body types, with extra tolerance for the engine settling the body into place.

Blocked actions now show readable refusal text on screen, which is much better than a silent failure or vague feedback. If an interaction is denied, players should understand why.

The menu flow also got cleaner: pressing Escape to close a cursor-only panel no longer opens the pause menu on the same press. That is a small fix, but exactly the sort of annoyance players notice right away during repeated use.

## First reference jobs: salvage and street food

The most exciting content piece for many players and future server owners is the arrival of two new reference jobs in the official resources pack: salvage and street food.

The salvage job includes steps like clocking in, working a wreck, filling a crate, carrying it, loading it, and getting paid through the new interaction flow. The street food example shows a second style of job with a different rhythm and presentation.

Both were proven live with two clients. That matters because these are not just design documents or mockups. They are working examples of how a **Cyberpunk 2077 RP server** can use prompts, actions, inventory, economy and shared world state together.

## Official resources are now public for server owners

One of the biggest ecosystem improvements today is that official Lua resources are now being published into a public `open77-resources` repository.

For server owners, this is a huge quality-of-life upgrade. Instead of hunting for scattered examples or waiting for internal pieces to surface, builders can now browse official resources in one place. The repository now includes platform resources, gamemodes, examples, standalone pieces, libraries, and the Night City RP pack.

The docs side improved too. Each published resource now has a short README, and the website gained clearer how-to guides for jobs, actions, transactions, furniture and seating. The language was also rewritten to be more useful for server creators instead of reading like lab notes.

That means people planning a **Cyberpunk 2077 co-op** community or a larger RP project now have a much better starting point.

## RP systems adapted to the new transaction model

The official RP pack was also updated to work with the new transaction-backed interaction model.

That includes adapters across inventory, economy and job-related systems, plus a few practical fixes discovered during live runs. The HUD now refreshes faster when wallet services go offline or come back, and cargo views correctly show empty slots instead of breaking on an edge case.

These are exactly the kinds of fixes that make a multiplayer stack feel trustworthy over time. Not flashy, but essential.

## NCWE keeps improving for world builders

Outside the main game stack, the Night City World Editor site was updated with the latest beta download, and the editor itself had a strong feature day.

Studio now supports in-editor sound and visual effect previews, improved light gradient rendering, better handling of distant building proxies, cable editing and export, loading freeze options, custom icon visibility distance, and adjustable draw distance for slower machines.

For creators building custom spaces for **Night City online**, that is a meaningful workflow boost.

## Why this day matters

Today was not just about one flashy feature. It was about turning multiplayer interaction into something reliable enough to build on.

Players got clearer feedback, better seating, better beds, more usable job animations and the first signs of real shared-world work. Server owners got public official resources, better guides and two working job examples they can learn from.

That is the kind of progress that makes OPEN//77 feel more like a future playable world, and less like a pile of disconnected experiments.

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
