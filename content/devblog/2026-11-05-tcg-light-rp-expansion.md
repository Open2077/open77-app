---
title: "TCG goes huge, poses stop breaking, Light RP spreads across Night City"
date: "2026-11-05"
description: "OPEN//77 expanded its Cyberpunk 2077 multiplayer mod with full TCG duels, new RP world content, stronger UI reliability, and better pose handling."
tags: ["cyberpunk-2077-multiplayer", "cyberpunk-2077-rp-server", "cp2077-multiplayer", "night-city-online", "cyberpunk-2077-online"]
---
OPEN//77 had a very packed day. The biggest headline is a huge Light RP expansion: the in-world Cyberpunk TCG is now much closer to a complete playable feature, while Night City itself gained new places, collectibles, and quality-of-life fixes that matter for everyday play in a Cyberpunk 2077 multiplayer mod.

Just as important, several stubborn immersion and reliability problems were cleaned up. Seated roleplay is harder to break, core interfaces recover better on slow clients, and character creation should fail much less often.

## Cyberpunk TCG grows into a real in-world activity

The TCG work was the star of the day. Light RP now has proper duel table gameplay with deck support, playmats, challenge flow, synced table state, duel overlays, seated camera support, and the full game loop for real matches.

This was not just visual polish. The rules engine now covers the actual phases of play, resources, attacks, reactions, stealing, overtime, and win or loss conditions. On top of that, every card effect in the current set has been scripted, turning the card game from a basic prototype into something much closer to a complete feature for a Cyberpunk 2077 RP server.

The table experience also got a lot easier to read. Hovering cards shows a larger preview with rules and keyword explanations. The duel HUD now uses a stronger house style, clearer prompts like "YOUR MOVE" and "RESPOND NOW," visible event callouts, better timer feedback, and more readable popovers. Rival hand information is also easier to understand during play.

## Better tutorial, booster flow, and private rooms

The tutorial for the TCG got a major second pass. It now supports English and French, adds illustrated concept windows, uses numbered clicks to guide each move, and includes a glossary. That matters because card games live or die on onboarding. A feature can be deep, but if the first ten minutes are confusing, many players will never touch it.

Booster opening also became much smoother. Requests now lock immediately to prevent accidental double use, the opening state appears right away, and players can quickly open another pack from the summary. The flow also gained game-style UI sounds and a visible opening animation with an emote bubble for nearby players.

For groups, private TCG rooms were added as a work-in-progress feature. Hosts can open a room, get a short join code, and bring friends into a separate instanced space. That is a strong fit for Night City online because it lets social play happen without the noise of a public table.

## New Light RP exploration and city services

Outside the card game, Light RP added hidden maneki-neko collectibles across the city. Players can find them through exploration, interact with them, and track progress in a dedicated collection panel. The panel shows completion by district, remembers where and how each discovered cat was found, and can pin found cats on the city map.

The collectibles also connect back into the TCG feature set. Milestone rewards now include boosters and display rewards, giving explorers another path into the card game economy.

The city layout also expanded. Kabuki gained more importance with the Job Center moving there and a new Rent-a-Ride desk added nearby. Beyond that, seven more rental desks were placed around the city, eight more general stores were added, and the public garage network was overhauled with thirteen garage locations.

For server owners building a Cyberpunk 2077 dedicated server experience, these kinds of content and placement updates matter a lot. They reduce dead zones, spread activity more naturally across districts, and give players more reasons to move around Night City instead of clustering in one hotspot.

## Poses and seated scenes are much more stable

One of the most visible multiplayer annoyances got attention today: players being bumped out of held poses.

At the base game level, a held pose no longer ends just because another player lightly pushes into a seated body. On top of that, Light RP now helps certain seated and held scenes recover if a shove interrupts the pose. In some cases, the player can be placed back into the scene automatically.

There is also a more direct fix: many held poses now become non-solid to other players while active. That means seated scenes, chairs, emotes, and card tables should be much less vulnerable to accidental body-checks. For a Cyberpunk 2077 co-op and roleplay environment, that is a small-sounding change with a big effect on immersion.

## More reliable interfaces for slow-loading clients

Several important interfaces were hardened today. Ripperdoc got a long list of recovery improvements so blank pages, silent openings, and broken payload handling should happen much less often. Slow-loading clients now get more chances to recreate missing pages instead of simply failing out.

Character creation also received safety work. The arrival scene is now much more likely to appear correctly, with deadlines and fallbacks at each stage so players are less likely to end up staring at a bad camera or a black scene.

These are not flashy screenshots, but they are exactly the kind of fixes that make Cyberpunk 2077 online feel more dependable from session to session.

## Economy, weapon feel, and staff tools

Light RP also adjusted its economy toward a more demanding pace, closing some exploits, reducing easy money routes, and pushing prices upward. That will be most relevant to RP-focused communities that want progression to feel earned rather than inflated.

Combat handling improved too. Weapon wheel behavior is now faster and more reliable, with snappier draw and holster behavior and smoother switching.

Finally, staff tools were consolidated into a unified admin menu, with faster actions, event controls, moderation options, and weapon or ammo management. That is mostly a server operations win, but it should also translate into smoother event nights and quicker staff response for players.

## Why this day matters

This update was a strong example of OPEN//77 growing on two fronts at once: deeper systems and better day-to-day stability. The TCG additions make the world feel more alive and more social, while the pose, UI, and creator fixes remove friction that players hit constantly in a multiplayer environment.

For anyone following OPEN//77 as a Cyberpunk 2077 multiplayer project, today was less about one headline feature and more about the platform becoming richer, smoother, and more believable as a place to spend time.

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
