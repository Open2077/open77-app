---
title: "Wave 3 jobs land, with crash recovery and smoother interactions"
date: "2026-10-13"
description: "OPEN//77 lands new Cyberpunk 2077 multiplayer RP jobs, WebUI crash recovery, smoother world interactions and a redesigned launcher."
tags: ["cyberpunk-2077-multiplayer", "cyberpunk-2077-rp-server", "cyberpunk-2077-dedicated-server", "cp2077-multiplayer", "launcher"]
---
OPEN//77 had a huge day: the Wave 3 roleplay job set landed, world interactions got much more reliable, and the client learned how to recover from browser crashes without forcing a full restart. For anyone following Cyberpunk 2077 multiplayer mod progress, this is one of those updates where many separate systems suddenly start feeling like one game.

## Wave 3 roleplay jobs are now in the official resources

The biggest headline is content. The official server resources now include the full Wave 3 job lineup that has been under active proving and iteration:

- **Ripperdoc** work in Viktor's clinic
- **CHOOH2** production from farm pickup to refinery flow
- **Techie** salvage, stripping and assembly loops
- **Netrunner** breach contracts with trace pressure
- **Fixer** contract boards that connect multiple jobs
- **Trauma Team** subscriptions, pickups and medical response
- **Nomad** smuggling runs with physical crate handling

What makes these jobs exciting is that they are not abstract UI tasks. They rely on physical prompts, carried props, vehicle loading points, seating, treatment stations, contract boards, and handoffs between players. That is exactly the kind of groundwork a believable Cyberpunk 2077 RP server needs.

The website was also updated with pages for all of these jobs, so players and future server owners can now see the intended loops much more clearly.

## Cyberpunk 2077 multiplayer interactions feel more natural

A lot of the day was spent smoothing out the rough edges that appear only when two real players start testing jobs together.

Beds now offer **lie down** by default where the pose supports it. That sounds small, but it matters for clinics, apartments, recovery scenes and immersion in any Cyberpunk 2077 co-op or RP setting.

Interaction cards and prompts also got several practical fixes:

- prompts now appear in more usable positions
- item pickup cards sit closer to the actual object
- client reach matches the real action spot better
- stacked items on one point no longer lose their prompt
- players see clearer text when an action stops or is refused

That last part is important. Instead of vague failures or raw codes, the game now explains what happened in plain language. If a station is busy, if a target is already claimed, or if a pickup is blocked because a weapon is out, the response is much easier to understand.

## Carrying props is much more solid

Physical carrying is one of the systems that makes Night City online feel real, but it is also one of the easiest places for animation and input conflicts to break immersion.

Today’s work hardened that flow in several ways. Melee, jump and sprint can now be blocked more reliably while a carry action is active, so players do not accidentally drop a crate because of the wrong input at the wrong moment. Pickups are also refused if the player has a weapon or even fists drawn, because that state was interrupting the carry pose immediately.

When an item does get dropped or refused, the feedback is now readable instead of cryptic. For server owners looking at Cyberpunk 2077 dedicated server possibilities, this kind of polish is the difference between a promising prototype and something people can actually learn and trust.

## Better station rules and less crowd interference

Action spots now behave more sensibly when more than one player is involved. A placed action can refuse correctly if another player is standing on the working spot, and the system now prioritizes the most useful explanation when a station is already in use.

Some targets can also keep nearby NPC crowds from lingering directly on top of the interaction point. That should help busy public scenes stay readable instead of turning into a pile of pedestrians blocking the work area.

## WebUI crash recovery is a major quality-of-life win

One of the most valuable technical improvements today is not flashy, but players will absolutely feel it.

If the in-game browser process dies, OPEN//77 now relaunches it and restores the affected web surfaces automatically. Before this recovery work, that kind of crash could leave every web-based surface dead until the whole client was restarted.

That means better resilience for current interfaces and a stronger base for future Cyberpunk 2077 online features that rely on embedded web UI. Closed pause surfaces also now suspend unnecessary work, and rendering was optimized to reduce extra texture-copy overhead.

## Spawns and restores are safer over long distances

Another important fix targets long-distance placement and restore cases. The client now holds a placed body until the floor under the destination has actually streamed in. This reduces the risk of players falling through the map after a far travel, state restore, or job-related reposition.

For anyone testing jobs across the city and Badlands, this is a practical stability improvement, not just a technical cleanup.

## Small but visible wins

A few other changes are worth calling out:

- Gorilla Arms now display correctly in self-view
- /revive now properly heals living but downed players in RP trauma situations
- powerful cyberware lab actions now require an authorized operator
- players can now use a proper **DJ at the decks** animation profile

These are the kind of fixes and additions that make OPEN//77 feel more complete scene by scene.

## Website and launcher now look like one platform

The OPEN//77 site received a major visual redesign, and Launcher 139 now follows that same design language. This does not change gameplay directly, but it does matter for first impressions and usability. The project is starting to feel less like separate tools and more like one connected platform for CP2077 multiplayer.

## Why this update matters

This update shows the shape of the project more clearly than ever. OPEN//77 is not only adding features to a Cyberpunk 2077 multiplayer mod. It is connecting client stability, world interaction, official resources, server tooling and player-facing presentation into one coherent stack.

The Wave 3 jobs are the headline, but the deeper story is that the systems under them are getting sturdier: clearer prompts, stronger carry logic, safer placement, and crash recovery that keeps the session alive. That is the kind of progress that turns cool demos into real multiplayer play.

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
