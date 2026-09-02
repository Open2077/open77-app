---
title: "Respawns fixed, AVs unlocked"
date: "2026-09-02"
description: "OPEN//77 improved Cyberpunk 2077 multiplayer with safer respawns, better bot matches, pilotable AVs, and a cleaner server browser."
tags: ["cyberpunk-2077-multiplayer", "cyberpunk-2077-online", "night-city-online", "cp2077-multiplayer"]
---
OPEN//77 made a strong round of gameplay-focused progress today. The biggest wins were safer respawns and spawn placement fixes for PvP and bots, plus pilotable AVs in freeroam and a more useful server browser for players looking for the right Night City online session.

## Respawns and placements are much more reliable

A lot of today’s work focused on one of the least glamorous but most important parts of any Cyberpunk 2077 multiplayer mod: putting players and bots in the right place, every time.

The team fixed several edge cases where server-authored placements could go wrong after death, on lobby returns, or while areas were still streaming in. In the worst cases, a body could appear far away from the intended location, land in the wrong place, or even fall into the void before the world had fully caught up. The new logic waits for a placement to actually settle correctly before treating it as successful, and it keeps the placement pinned to its intended mark while floors and nearby world data stream in.

That sounds small on paper, but the effect is big in practice. Matches feel fairer, bot rounds are more trustworthy, and players spend less time fighting spawn weirdness instead of each other.

## Bot matches now behave more like real matches

Bots also got a practical upgrade on respawn. Instead of carrying over bad state during a two-step respawn flow, bots are rebuilt properly when they come back in. Combined with the placement fixes, this helped all three arena formats run through to actual results in live verification.

For OPEN//77, that matters because bot support is not just a test toy. Bots are a key part of validating game flow, scoring, and match stability before larger player counts arrive. Better bot respawns mean better confidence in the whole PvP loop.

The team also tightened multi-kill scoring behavior so bonus events trigger once per burst and stay inside the intended timing window. That is the kind of tuning players may not notice directly in patch notes, but they absolutely notice when scoreboards feel clean and believable.

## PvP deaths now look correct again

Another visible fix landed for PvP presentation. Remote players who died could sometimes stay standing upright, frozen in place, until respawn removed them. That made firefights look broken even when the underlying gameplay state was correct.

The new change hands control back in time for the death animation and ragdoll behavior to play correctly on remote deaths. In plain English: when somebody drops, they now look like they actually dropped. That is a huge readability win for Cyberpunk 2077 co-op and competitive combat alike.

PvP also now has its own combat music, helping arena fights feel more distinct from freeroam sessions.

## Pilotable AVs arrive in freeroam

Yes, really: pilotable AVs are now exposed through the freeroam menu. This is one of those features that instantly changes the fantasy of a Cyberpunk 2077 online session. More mobility, more chaos, more skyline.

This does not mean every vehicle system is finished, but it does mean players in freeroam can now access one of the most requested kinds of traversal in a much more direct way.

## A cleaner multiplayer interface

The interface side got some love too.

Single-player gameplay hints that do not make sense in multiplayer are now hidden, which should make the HUD feel less noisy and less confusing during online play. At the same time, vanilla HUD controls were exposed, giving players more direct control over parts of the interface. Synced vehicle paint was also exposed, another nice step toward making shared world moments feel more consistent across clients.

## Server browser improvements on web and launcher

Finding a server is now a little more human.

Both the website and launcher server browser now show country or region flags beside server locale information, and both now include a matching filter. Instead of parsing raw locale text, players can scan the list faster and narrow it down more easily.

That is especially useful as OPEN//77 grows toward more community-hosted options, including the long-term goal of supporting every kind of Cyberpunk 2077 dedicated server and Cyberpunk 2077 RP server experience.

## Why this update matters

Today was not about flashy cinematic systems. It was about removing friction from the core loop of CP2077 multiplayer: spawn in, fight, die, respawn, move on, and get back into the action without weirdness.

That is the kind of work that makes a Cyberpunk 2077 multiplayer experience feel real instead of experimental. Add in pilotable AVs and a more useful browser, and OPEN//77 is getting more playable and more legible at the same time.

The headline version: fewer broken respawns, better bot rounds, proper PvP deaths, flying vehicles in freeroam, and a cleaner path into the right server. That is a good day in Night City.

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
