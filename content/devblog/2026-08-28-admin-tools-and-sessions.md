---
title: "Admin tools level up, sessions last longer"
date: "2026-08-28"
description: "OPEN//77 improved Cyberpunk 2077 multiplayer admin tools, expanded prop building options, and added longer sign-in sessions for web and launcher users."
tags: ["cyberpunk-2077-multiplayer", "cyberpunk-2077-rp-server", "cyberpunk-2077-dedicated-server", "cp2077-multiplayer"]
---
OPEN//77 had a strong quality-of-life day focused on two big areas: better in-game admin tools for server owners, and much less annoying sign-in behavior for regular players. On top of that, the prop system for custom spaces in **Cyberpunk 2077 multiplayer** got a major cleanup and expansion, making world building more practical for future community servers.

## Better live admin tools for Cyberpunk 2077 dedicated server owners

The biggest visible change today is the admin experience inside the game client. OPEN//77 now has a dedicated Props tab for admin controls, covering world props, lights, and effects. Server operators can spawn objects, place them at coordinates or near themselves, move them, remove them, list nearby items, and trigger or loop effects.

That matters because this is the kind of tooling that turns a tech demo into something a real **Cyberpunk 2077 dedicated server** owner can actually use. Instead of relying on awkward command flows, operators now have a clearer interface for shaping event spaces, RP scenes, and custom gameplay areas inside Night City.

The `/admin` experience also got a major usability pass. A new keyboard-driven admin menu lets operators work without fully dropping out of play. That sounds small, but it solves a very real problem: admins need to place a prop, look at it from different angles, test the space, and adjust it again without constantly fighting the UI. OPEN//77 is getting closer to a live sandbox where builders can iterate naturally.

A few practical gaps were also closed. Props can now be rotated with a yaw offset control, which means placed objects no longer have to face the camera direction by default. The vehicle list inside admin tools was also expanded from a tiny sample to the full vehicle fleet, giving admins much broader testing and event setup options.

## Prop building is larger, cleaner, and more reliable

The curated prop catalogue saw one of its biggest jumps so far. The available alias list expanded massively, giving server owners many more ready-to-use objects across a wide range of categories. For anyone planning a **Cyberpunk 2077 RP server**, that is a meaningful step forward: more street clutter, set dressing, signage, furniture, and scene-building pieces means more believable locations.

Just as important, the team did not simply add more entries and hope for the best. Several broken or misleading props were identified and corrected, including entries that failed to draw properly. One oversized alias was dropped after measurement showed it behaved more like a giant piece of architecture than a normal placeable prop. Other entries were verified against the actual in-game asset chain to make sure the label, host object, and final mesh all matched.

This work is less glamorous than “new feature shipped,” but it matters a lot. In a **Cyberpunk 2077 multiplayer mod**, trust in admin tools is everything. If a listed prop silently spawns the wrong thing, appears invisible, or behaves inconsistently, server owners waste time and lose confidence. Today’s changes make the catalogue more dependable for real-world use.

Lights and effects also got attention. Light toggling behavior was fixed so settings like color and intensity are preserved properly instead of resetting unexpectedly. That helps event builders and RP admins create spaces that stay visually consistent.

## Tuning and feedback are easier to use

The in-game tuning interface was rebuilt into a denser grid layout. For servers with lots of tunable values, that means less scrolling and faster scanning. The panel now also communicates when a change has actually landed, which is a simple but important confidence boost for operators adjusting gameplay values.

This kind of polish is especially useful as OPEN//77 grows beyond a single test environment. The more knobs a server can expose, the more important it becomes that admins can understand what changed and when.

## Website and launcher logins now feel less disposable

On the platform side, one of the most common annoyances was addressed: people were getting signed out too often. Session handling was extended significantly, and the sign-in flow now supports a “Keep me signed in” option on the website and in the launcher flow.

For players waiting on **Cyberpunk 2077 online** and checking progress through the site or launcher, this is a basic but valuable improvement. OPEN//77 should feel like a platform you return to, not one that asks you to log in again every day.

The practical result is simple: default sessions are longer, and users who choose the remember-me path can stay signed in for much longer still. It is a small friction reduction, but those are the changes people feel immediately.

## Version matching was corrected after recent multiplayer changes

Recent merges brought in native voice chat and other gameplay-side updates, which moved the network protocol forward. The backend then had to correct published versioning so client and server builds matched properly.

That kind of version alignment is critical for **CP2077 multiplayer** testing. If a client and server speak different protocol versions, they simply cannot connect cleanly. Today’s backend follow-up was about making sure released builds line up after the recent wave of multiplayer changes.

## New guides for future server owners

The website also gained new documentation aimed at future community operators. New guides cover props and effects, along with server branding through icons and banners. That is useful groundwork for creators who want to prepare a themed server identity before public play opens up.

Taken together, today’s work makes OPEN//77 feel more usable from both sides: easier to run, easier to build with, and less irritating to stay signed into. For a future **Night City online** experience, that is exactly the kind of progress that starts turning core systems into something communities can actually live in.

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
