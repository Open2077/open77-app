---
title: "Servers get banners, and world sync gets a lot less cursed"
date: "2026-08-25"
description: "Today in OPEN//77: server banners flow end to end from Warden to the website, plus fixes for exploding vehicle fleets, resurrecting props and stubborn weather."
tags: ["servers", "world-sync", "vehicles", "warden"]
---

Today's work on OPEN//77 — our **Cyberpunk 2077 multiplayer mod** — was a mix of identity and stability: dedicated server owners got a way to make their world look like theirs, and three long-standing world-sync gremlins got fixed at the root.

## Server banners, end to end

Servers can now carry a **banner image**, and it flows through the whole platform: an owner uploads it in the Warden panel, the dedicated server validates it and publishes it to the master, the master stores it and serves it in the server catalog, and both the website's server browser and the in-game list display it — on the row and as the hero cover of the server's detail page.

It sounds small, but it's the difference between a server being a line of text and a server being a *place*. Combined with the icons, website and Discord links that landed in Warden's onboarding this weekend, a server can now present a proper identity before you ever connect.

## Vehicles: no more exploding fleets

A nasty one: groups of vehicles that had been streamed out and then streamed back in could **spontaneously explode**. The cause was uninitialized health state being read on restream — the game saw garbage, concluded the car was dead, and obliged with the fireball. Vehicle health is now properly initialized on restream, and returning fleets arrive intact.

## Destroyed props that wouldn't stay dead

Destroyed world props could **resurrect mid-session** — you'd smash something, drive away, come back, and it was standing there like nothing happened. The investigation turned up not one cause but **five stacked ones**, each masking the next: fixing any single one wasn't enough, which is why this bug survived so long. All five are now closed, and destruction sticks for the whole session, for everyone.

## Weather that takes "no" for an answer — fixed

Weather sync could silently fail its first application and then never retry, leaving a client stuck with the wrong sky. The weather system now **retries until the first successful apply**, so every client ends up under the same clouds as the server intends. If Night City is going to be moody, it should at least be consistently moody.

## Also today

- The **pause and session menus** got a redesign pass, and overlays now survive resolution and window-mode changes without disappearing.
- The website's server pages picked up the new **banner covers** (that's the other end of the banner pipeline above).
- A batch of internal tooling and build fixes that make development faster but change nothing player-facing — we'll spare you those.

More tomorrow. If you want the short version of these in your Discord feed, it's posted daily in the [community Discord](https://discord.open2077.net).

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
