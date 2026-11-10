---
title: "Voice, HUD and map go fully native"
date: "2026-11-09"
description: "OPEN//77 adds major voice upgrades, a native HUD and map, and a multilingual launcher for a smoother Cyberpunk 2077 multiplayer experience."
tags: ["cyberpunk-2077-multiplayer", "cp2077-multiplayer", "cyberpunk-2077-online", "cyberpunk-2077-rp-server", "night-city-online"]
---
OPEN//77 had a big platform day: voice took a major step forward, and a large chunk of the interface moved from browser-based overlays into a new native in-game UI layer. The result is a more solid foundation for Cyberpunk 2077 multiplayer, plus a cleaner and more immersive presentation for players.

## Unified voice gets much closer to game-ready

The biggest systems work today was voice. OPEN//77 now has a much more complete unified voice foundation with server-side routing, broadcasters, effects support, improved scene handling, and a lot of stability work around how voice state is sent and applied.

What matters for players is simple: voice is being built to handle proximity chat, radio-style setups, world sources, and RP-friendly communication in a more dependable way. The recent changes focus on keeping routes ordered correctly, limiting noisy control traffic, and making sure voice scenes stay valid when the game gets busy.

The team also improved how the client mixer and audio engine handle live changes. Route updates are batched more cleanly, audible paths are prioritized more intelligently, and fades/culling behavior are handled more gracefully. That should help voice feel less brittle during movement, range changes, and rapid state changes.

Several fixes also target the ugly edge cases that usually hurt a Cyberpunk 2077 online experience first: decode work no longer blocks other sounds as easily, DSP state can reset without expensive churn, and effect buffers are prepared more safely. A resource script fault also no longer kills every sound owned by that resource unless the resource itself actually stops.

## NativeUI replaces more old web overlays

A second major milestone today is the rapid expansion of NativeUI. OPEN//77 now renders more of its interface directly inside the game instead of relying on browser views for those screens.

This matters because native rendering gives the team tighter control over animation, input, layering, and performance. It also lets the UI feel like it belongs inside Night City instead of sitting on top of it.

The new native layer now powers:

- the Freeroam HUD
- the in-game chat
- the pause menu
- the connection and loading screen
- the TAB roster
- the 3D map and minimap

That is a major quality jump for a Cyberpunk 2077 multiplayer mod. It is not just a visual reskin. It changes how responsive these elements can be, how they animate, and how well they integrate with the game camera and scene.

## Freeroam HUD now looks and moves like part of the game

Freeroam 0.8.0 ships a new native HUD with a more stylized, floating presentation. Vitals, weapons, and speed are no longer boxed into flat web panels.

Health, armor, stamina, ammo, reload feedback, and chat all now live in NativeUI documents with projected motion and cleaner visual hierarchy. The speedometer was split into its own document so it can float independently with its own movement and inertia.

The HUD also reacts more physically. Weapon fire can kick the floating HUD briefly before it settles back into place. Small touches like that do a lot to sell the illusion that the interface is part of the vehicle and camera space instead of a static overlay.

OPEN//77 also added support for 3D-tilted UI documents and elements, which opens the door to more cockpit-like layouts, slanted HUD cards, and stylized diegetic interfaces for future game modes and servers.

## Chat, pause and loading screens get a full redesign

The new native chat keeps the same underlying behavior but presents it in a cleaner way. Closed chat now shows the newest messages more reliably, and opening chat no longer causes the activation key to type into the input by mistake.

The pause menu also moved over to NativeUI and once again supports server logos, including remotely provided ones. That is useful for Cyberpunk 2077 RP server identity and branding, especially when communities want a consistent look for players.

The connection and loading screen got one of the biggest presentation upgrades. It now runs natively, includes a stronger intro feel, and handles music more cleanly so the game’s own music does not fight the loading presentation underneath.

## 3D map and minimap go native

The official 3D city map also moved to NativeUI. Instead of relying on the old web stack, the map and minimap are now drawn through the native scene layer, with the city loaded once and reused across views.

For players, that means a cleaner map experience. For the project as a whole, it means one more core interface system is now living in the same rendering world as the rest of OPEN//77. The unnecessary performance panel on the open map was also removed, keeping the feature focused on what players actually need.

## Launcher and website become much easier to use worldwide

The launcher now supports ten languages: English, French, Spanish, Brazilian Portuguese, German, Polish, Russian, Turkish, Japanese, and Thai. On first run, it follows the Windows display language and still allows manual switching afterward.

There is also a useful Windows 11 quality-of-life fix: if Smart App Control is going to block the game, the launcher now explains that clearly instead of trying to start and failing without context.

The website also expanded language support across the main site and added optional in-browser translation for docs pages where supported. The docs remain English-first and indexable, while giving non-English speakers a better way to explore OPEN//77 and learn the platform.

## Better server setup and clearer release info

For server owners, Light RP no longer requires Chimera just to boot, which makes fresh setup much simpler. That is a practical improvement for anyone testing a Cyberpunk 2077 dedicated server or preparing a new community.

Release data and docs were also refreshed so published features are marked correctly. Vehicle customization is now clearly documented as released, and release tracking is up to date across the site and tooling.

## Why this day matters

This update was not about one flashy trailer feature. It was about turning core systems into something players can trust and feel.

Voice is getting the reliability and flexibility that Night City online needs. UI is becoming more native, more reactive, and more immersive. Setup is becoming easier for players and server owners. Together, those changes push OPEN//77 closer to the kind of CP2077 multiplayer experience that feels cohesive instead of stitched together.

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
