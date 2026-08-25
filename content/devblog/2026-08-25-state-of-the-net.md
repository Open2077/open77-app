---
title: "State of the Net: everything built so far"
date: "2026-08-25"
description: "A technical recap of everything OPEN//77 has built: multiplayer replication, dedicated servers, the Warden panel, Lua scripting, accounts and the launcher."
tags: ["recap", "multiplayer", "platform", "servers"]
---

This is the first post of the OPEN//77 devblog. From today on, a post lands here every working day, summarizing what actually shipped — written for players and server owners, with a bit more technical depth than the daily Discord summaries. Since it's day one, here is the big picture of what already exists.

## The game is real multiplayer

OPEN//77 puts other players in your Night City. The core of the project is a native client module and a dedicated server speaking a custom replication protocol, and by now that protocol carries most of what makes a session feel shared:

- **Players** — movement, animation and emotes replicate between clients, so other players look like players, not sliding mannequins.
- **Combat** — gunfights, melee and even grenade flight are synchronized, including combat audio. PvP has been through live regression testing between real clients.
- **Vehicles** — full vehicle replication: drivers and passengers, authoritative vehicle damage, and owner-state sequencing so two clients never fight over who controls a car.
- **The world** — time of day, weather and world destruction replicate. Destroyed props stay destroyed for everyone in the session, elevators and moving platforms stay in sync, and the single-player population is sanitized out of the way so the server decides who lives in the world.

All of that runs on dedicated servers — sessions are hosted, not peer-to-peer, and the server is authoritative over the world.

## A platform, not just a mod

Around the game sits a full online platform:

- **Accounts** — you sign in with an OPEN//77 account. E-mail verification and password reset work end to end, backed by the master server that also keeps the server directory.
- **The launcher** — a native desktop launcher handles browser-based sign-in, verifies your game installation, keeps the mod up to date through signed auto-updates, and updates itself the same way. One click on a server takes you from the launcher straight into that world.
- **Direct connect** — `open77://` deep links boot the game directly into a chosen server, from the website, Discord, or anywhere a link can live.
- **Server browser** — a live server list exists both in-game and on this site, with per-server detail pages, icons and banners.

## Server owners get first-class tools

Running a world is meant to be a product experience, not a folder of config files:

- **Dedicated servers for Windows and Linux**, shipped as versioned builds with a first-run setup wizard that walks through licensing and configuration.
- **Warden**, the web admin panel: a config editor with validation, live Lua resource uploads that hot-reload without a restart, announcements, scheduled restarts, multi-user access with custom roles, and a full audit trail.
- **Lua scripting** — servers are scriptable in Lua against a documented API (browse it under [/docs/api](/docs/api)), with MySQL bindings for persistence and a freeroam gamemode shipped as a reference resource to build on.
- **Moderation** — server-issued bans and platform-level enforcement are wired end to end, from the in-game action to the master server's records.

## Security, in broad strokes

A serious slice of recent work went into keeping the network fair: signed builds with server-side verification, client integrity checks, and platform-level enforcement against tampered installations. We deliberately don't blog implementation details here — but the goal is simple: when the doors open, playing legit should be the only practical way to play.

## What's next

The project is pre-alpha: there is no public build yet, and this blog is part of changing that in the open. Follow the daily posts here, or join the [Discord](https://discord.open2077.net) where the same updates land as short summaries — announcements always hit there first.
