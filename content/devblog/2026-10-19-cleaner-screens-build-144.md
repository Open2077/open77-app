---
title: "Cleaner screens, newer tools, fresh unstable build"
date: "2026-10-19"
description: "OPEN//77 build 144 improves shared screens in Cyberpunk 2077 multiplayer and updates NCWE Studio for server creators."
tags: ["cyberpunk-2077-multiplayer", "cp2077-multiplayer", "cyberpunk-2077-dedicated-server", "night-city-online"]
---
Today’s update is about polish where players will actually feel it: shared TV and cinema screens now behave much better, and unstable build 144 is out for testing. On the creator side, NCWE Studio 0.1.0-beta.12 is now the live download on the site, bringing a big toolbox upgrade for people building content for a Cyberpunk 2077 multiplayer mod and future Cyberpunk 2077 dedicated server communities.

## Better TV and cinema screens in Night City online

A set of fixes landed for one very visible problem area: in-world screens. Players on RP servers and social spaces want TVs, cinemas, and watch-party setups to just work. Before this pass, some displays could show missing chunks, random specks, or image breakup that got worse at sharp viewing angles.

The team tracked this down to several edge cases around how screen images were being layered against the world. In plain language, the game could sometimes treat a screen’s own front surface, or stale visual data, like it was blocking the picture. That created ugly artifacts even when nothing meaningful was actually in the way.

This update improves that behavior in a few important ways:

- large screens viewed from below or from the side now hold together much better
- TVs with front glass are less likely to hide parts of their own picture
- moving the camera should produce fewer sparkles and square specks across the image
- screen images are hidden by genuinely solid things in front of them, instead of by false positives

For players, that means cleaner movie nights, cleaner livestream-style events, and fewer immersion-breaking glitches in shared spaces. For a Cyberpunk 2077 co-op or Cyberpunk 2077 RP server experience, small presentation details like this matter a lot because social scenes live or die on readability.

## Unstable build 144 is live

The platform backend has published unstable client and server build 144.

That makes today’s display fixes and related changes available in the current testing track. As always, unstable builds are where the team validates improvements in the wild before they graduate further. If you are following OPEN//77 closely, this is the build number to watch for the latest client and server behavior.

## Launcher core package updated

The launcher now includes a generic idle workspot archive in the mandatory core package.

This is not a flashy feature, but it is useful. Bundling more required base content into the core package helps reduce content mismatch problems and makes the default install more complete. For players, that generally means fewer chances of hitting avoidable missing-content issues as the multiplayer stack grows.

For server owners, it is also a small but meaningful quality-of-life improvement: the more reliable the baseline package becomes, the easier it is to build on top of it.

## NCWE Studio 0.1.0-beta.12 now on the website

The open2077.net download for NCWE has been updated to NCWE Studio 0.1.0-beta.12.

This is a substantial editor release for builders. Highlights include:

- a UV editor beside the 3D view, with familiar mesh-editing workflows
- gameplay zone tools
- a VFX workspace
- population tools
- broader support for world-editing data

That is not a direct player feature today, but it matters for the future of Cyberpunk 2077 online. Better creator tools lead to better custom spaces, smoother event setups, and more ambitious server content. For anyone planning a Cyberpunk 2077 dedicated server or long-term RP project, stronger world-editing workflows are a big deal.

## Why this update matters

This was a focused day, but a valuable one. The biggest player-facing win is simple: screens look more stable and believable. In a multiplayer project, that kind of visual reliability makes social features feel much more real.

At the same time, build 144 keeps the unstable branch moving, the launcher baseline gets stronger, and NCWE creators receive a serious new toolkit upgrade. That is a healthy mix for OPEN//77: visible polish for players now, better infrastructure and content creation for the road to a full Cyberpunk 2077 multiplayer mod experience.

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
