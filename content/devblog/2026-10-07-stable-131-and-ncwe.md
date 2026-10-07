---
title: "Stable build 131 is live \u2014 and world editing just leveled up"
date: "2026-10-07"
description: "Stable build 131 is live for Cyberpunk 2077 multiplayer, with stricter version checks and major world-building upgrades for custom RP servers."
tags: ["cyberpunk-2077-multiplayer", "cyberpunk-2077-rp-server", "cyberpunk-2077-dedicated-server", "night-city-online", "cp2077-multiplayer"]
---
Stable build 131 is now live for OPEN//77, alongside an important platform-side version check and a huge leap forward for NCWE, our world editing toolset. For anyone following **Cyberpunk 2077 multiplayer** and the future of custom servers, this was a very meaningful batch of work.

## Stable build 131 is now published

The first player-facing change is simple: **stable client and server build 131** has been published.

That matters on its own, but the more important improvement is what comes with it. The platform now verifies incoming clients against the exact released binary for the current stable build before allowing admission. In plain language: players connecting with the wrong build should be caught more reliably, which helps reduce confusing connection problems and version mismatch issues.

For a **Cyberpunk 2077 dedicated server**, that kind of guardrail is valuable. Server owners want fewer support headaches, and players want a smoother “click play and get in” experience. This update pushes in that direction.

## NCWE is becoming a real Night City building tool

Most of this update was focused on **NCWE**, the Night City World Editor. The short version is that it went from an early technical base to something much closer to a practical creation suite.

The Studio now includes a full editor shell, free-fly navigation, 3D asset preview, multi-selection, undo/redo workflows, hover and selection overlays, change tracking, configurable shortcuts, and better feedback while editing. That sounds like a long list, but the player-facing takeaway is simple: building custom spaces is getting faster, clearer, and much more realistic.

This matters because custom spaces are a major ingredient for the long-term future of **Cyberpunk 2077 RP server** communities. If creators can shape interiors, streets, props, traffic flow, and interactive objects more confidently, Night City starts becoming a platform instead of just a backdrop.

## Better world streaming, better previews, better scale

A large part of the work was about making the editor handle the city at meaningful scale. NCWE can now stream nearby sectors, distant city proxies, roads, terrain, cables, foliage, and more world node families with far better responsiveness.

There were also major performance passes for loading, frame pacing, and memory behavior. In addition, the editor now renders game-faithful materials much more accurately near the camera, including richer surface types and improved previews for roads and other assets.

That may sound like an editor-only detail, but it is crucial for creators. If a builder cannot trust what they are seeing, world creation slows down and mistakes multiply. More accurate previews mean custom areas for **Cyberpunk 2077 online** play can be designed with much more confidence.

## Roads, traffic, doors, entities, and collision all moved forward

The content editing side also expanded in a big way.

NCWE now has a road editor with curved road drawing, textured previews, support for editing game roads, and export support. Elements such as lights, sound emitters, VFX, decals, doors, devices, and entity nodes are now much more editable as full world objects instead of partial placeholders.

Collision and occlusion editing were added too, which is a bigger deal than it sounds. Invisible collision leftovers or bad blocking can ruin a space instantly. The editor now handles those layers more intentionally, including fixing cases where deleting a visible object could leave a frustrating invisible blocker behind.

Traffic support also landed in the Studio. That is an exciting milestone because traffic helps custom areas feel alive instead of frozen. For a future **Cyberpunk 2077 co-op** or RP experience, that atmosphere matters a lot.

## Export for Open77 servers is getting practical

Another especially important step for server owners is export.

NCWE can now export projects as **Open77 world resources** intended for the required-mod system. That connects the editor more directly to actual server deployment instead of leaving creations trapped inside a tool. Custom maps, edited spaces, and world changes are getting closer to something a server owner can package and use.

Support for custom content workflows was also added, along with better handling for game-faithful entity references so doors and devices behave more like expected after export.

## Working elevators are in

The newest addition is a fun one: **working elevators**.

NCWE now has an elevator tool with floor editing and game-faithful export. Elevators are a small feature on paper, but in practice they unlock a lot for vertical spaces, megabuilding interiors, hidden venues, layered mission areas, and believable urban roleplay locations.

For a world as vertical as Night City, working elevators are one of those features that make custom places feel dramatically more real.

## Why this update matters

This was a two-part update: the live branch became cleaner and safer with stable build 131 and stronger version admission checks, while the creation pipeline for OPEN//77 took a major step forward.

For players waiting on **Cyberpunk 2077 multiplayer mod** progress, the message is encouraging: the foundation is not only moving on the play side, but also on the content side. For future server owners, the tooling story is becoming much more serious. Custom roads, props, doors, traffic, collision, world exports, and now elevators are all signs that Night City is getting closer to being truly editable for multiplayer experiences.

That is the kind of progress that pays off later in a very visible way.

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
