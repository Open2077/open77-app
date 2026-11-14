---
title: "Real in-world screens, layered outfits, and fresh crash fixes"
date: "2026-11-14"
description: "OPEN//77 added real in-world screens, layered outfits, and crash fixes for a smoother Cyberpunk 2077 multiplayer mod experience."
tags: ["cyberpunk-2077-multiplayer", "cyberpunk-2077-multiplayer-mod", "cp2077-multiplayer", "cyberpunk-2077-online"]
---
OPEN//77 had a strong engine-and-gameplay day: real in-world screens are now live, layered outfits are now saved and synced, and several important crash fixes landed. For anyone following Cyberpunk 2077 multiplayer progress, this is one of those updates where immersion and stability both moved forward at the same time.

## Real in-world screens for Cyberpunk 2077 multiplayer

OPEN//77 can now render web pages and native UI onto actual objects in the world as screen surfaces. Instead of faking a television or terminal with a flat overlay on the player screen, the system now lets a mesh in Night City behave like a true display.

That unlocks a lot of possibilities for a Cyberpunk 2077 multiplayer mod: televisions, kiosks, information panels, mission boards, shop terminals, admin displays, and custom server interfaces that exist inside the world instead of on top of it.

The new screen system supports both WebUI pages and native UI documents. Server creators can attach a page or interface to a world display, update what it shows, and let players interact with it directly.

## Clickable displays with proper 3D audio

The biggest quality jump is not just visual. These world screens also support interaction mode, including a real cursor and accurate click mapping on the display surface. In practical terms, if a player looks at a panel and uses it, the pointer lands where it should on the screen itself.

Audio also now comes from the screen's position in 3D space. A television plays sound from the television. A wall panel plays sound from the panel. That sounds simple, but it matters a lot for Cyberpunk 2077 online immersion because it makes shared spaces feel believable instead of UI-driven.

To show that system off, the team also added a default TV resource. Servers can use a real in-world television that plays video on the set with sound coming from the object. The older overlay-based television approach was removed from the default freeroam setup and replaced with this new world-screen version.

## Layered outfits arrive with 54 extra clothing slots

Character appearance also got a major upgrade. OPEN//77 now supports layered outfits with up to 54 additional clothing layers on top of the standard base equipment slots.

For players, the exciting part is simple: much more detailed fashion. You can combine more pieces, build more specific looks, and create outfits that feel closer to a real Cyberpunk 2077 RP server wardrobe instead of choosing only from a small number of core slots.

For multiplayer, the important part is that these layered outfits are saved and replicated. The character look is not just local dressing-room decoration. Other players can see the full result too.

The update also improves how hair and body-part hiding works. Instead of following only the old base clothing logic, the game now responds to the clothing layers that are actually visible. Hats, masks, boots, and similar pieces have a better chance of hiding the right parts and reducing awkward clipping.

## Noclip polish for admins

Admin noclip also received a usability pass. The flight HUD is now a slimmer native strip that fits the OPEN//77 freeroam style better. The underlying noclip behavior was also improved to feel more natural in third-person while staying hidden from other players.

This is mainly an admin and testing quality-of-life upgrade, but it helps moderators and builders move around Night City more comfortably while setting things up or investigating reports.

## Crash fixes that matter for longer sessions

Not every important update makes a flashy screenshot. Several crash fixes landed today, including work around vehicle decals, transform and physics edge cases, and appearance patch lifetime problems.

There was also a fix for a crash affecting a modded appearance workflow in Light RP. For players and server owners, the takeaway is the same: fewer abrupt failures in busy scenes, vehicle-heavy moments, or custom-content situations.

That kind of reliability work is essential for any Cyberpunk 2077 co-op or dedicated server experience. Fancy features bring people in, but stability is what keeps a session alive.

## Website and launcher note

The website now promotes the cross-platform launcher as the default download. That is a small change on paper, but it makes the first step into OPEN//77 clearer for new players preparing for Cyberpunk 2077 dedicated server play and future public testing.

## Why this update matters

This update pushes OPEN//77 forward in three different ways at once: more believable world interaction, deeper player customization, and fewer crashes. Real screens make Night City feel more shared. Layered outfits make characters feel more personal. Stability fixes make both systems more practical in real sessions.

For a project building toward Cyberpunk 2077 multiplayer, that combination is exactly what players want to see: not just experiments, but systems that look fun, feel tangible, and hold together under actual play.

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
