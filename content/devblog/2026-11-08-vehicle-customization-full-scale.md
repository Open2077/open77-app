---
title: "Vehicle customization goes full scale"
date: "2026-11-08"
description: "A major Cyberpunk 2077 multiplayer mod update expands vehicle customization, fixes sync and crash issues, and improves nameplates and voice."
tags: ["cyberpunk-2077-multiplayer", "cyberpunk-2077-multiplayer-mod", "cyberpunk-2077-rp-server", "cp2077-multiplayer", "night-city-online"]
---
Today’s work was a big step toward making vehicle customization feel production-ready in **Cyberpunk 2077 multiplayer**. The headline is simple: many more vanilla vehicles can now be customized across a much wider set of categories, while a long list of replication, streaming, and crash issues got cleaned up at the same time.

This was not just about adding more toys. It was also about making sure a customized car keeps the right look after streaming out, coming back, changing distance level, or being seen by another player on a different client.

## Vehicle customization now covers far more of the garage

The biggest feature gain is the scale-up of the vehicle customization system. Support expanded across vanilla player vehicles for major categories including rims, plates, body kits, performance stages, engine sounds, original stickers, and liveries.

That matters for both players and server owners. For players, it means the dream of a real tuning shop in **Night City online** gets much closer to reality: more cars and bikes can participate, and more categories can be offered without feeling like a tiny whitelist. For server owners, it means the system is becoming broad enough to build a serious **Cyberpunk 2077 RP server** economy around garages, tuning shops, and specialty builds.

On the Light RP side, Auto Studio now acts much more like a complete customization shop instead of a partial demo. Categories that used to be greyed out on many vanilla vehicles now have real data behind them, and the required content packs have been committed so another server can actually use the feature instead of recreating the lab setup from scratch.

## A major reliability pass on vehicle visuals and sync

A lot of the day’s value is in bug fixes that players will feel even if they never read a changelog.

Several fixes targeted problems caused by distance streaming and detail switching. Painted cars could come back from a low-detail proxy with factory colors. Tinted windows could fail to render, disappear after streaming, or come back wrong. Hidden factory wheels or body parts could briefly flash back on screen while custom parts were loading. In some situations, the local player could even have a vehicle body rebuilt underneath them during a visual refresh.

Those are exactly the kinds of bugs that make a customization system feel fake or fragile. The new fixes aim to keep the published vehicle look stable while the game changes distance levels, reloads components, or resolves a car’s appearance again.

The networking side also got tougher. Large customization payloads could hit client-side limits and fail silently, especially with state snapshots, delta updates, or big catalogues. That has been tightened up so bigger vehicle setups are less likely to vanish into the void.

Another important safety change: full property updates now validate the whole request before applying it. That reduces partial updates where one bad field could leave a car half-updated or bounced into the wrong state.

## Crash fixes for sticker-heavy cars and component edge cases

One of the nastier fixes in this batch was a crash tied to sticker-heavy vehicles viewed from long range. The short version is that some decal changes were happening in the wrong visual state, and the result could crash remote clients. The behavior is now constrained so those changes only happen where the game can handle them safely.

There were also fixes around deferred tint work, component refresh timing, replicated damage swaps, and worker-thread edge cases touching vehicle components. That is not glamorous patch-note material, but it directly affects whether a **Cyberpunk 2077 multiplayer mod** feels stable when lots of customized vehicles are active at once.

## Nameplates look better and behave more naturally

The native nameplate system also moved forward in a visible way.

Nameplates now do a better job of respecting line of sight, including walls, floors, terrain, closed doors, and more precise material handling for glass and mesh surfaces. The system also supports theming from Lua and can show voice level in the plate itself.

The result is cleaner presentation and less immersion-breaking UI. Instead of labels floating through solid surfaces, the system behaves more like something built for a real **Cyberpunk 2077 online** world.

## Voice chat quality-of-life improvements

Two voice updates stand out for players and creators.

First, Open77 should stop causing Discord, music, and video apps to drop to roughly half volume while the game is running. That volume ducking has been a recurring annoyance, so this is a very welcome fix.

Second, received VOIP now renders in a way that OBS game capture can actually record. For streamers and content creators, that means other players’ voices should finally show up in captured gameplay audio more reliably.

## Light RP fixes for real gameplay problems

Outside the headline customization work, Light RP also addressed several player-reported issues. Fixes landed for TCG mouse focus, mission respawn leftovers, death after leaving a mission, and getting stuck in a studio after reconnecting.

Auto Studio purchases also got safer. The flow now handles missing support more honestly, checks wallet state earlier, avoids bad rollback outcomes, and is much less likely to leave a preview, stage, or side effect behind after a failed or interrupted purchase.

## What this means going forward

This update is a strong foundation move for **Cyberpunk 2077 dedicated server** features built around cars: tuning shops, faction garages, mechanic gameplay, rare liveries, and identity through vehicles.

The exciting part is not just that more customization exists. The exciting part is that the system is starting to survive real multiplayer conditions: two clients, late joins, server restarts, hot reloads, streaming distance, and large content packs.

That is the kind of progress that turns a cool prototype into something players can trust.

---

## About OPEN//77

[OPEN//77](https://open2077.net) is a free, in-development **multiplayer mod for
Cyberpunk 2077**: play online with other players in Night City on
community-hosted **dedicated servers**, with synced combat, vehicles and world
state, an account-backed launcher, and Lua-scriptable servers for co-op,
freeroam and RP. Browse [servers](https://open2077.net/servers), read the
[docs](https://open2077.net/docs) to host your own, or join the
[Discord](https://discord.gg/open77) to follow development. This devblog is
published daily, straight from the work the team shipped that day.
